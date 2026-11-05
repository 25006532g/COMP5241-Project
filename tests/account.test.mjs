import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { collectRows } from "../src/lib/learning.ts";

const { NextResponse } = createRequire(import.meta.url)("next/server");
const routeSource = await readFile(new URL("../src/app/api/account/export/route.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const user = {
  id: "synthetic-owner", email: "owner@example.test", created_at: "2026-10-09T00:00:00.000Z",
  user_metadata: { display_name: "Synthetic owner" }, app_metadata: { private: "not-exported" },
};
const tables = [
  ["profiles", "id", "id"], ["enrollments", "user_id", "id"],
  ["lesson_progress", "user_id", "id"], ["quiz_results", "user_id", "id"],
  ["bookmarks", "user_id", "id"], ["achievements", "user_id", "id"],
  ["forge_lessons", "owner_id", "id"], ["forge_enrollments", "user_id", "lesson_id"],
  ["forge_attempts", "user_id", "id"], ["forge_bookmarks", "user_id", "lesson_id"],
  ["forge_resume", "user_id", "lesson_id"], ["forge_requests", "user_id", "day"],
  ["forge_reviewers", "user_id", "lesson_id"],
  ["forge_interviews", "owner_id", "id"],
  ["forge_lesson_generations", "owner_id", "id"],
  ["forge_reflections", "owner_id", "id"],
  ["forge_presentation_drafts","owner_id","id"],["forge_presentation_assets","owner_id","id"],
];

function ownerRows(table, count = 1, owner = user.id) {
  const [, ownerColumn, orderColumn] = tables.find(([name]) => name === table);
  return Array.from({ length: count }, (_, index) => ({
    [orderColumn]: `${table}-${String(index).padStart(5, "0")}`,
    [ownerColumn]: owner,
    payload: `${owner}-private-row-${index}`,
  }));
}

function loadExport(overrides = {}) {
  const calls = [];
  const queries = [];
  const rows = overrides.rows ?? Object.fromEntries(tables.map(([table]) => [table, ownerRows(table)]));
  const dependencies = {
    "next/server": { NextResponse },
    "@/lib/learning": { collectRows },
    "@/lib/supabase/server": { async createClient() {
      calls.push("createClient");
      if (overrides.createClientFailure) throw new Error("Private auth configuration detail");
      return { auth: { async getUser() {
        calls.push("getUser");
        return overrides.getUser ? overrides.getUser() : { data: { user }, error: null };
      } } };
    } },
    "@/lib/learning-server": { database() {
      calls.push("database");
      if (overrides.databaseFailure) throw new Error("Private service configuration detail");
      return { from(table) {
        calls.push(`from:${table}`);
        const query = { table, filters: [] };
        return {
          select(columns) { query.select = columns; return this; },
          eq(column, value) { query.filters.push([column, value]); return this; },
          order(column, options) { query.order = column; query.options = options; return this; },
          async range(start, end) {
            Object.assign(query, { start, end });
            queries.push(query);
            if (overrides.readPage) return overrides.readPage(query, rows);
            const filtered = rows[table].filter(row => query.filters.every(([column, value]) => row[column] === value));
            filtered.sort((left, right) => String(left[query.order]).localeCompare(String(right[query.order])));
            return { data: filtered.slice(start, end + 1), error: null };
          },
        };
      } };
    } },
  };
  const exports = {};
  runInNewContext(outputText, {
    exports, process: { env: {} },
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return { GET: exports.GET, calls, queries };
}

async function assertFailure(response, status) {
  assert.ok(response instanceof NextResponse);
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-disposition"), null);
  assert.match(response.headers.get("content-type"), /^application\/json\b/);
  assert.deepEqual(await response.json(), {
    error: status === 401 ? "Not authenticated" : "Data export requires a configured account.",
  });
}

test("export GET returns every table and >1000 rows in stable owner-scoped pages", async () => {
  const expected = Object.fromEntries(tables.map(([table]) => [table, ownerRows(table, table === "profiles" ? 1 : 1050)]));
  const rows = Object.fromEntries(tables.map(([table]) => [table, [
    ...expected[table], ...ownerRows(table, 7, "synthetic-other-owner"),
  ].reverse()]));
  const fixture = loadExport({ rows });
  const before = Date.now();
  const response = await fixture.GET();
  assert.ok(response instanceof NextResponse);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("content-disposition"), "attachment; filename=forge-learning-data.json");
  assert.match(response.headers.get("content-type"), /^application\/json\b/);
  const body = await response.json();
  assert.deepEqual(Object.keys(body).sort(), ["account", "exportedAt","presentationAssets", "records"]);
  assert.match(body.presentationAssets,/binaries are excluded/);
  assert.ok(Date.parse(body.exportedAt) >= before && Date.parse(body.exportedAt) <= Date.now());
  assert.deepEqual(body.account, { email: user.email, createdAt: user.created_at, metadata: user.user_metadata });
  assert.deepEqual(body.records, expected);
  assert.deepEqual(fixture.calls.slice(0, 3), ["createClient", "getUser", "database"]);
  assert.deepEqual(fixture.queries, tables.flatMap(([table, ownerColumn, orderColumn]) =>
    (table === "profiles" ? [0] : [0, 500, 1000]).map(start => ({
      table, select: "*", filters: [[ownerColumn, user.id]], order: orderColumn,
      options: undefined, start, end: start + 499,
    }))));
});

test("export GET handles empty tables and an exact-page boundary without truncation", async () => {
  for (const count of [0, 1000]) {
    const rows = Object.fromEntries(tables.map(([table]) => [table, ownerRows(table, ["forge_resume", "forge_interviews", "forge_lesson_generations", "forge_reflections"].includes(table) ? count : 0)]));
    const fixture = loadExport({ rows });
    const response = await fixture.GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual((await response.json()).records, rows);
    assert.deepEqual(fixture.queries.filter(query => query.table === "forge_resume").map(query => query.start), count ? [0, 500, 1000] : [0]);
    assert.deepEqual(fixture.queries.filter(query => query.table === "forge_interviews").map(query => query.start), count ? [0, 500, 1000] : [0]);
    assert.deepEqual(fixture.queries.filter(query => query.table === "forge_lesson_generations").map(query => query.start), count ? [0, 500, 1000] : [0]);
    assert.deepEqual(fixture.queries.filter(query => query.table === "forge_reflections").map(query => query.start), count ? [0, 500, 1000] : [0]);
  }
});

test("profiles.* export includes only the owner's onboarding and latest diagnostic fields", async () => {
  const fields = {
    onboarding_completed_at: "2026-10-15T00:00:00.000Z",
    onboarding_background: { version: 1, role: "learner", experience: "coursework", goals: ["sdlc"] },
    diagnostic_summary: { rubric_version: "draft-2026-10-v1", role: "learner", score: 4, total: 6, suggested_level: "intermediate", completed_at: "2026-10-15T00:00:00.000Z" },
    learning_setup_revision: 2,
  };
  const rows = Object.fromEntries(tables.map(([table]) => [table, ownerRows(table)]));
  rows.profiles = [{ ...ownerRows("profiles")[0], ...fields }, { ...ownerRows("profiles", 1, "other-owner")[0], ...fields, diagnostic_summary: { private: "must-not-export" } }];
  const fixture = loadExport({ rows });
  const response = await fixture.GET();
  assert.equal(response.status, 200);
  const exported = (await response.json()).records.profiles;
  assert.deepEqual(exported, [rows.profiles[0]]);
  assert.equal(JSON.stringify(exported).includes("must-not-export"), false);
  assert.deepEqual(fixture.queries.find(query => query.table === "profiles").filters, [["id", user.id]]);
});

test("enrollment export includes explicit multi-version review evidence without adding legacy evidence or leaking another owner", async () => {
  const rows = Object.fromEntries(tables.map(([table]) => [table, ownerRows(table)]));
  const progress_evidence = {
    1: { reviewed_at: "2026-10-21T00:00:00Z" },
    2: { attended_at: "2026-10-21T01:00:00Z" },
  };
  rows.forge_enrollments = [
    { lesson_id: "explicit", user_id: user.id, progress_evidence },
    { lesson_id: "legacy", user_id: user.id, attended_at: "2026-09-01T00:00:00Z", progress_evidence: {} },
    { lesson_id: "foreign", user_id: "synthetic-other-owner", progress_evidence: { 1: { reviewed_at: "PRIVATE" } } },
  ];
  const response = await loadExport({ rows }).GET();
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).records.forge_enrollments, rows.forge_enrollments.slice(0, 2));
});

const pageFailures = [
  ["returned error", () => ({ data: null, error: { message: "Private database detail" } })],
  ["data with error", () => ({ data: [{ private: "partial-row" }], error: new Error("Private database detail") })],
  ["thrown error", () => { throw new Error("Private thrown database detail"); }],
  ["null result", () => null],
  ["undefined result", () => undefined],
  ["missing data", () => ({ error: null })],
  ["null data", () => ({ data: null, error: null })],
  ["object data", () => ({ data: { length: 0 }, error: null })],
  ["string data", () => ({ data: "Private malformed page", error: null })],
  ["missing error field", () => ({ data: [] })],
];

for (const [label, fail] of pageFailures) {
  test(`export GET ${label} on later pages never leaks partial data or errors`, async () => {
    for (const failedTable of ["forge_attempts", "forge_resume", "forge_interviews", "forge_lesson_generations", "forge_reflections"]) {
      for (const failedStart of [500, 1000]) {
        const rows = Object.fromEntries(tables.map(([table]) => [table, ownerRows(table, table === failedTable ? 1050 : 1)]));
        const fixture = loadExport({ rows, readPage(query, records) {
          if (query.table === failedTable && query.start === failedStart) return fail();
          return { data: records[query.table].slice(query.start, query.end + 1), error: null };
        } });
        await assertFailure(await fixture.GET(), 503);
        assert.deepEqual(fixture.queries.filter(query => query.table === failedTable).map(query => query.start), failedStart === 500 ? [0, 500] : [0, 500, 1000]);
        assert.equal(fixture.queries.at(-1).table, failedTable);
      }
    }
  });
}

const authFailures = [
  ["absent user", () => ({ data: { user: null }, error: null }), 401],
  ["returned auth error", () => ({ data: { user: null }, error: new Error("Private auth detail") }), 401],
  ["returned auth error with a user", () => ({ data: { user }, error: new Error("Private auth detail") }), 401],
  ["thrown auth error", () => { throw new Error("Private auth detail"); }, 503],
  ["null auth result", () => null, 503],
  ["missing auth data", () => ({ error: new Error("Private auth detail") }), 503],
];

test("missing interview migration fails the entire export rather than omitting private transcripts", async () => {
  const fixture = loadExport({ readPage(query, records) {
    if (query.table === "forge_interviews") return { data: null, error: { message: "relation does not exist" } };
    return { data: records[query.table].slice(query.start, query.end + 1), error: null };
  } });
  await assertFailure(await fixture.GET(), 503);
  assert.equal(fixture.queries.at(-1).table, "forge_interviews");
});

test("missing generation migration fails the entire export rather than omitting retained reference/answer keys", async () => {
  const fixture = loadExport({ readPage(query, records) {
    if (query.table === "forge_lesson_generations") return { data: null, error: { message: "PRIVATE relation does not exist" } };
    return { data: records[query.table].slice(query.start, query.end + 1), error: null };
  } });
  await assertFailure(await fixture.GET(), 503);
  assert.equal(fixture.queries.at(-1).table, "forge_lesson_generations");
});

test("missing reflection migration fails the entire private export rather than silently omitting daily text", async () => {
  const fixture = loadExport({ readPage(query, records) {
    if (query.table === "forge_reflections") return { data: null, error: { message: "PRIVATE relation does not exist" } };
    return { data: records[query.table].slice(query.start, query.end + 1), error: null };
  } });
  await assertFailure(await fixture.GET(), 503);
  assert.equal(fixture.queries.at(-1).table, "forge_reflections");
});

for (const [label, getUser, status] of authFailures) {
  test(`export GET ${label} never creates a privileged client`, async () => {
    const fixture = loadExport({ getUser });
    await assertFailure(await fixture.GET(), status);
    assert.deepEqual(fixture.calls, ["createClient", "getUser"]);
    assert.deepEqual(fixture.queries, []);
  });
}

test("export GET auth configuration failure never accesses auth or database", async () => {
  const fixture = loadExport({ createClientFailure: true });
  await assertFailure(await fixture.GET(), 503);
  assert.deepEqual(fixture.calls, ["createClient"]);
  assert.deepEqual(fixture.queries, []);
});

test("export GET privileged database configuration failure is a private generic error", async () => {
  const fixture = loadExport({ databaseFailure: true });
  await assertFailure(await fixture.GET(), 503);
  assert.deepEqual(fixture.calls, ["createClient", "getUser", "database"]);
  assert.deepEqual(fixture.queries, []);
});

async function loadAccountModule(path, dependencies, env = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports, process: { env },
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const deletionMessages = {
  auth: "Could not verify your account. Please try again later.",
  password: "Could not verify your password. Please try again later.",
  identity: "Could not verify the same account. Log in again before requesting deletion.",
  uncertain: "Could not confirm account deletion. Check whether you can still log in before retrying, or contact support.",
  cleanup: "Your account was deleted, but we could not confirm browser-session cleanup. Clear site cookies before using this device again.",
  success: "Your account and learning data were deleted.",
};
const deletionStages = ["createClient", "getUser", "signInWithPassword", "adminClient", "deleteUser", "signOut"];

async function loadDeletion(overrides = {}) {
  const calls = [];
  const assetCleanups=[];
  const writes = [];
  const chunks = [0, 1, 2].map(index => ({ name: `synthetic-session.${index}`, value: "", options: { maxAge: 0, httpOnly: true } }));
  function authClient(cookies) {
    return { auth: Object.fromEntries(["getUser", "signInWithPassword", "signOut"].map(method => [method, async value => {
      calls.push([method, value === undefined ? null : JSON.parse(JSON.stringify(value))]);
      if (cookies && overrides.cookieStage === method) cookies.setAll(chunks);
      if (overrides[method]) return overrides[method](value);
      return method === "signOut" ? { error: null } : { data: { user: { ...user } }, error: null };
    }])) };
  }
  const adapter = overrides.cookieStage ? await loadAccountModule("../src/lib/supabase/server.ts", {
    "next/headers": { cookies: async () => ({
      getAll: () => chunks.map(cookie => ({ ...cookie, value: "synthetic-existing-value" })),
      set(...args) {
        writes.push(args);
        if (writes.length === overrides.failCookieAt) throw new Error("Private cookie detail");
      },
    }) },
    "../public-config": { publicConfig: () => ({ supabaseUrl: "https://example.test", anonKey: "synthetic-public-key" }) },
    "@supabase/ssr": { createServerClient: (_url, _key, options) => authClient(options.cookies) },
  }) : null;
  const actions = await loadAccountModule("../src/app/profile/actions.ts", {
    "next/navigation": { redirect(location) { throw Object.assign(new Error("Synthetic redirect"), { location }); } },
    zod: { z }, sharp: {}, "next/cache": {}, "@/lib/public-config": {}, "@/lib/eligibility": {},
    "@/lib/presentation-assets-server":{async cleanupPresentationAssets(id,all){
      assert.equal(calls.at(-1)[0],"adminClient");assert.equal(id,user.id);assert.equal(all,true);
      assetCleanups.push(id);if(overrides.assetCleanupFailure)throw new Error("PRIVATE cleanup failure");
    }},
    "@/lib/supabase/server": { async createClient(options) {
      calls.push(["createClient", JSON.parse(JSON.stringify(options ?? {}))]);
      if (overrides.createClientFailure) throw new Error("Private auth configuration detail");
      return adapter ? adapter.createClient(options) : authClient();
    } },
    "@supabase/supabase-js": { createClient(url, key, options) {
      calls.push(["adminClient", { url, key, options: JSON.parse(JSON.stringify(options)) }]);
      if (overrides.adminFailure) throw new Error("Private admin constructor detail");
      return { auth: { admin: { async deleteUser(id) {
        calls.push(["deleteUser", id]);
        return overrides.deleteUser ? overrides.deleteUser(id) : { data: { user }, error: null };
      } } } };
    } },
  }, overrides.env ?? { NEXT_PUBLIC_SUPABASE_URL: "https://example.test", SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key" });
  return { deleteAccount: actions.deleteAccount, calls, writes, chunks,assetCleanups };
}

function deletionForm() {
  const form = new FormData();
  form.set("confirm", "on");
  form.set("password", "Synthetic1");
  return form;
}

async function deletionRedirect(fixture, pathname, message, form = deletionForm(), parameter = "error") {
  await assert.rejects(() => fixture.deleteAccount(form), error => {
    assert.equal(error.message, "Synthetic redirect");
    const location = new URL(error.location, "https://example.test");
    assert.equal(location.pathname, pathname);
    assert.equal(location.searchParams.get(parameter), message);
    assert.equal(location.searchParams.size, message === null ? 0 : 1);
    assert.doesNotMatch(location.href, /Private|Synthetic1|synthetic-owner|example\.test.*example\.test|synthetic-service-key/);
    return true;
  });
}

function assertDeletionStages(fixture, count) {
  assert.deepEqual(fixture.calls.map(([method]) => method), deletionStages.slice(0, count));
  if (count) assert.deepEqual(fixture.calls[0], ["createClient", { requireCookieWrites: true }]);
}
test("deletion stops before auth deletion when private presentation blob cleanup is unconfirmed",async()=>{
  const fixture=await loadDeletion({assetCleanupFailure:true});
  await deletionRedirect(fixture,"/profile/delete",deletionMessages.uncertain);
  assertDeletionStages(fixture,4);assert.deepEqual(fixture.assetCleanups,[user.id]);
});

for (const failCookieAt of [1, 2]) {
  test(`deletion actual adapter cleanup chunk ${failCookieAt} failure acknowledges one confirmed delete`, async () => {
    const fixture = await loadDeletion({ cookieStage: "signOut", failCookieAt });
    await deletionRedirect(fixture, "/login", deletionMessages.cleanup);
    assertDeletionStages(fixture, 6);
    assert.deepEqual(fixture.calls.slice(-2), [["deleteUser", user.id], ["signOut", { scope: "local" }]]);
    assert.deepEqual(fixture.writes, fixture.chunks.slice(0, failCookieAt).map(({ name, value, options }) => [name, value, options]));
  });
}

test("deletion validates confirmation and password without auth or privileged access", async () => {
  for (const [field, value, message] of [
    ["confirm", null, "Confirm that you understand this action."],
    ["confirm", "true", "Confirm that you understand this action."],
    ["password", null, "Enter your current password."],
    ["password", "", "Enter your current password."],
    ["password", new Blob(["synthetic"]), "Enter your current password."],
  ]) {
    const form = deletionForm();
    if (value === null) form.delete(field);
    else form.set(field, value);
    const fixture = await loadDeletion();
    await deletionRedirect(fixture, "/profile/delete", message, form);
    assertDeletionStages(fixture, 0);
  }
});

test("deletion client creation failure is sanitized before any auth calls", async () => {
  const fixture = await loadDeletion({ createClientFailure: true });
  await deletionRedirect(fixture, "/profile/delete", deletionMessages.auth);
  assertDeletionStages(fixture, 1);
});

test("deletion absent or returned expired identity requires login before reauthentication", async () => {
  const errors = [
    null, { status: 401 }, { name: "AuthSessionMissingError", status: 400 },
    ...["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "user_not_found", "bad_jwt"].map(code => ({ code, status: 400 })),
  ];
  for (const error of errors) {
    for (const account of error ? [null, user] : [null, { ...user, id: "" }]) {
      const fixture = await loadDeletion({ getUser: () => ({ data: { user: account }, error }) });
      await deletionRedirect(fixture, "/login", null);
      assertDeletionStages(fixture, 2);
    }
  }
});

test("deletion returned and thrown operational auth failures offer retry without privileged access", async () => {
  const failures = [
    ...[429, 500, 503].flatMap(status => [null, user].map(account => () => ({ data: { user: account }, error: { status, code: "session_not_found", message: "Private provider detail" } }))),
    () => ({ data: { user }, error: new Error("Private provider detail") }),
    () => { throw new Error("Private auth detail"); },
    () => null, () => ({ error: null }), () => ({ data: { user } }),
  ];
  for (const getUser of failures) {
    const fixture = await loadDeletion({ getUser });
    await deletionRedirect(fixture, "/profile/delete", deletionMessages.auth);
    assertDeletionStages(fixture, 2);
  }
});

test("deletion missing authenticated email is not misclassified as a password failure", async () => {
  const fixture = await loadDeletion({ getUser: () => ({ data: { user: { ...user, email: undefined } }, error: null }) });
  await deletionRedirect(fixture, "/profile/delete", "Could not verify this account for password-confirmed deletion. Contact support.");
  assertDeletionStages(fixture, 2);
});

test("deletion invalid credentials alone receive the incorrect-password notice", async () => {
  const fixture = await loadDeletion({ signInWithPassword: () => ({ data: { user }, error: { code: "invalid_credentials", status: 400, message: "Private detail" } }) });
  await deletionRedirect(fixture, "/profile/delete", "The password could not be verified.");
  assertDeletionStages(fixture, 3);
});

test("deletion throttled, unavailable, thrown and malformed reauthentication remain retryable", async () => {
  const failures = [
    ...[429, 500, 503].map(status => () => ({ data: { user }, error: { status, code: "invalid_credentials", message: "Private detail" } })),
    () => ({ data: { user: null }, error: new Error("Private detail") }),
    () => { throw new Error("Private reauthentication detail"); },
    () => null, () => ({ error: null }), () => ({ data: { user } }),
  ];
  for (const signInWithPassword of failures) {
    const fixture = await loadDeletion({ signInWithPassword });
    await deletionRedirect(fixture, "/profile/delete", deletionMessages.password);
    assertDeletionStages(fixture, 3);
  }
});

test("deletion requires a non-null reverified ID equal to the original authenticated ID", async () => {
  for (const verifiedUser of [null, {}, { ...user, id: "" }, { ...user, id: "synthetic-other-owner" }]) {
    const fixture = await loadDeletion({ signInWithPassword: () => ({ data: { user: verifiedUser }, error: null }) });
    await deletionRedirect(fixture, "/login", deletionMessages.identity);
    assertDeletionStages(fixture, 3);
  }
});

test("deletion forged form identities cannot change reauthentication email or delete target", async () => {
  const form = deletionForm();
  for (const field of ["id", "userId", "user_id", "email"]) form.set(field, "synthetic-other-owner@example.test");
  const fixture = await loadDeletion();
  await deletionRedirect(fixture, "/login", deletionMessages.success, form, "success");
  assertDeletionStages(fixture, 6);
  assert.deepEqual(fixture.calls[2], ["signInWithPassword", { email: user.email, password: "Synthetic1" }]);
  assert.deepEqual(fixture.calls[4], ["deleteUser", user.id]);
});

test("deletion missing service settings and constructor failures do not attempt deletion", async () => {
  for (const env of [{}, { NEXT_PUBLIC_SUPABASE_URL: "https://example.test" }, { SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-key" }]) {
    const fixture = await loadDeletion({ env });
    await deletionRedirect(fixture, "/profile/delete", "Account deletion is not configured yet.");
    assertDeletionStages(fixture, 3);
  }
  const fixture = await loadDeletion({ adminFailure: true });
  await deletionRedirect(fixture, "/profile/delete", "Account deletion is temporarily unavailable. Please try again later.");
  assertDeletionStages(fixture, 4);
});

for (const failure of ["returned", "thrown"]) {
  const fail = () => {
    const error = new Error("Private provider detail");
    if (failure === "thrown") throw error;
    return { error };
  };
  test(`deletion ${failure} delete failure is uncertain with no signout or automatic retry`, async () => {
    const fixture = await loadDeletion({ deleteUser: fail });
    await deletionRedirect(fixture, "/profile/delete", deletionMessages.uncertain);
    assertDeletionStages(fixture, 5);
    assert.deepEqual(fixture.calls.at(-1), ["deleteUser", user.id]);
  });
  test(`deletion ${failure} signout failure acknowledges deletion without repeating it`, async () => {
    const fixture = await loadDeletion({ signOut: fail });
    await deletionRedirect(fixture, "/login", deletionMessages.cleanup);
    assertDeletionStages(fixture, 6);
    assert.deepEqual(fixture.calls.at(-1), ["signOut", { scope: "local" }]);
  });
}

test("deletion actual adapter reauthentication cookie failures stop before admin creation", async () => {
  for (const failCookieAt of [1, 2]) {
    const fixture = await loadDeletion({ cookieStage: "signInWithPassword", failCookieAt });
    await deletionRedirect(fixture, "/profile/delete", deletionMessages.password);
    assertDeletionStages(fixture, 3);
    assert.equal(fixture.writes.length, failCookieAt);
  }
});

test("deletion happy path verifies the same account, deletes once and clears local cookie chunks", async () => {
  const fixture = await loadDeletion({ cookieStage: "signOut" });
  await deletionRedirect(fixture, "/login", deletionMessages.success, deletionForm(), "success");
  assert.deepEqual(fixture.calls, [
    ["createClient", { requireCookieWrites: true }], ["getUser", null],
    ["signInWithPassword", { email: user.email, password: "Synthetic1" }],
    ["adminClient", { url: "https://example.test", key: "synthetic-service-key", options: { auth: { autoRefreshToken: false, persistSession: false } } }],
    ["deleteUser", user.id], ["signOut", { scope: "local" }],
  ]);
  assert.deepEqual(fixture.writes, fixture.chunks.map(({ name, value, options }) => [name, value, options]));
});

async function loadDeletionPage(overrides = {}) {
  const require = createRequire(import.meta.url);
  const calls = [];
  const components = {
    "react/jsx-runtime": require("react/jsx-runtime"),
    "react-dom": require("react-dom"),
    "lucide-react": require("lucide-react"),
  };
  const submit = await loadAccountModule("../src/components/submit-button.tsx", components);
  const page = await loadAccountModule("../src/app/profile/delete/page.tsx", {
    ...components,
    "next/link": { default: ({ children, ...props }) => createElement("a", props, children) },
    "@/components/learner-shell": { LearnerShell: ({ children, name, admin, instructor }) =>
      createElement("main", { "data-name": name, "data-admin": admin, "data-instructor": instructor }, children) },
    "@/components/submit-button": submit,
    "../actions": { deleteAccount() { throw new Error("Rendering must not invoke deletion"); } },
    "@/lib/learning-server": {
      async requireUser() {
        calls.push("requireUser");
        if (overrides.authFailure) throw overrides.authFailure;
        return user;
      },
      async displayName(account) {
        calls.push("displayName");
        assert.equal(account, user);
        if (overrides.nameFailure) throw overrides.nameFailure;
        return "Synthetic owner";
      },
      isAdmin(account) { calls.push("isAdmin"); assert.equal(account, user); return false; },
      isInstructor(account) { calls.push("isInstructor"); assert.equal(account, user); return true; },
    },
  });
  return { Page: page.default, calls };
}

test("deletion page optional displayName failures preserve the real form and escaped notice", async () => {
  for (const detail of ["Private missing service configuration", "Private profile query failure"]) {
    const fixture = await loadDeletionPage({ nameFailure: new Error(detail) });
    const element = await fixture.Page({ searchParams: Promise.resolve({ error: `${deletionMessages.uncertain} <script>not markup</script>` }) });
    assert.equal(element.props.name, "Learner");
    assert.equal(element.props.admin, false);
    assert.equal(element.props.instructor, true);
    const html = renderToStaticMarkup(element);
    assert.match(html, /<h1>Delete your account\?<\/h1>/);
    assert.match(html, /role="alert"[^>]*>Could not confirm account deletion\./);
    assert.match(html, /&lt;script&gt;not markup&lt;\/script&gt;/);
    assert.match(html, /<form\b/);
    assert.match(html, /<input(?=[^>]*name="password")(?=[^>]*required="")[^>]*>/);
    assert.match(html, /<input(?=[^>]*name="confirm")(?=[^>]*required="")[^>]*>/);
    assert.match(html, /<button type="submit" class="delete-button">Delete account permanently<\/button>/);
    assert.doesNotMatch(html, /Private|<script>not markup/);
    assert.deepEqual(fixture.calls, ["requireUser", "displayName", "isAdmin", "isInstructor"]);
  }
});

test("deletion page successful optional lookup preserves the existing name and role flags", async () => {
  const fixture = await loadDeletionPage();
  const element = await fixture.Page({ searchParams: Promise.resolve({}) });
  assert.equal(element.props.name, "Synthetic owner");
  assert.equal(element.props.active, "/profile");
  assert.equal(element.props.admin, false);
  assert.equal(element.props.instructor, true);
  const html = renderToStaticMarkup(element);
  assert.match(html, /Delete account permanently/);
  assert.doesNotMatch(html, /role="alert"/);
});

test("deletion page mandatory authentication failures still block before optional lookup or rendering", async () => {
  for (const authFailure of [
    Object.assign(new Error("Synthetic redirect"), { location: "/login" }),
    new Error("Private authentication configuration failure"),
    new Error("Private authentication provider failure"),
  ]) {
    const fixture = await loadDeletionPage({ authFailure });
    await assert.rejects(() => fixture.Page({ searchParams: Promise.resolve({ error: deletionMessages.auth }) }), error => error === authFailure);
    assert.deepEqual(fixture.calls, ["requireUser"]);
  }
});