import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { z } from "zod";
import * as schemas from "../src/lib/reflections.ts";
import * as permissions from "../src/lib/permissions.ts";

const sources = {};
for (const path of ["lib/learning-server", "lib/reflections-server", "app/reflections/actions"]) {
  sources[`@/${path}`] = ts.transpileModule(await readFile(new URL(`../src/${path}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
sources["@/app/reflections/page"] = ts.transpileModule(await readFile(new URL("../src/app/reflections/page.tsx", import.meta.url), "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const copy = value => JSON.parse(JSON.stringify(value));
export const sample = (date = "2026-10-22") => ({ date, delegation: "I kept the decision.", description: "I described a bounded change.", discernment: "I checked the requirements.", diligence: "I tested an edge case." });
export async function reflectionHarness({ enabled = schemas.dailyReflectionsEnabled } = {}) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);`);
  await db.exec(await readFile(new URL("../supabase/migrations/20261022_daily_reflections_ran.sql", import.meta.url), "utf8"));
  const owner = randomUUID(), other = randomUUID();
  await db.query("insert into auth.users values($1),($2)", [owner, other]);
  const state = { user: { id: owner, app_metadata: {} }, authError: null, authThrows: false, failure: null, failOp: null };
  const calls = [];
  const client = {
    auth: { async getUser() {
      calls.push(["auth"]);
      if (state.authThrows) throw new Error("private auth detail");
      return { data: { user: state.user }, error: state.authError };
    } },
    from(table) {
      assert.equal(table, "forge_reflections");
      let op = "select", payload, columns = "*", filters = [], orders = [], limit, cursor;
      const query = {
        select(value) { columns = value; return this; },
        insert(value) { op = "insert"; payload = value; return this; },
        update(value) { op = "update"; payload = value; return this; },
        delete() { op = "delete"; return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        order(key, options) { orders.push(`${key} ${options?.ascending === false ? "desc" : "asc"}`); return this; },
        limit(value) { limit = value; return this; },
        or(value) { cursor = value; return this; },
        async run(single) {
          calls.push([op, copy(filters), payload && copy(payload), columns, cursor]);
          const failure = !state.failOp || state.failOp === op ? state.failure : null;
          if (failure === "throw") throw new Error("private transport detail");
          if (failure === "returned") return { data: null, error: { message: "private unavailable" } };
          const values = [], param = value => { values.push(value); return `$${values.length}`; };
          const where = filters.map(([key, value]) => `${key}=${param(value)}`);
          if (cursor) {
            const match = /^date.lt.(\d{4}-\d{2}-\d{2}),and\(date.eq.(\d{4}-\d{2}-\d{2}),id.lt.([0-9a-f-]+)\)$/.exec(cursor);
            assert.ok(match); assert.equal(match[1], match[2]);
            where.push(`(date,id) < (${param(match[1])}::date,${param(match[3])}::uuid)`);
          }
          let sql;
          if (op === "insert") {
            const entries = Object.entries(payload);
            sql = `insert into ${table}(${entries.map(([key]) => key).join(",")}) values(${entries.map(([, value]) => param(value)).join(",")}) returning ${columns}`;
          } else if (op === "update") {
            const assignments = Object.entries(payload).map(([key, value]) => `${key}=${param(value)}`);
            sql = `update ${table} set ${assignments.join(",")} where ${where.join(" and ")} returning ${columns}`;
          } else if (op === "delete") sql = `delete from ${table} where ${where.join(" and ")} returning ${columns}`;
          else sql = `select ${columns} from ${table} where ${where.join(" and ")}${orders.length ? ` order by ${orders.join(",")}` : ""}${limit ? ` limit ${limit}` : ""}`;
          let result;
          try { result = await db.query(sql, values); }
          catch (error) { return { data: null, error: { code: error.code } }; }
          if (failure === "lost") throw new Error("private lost acknowledgement after commit");
          if (failure === "malformed") return { data: { unexpected: "private" }, error: null };
          if (failure === "undefined") return { data: undefined, error: null };
          // PostgREST serializes PostgreSQL date as YYYY-MM-DD, unlike PGlite's Date parser.
          const rows = result.rows.map(row => ({ ...row, ...(row.date instanceof Date ? { date: row.date.toISOString().slice(0, 10) } : {}) }));
          if (failure === "malformedTail") rows[rows.length - 1] = { unexpected: true };
          if (failure === "oversizedPage") rows.push(rows[0]);
          if (failure === "foreign") rows[0].owner_id = other;
          return { data: copy(single ? rows[0] ?? null : rows), error: null };
        },
        maybeSingle() { return this.run(true); },
        then(resolve, reject) { return this.run(false).then(resolve, reject); },
      };
      return query;
    },
  };
  const mocks = {
    "server-only": {}, zod: { z }, "@/lib/reflections": { ...schemas, dailyReflectionsEnabled: enabled }, "@/lib/learning": {}, "@/lib/permissions": permissions,
    "react/jsx-runtime": createRequire(import.meta.url)("react/jsx-runtime"),
    "@/components/learner-shell": { LearnerShell: "synthetic-shell" },
    "@/components/daily-reflections": { DailyReflections: "synthetic-reflections" },
    "next/navigation": {
      redirect() { throw new Error("Unexpected redirect"); },
      notFound() { throw new Error("NEXT_HTTP_ERROR_FALLBACK;404"); },
    },
    "@/lib/supabase/server": { createClient: async () => client },
    "@supabase/supabase-js": { createClient() { calls.push(["service"]); return client; } },
  };
  const cache = {};
  function load(name) {
    if (name === "./actions") return load("@/app/reflections/actions");
    if (name in mocks) return mocks[name];
    if (!sources[name]) throw new Error(`Unexpected dependency ${name}`);
    if (!cache[name]) {
      const exports = {}; cache[name] = exports;
      runInNewContext(sources[name], { exports, require: load, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic" } }, fetch() { throw new Error("Network forbidden"); } });
    }
    return cache[name];
  }
  return { db, owner, other, state, calls, actions: load("@/app/reflections/actions"), page: load("@/app/reflections/page").default, close: () => db.close() };
}

// Shared offline boundary adapter is imported by the UI test without registering this file's tests twice.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  test("daily reflections are disabled for every role before auth or data access, preserving saved data", async t => {
    assert.equal(schemas.dailyReflectionsEnabled, false);
    const h = await reflectionHarness(); t.after(h.close);
    await h.db.query(`insert into forge_reflections(owner_id,date,delegation,description,discernment,diligence)
      values($1,'2026-10-22','saved delegation','saved description','saved discernment','saved diligence')`, [h.owner]);
    const saved = await h.db.query("select * from forge_reflections");
    const version = { id: saved.rows[0].id, date: "2026-10-22", revision: 1 };
    for (const role of [null, "learner", "instructor", "admin"]) {
      h.state.user = role ? { id: h.owner, app_metadata: { role } } : null;
      await assert.rejects(h.page(), /NEXT_HTTP_ERROR_FALLBACK;404/);
      for (const [action, input] of [
        ["listReflections", null], ["readReflection", { date: version.date }],
        ["createReflection", sample()], ["updateReflection", { ...sample(), ...version }],
        ["deleteReflection", version],
      ]) {
        assert.equal((await h.actions[action](input)).code, "unavailable", `${role}: ${action}`);
        assert.equal((await h.actions[action]({ forged: true })).code, "unavailable");
      }
      assert.deepEqual(h.calls, [], `${role}: no auth, service client or reflection query`);
    }
    assert.deepEqual(await h.db.query("select * from forge_reflections"), saved);
  });
  test("reflection dates: Gregorian leap days, no age cutoff and Hong Kong midnight", () => {
    for (const date of ["0001-01-01", "1900-02-28", "2000-02-29", "2024-02-29", "9999-12-31"]) assert.ok(schemas.reflectionDateSchema.safeParse(date).success, date);
    for (const date of ["0000-01-01", "1900-02-29", "2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "2026-10-22,owner_id.eq.x"]) assert.equal(schemas.reflectionDateSchema.safeParse(date).success, false, date);
    assert.equal(schemas.hongKongDate(new Date("2026-10-21T15:59:59.999Z")), "2026-10-21");
    assert.equal(schemas.hongKongDate(new Date("2026-10-21T16:00:00.000Z")), "2026-10-22");
  });
  test("reflection text validation counts Unicode characters and rejects blank, null, forged inputs", () => {
    for (const value of ["not used today", "😀".repeat(2000), "<script>alert('no')</script>", "中文\nplain text"]) assert.ok(schemas.reflectionCreateSchema.safeParse({ ...sample(), delegation: value }).success);
    for (const value of ["", " \t\n", "\u2003\uFEFF", "😀".repeat(2001), "a".repeat(2001), "a\0b"]) assert.equal(schemas.reflectionCreateSchema.safeParse({ ...sample(), delegation: value }).success, false);
    assert.equal(schemas.reflectionCreateSchema.safeParse({ ...sample(), owner_id: randomUUID() }).success, false);
    assert.equal(schemas.reflectionCursorSchema.safeParse({ date: "2026-10-22", id: "x),owner_id.eq.other" }).success, false);
  });
  test("actual reflection actions and currentUser reject unauthenticated/auth-error and forged-owner requests before service access", async t => {
    const h = await reflectionHarness({ enabled: true }); t.after(h.close);
    for (const state of [{ user: null }, { authError: { message: "private" } }, { authThrows: true }]) {
      Object.assign(h.state, { user: { id: h.owner, app_metadata: { role: "admin" } }, authError: null, authThrows: false }, state);
      h.calls.length = 0;
      for (const action of [
        () => h.actions.listReflections(), () => h.actions.readReflection({ date: "2026-10-22" }),
        () => h.actions.createReflection(sample()), () => h.actions.updateReflection({ ...sample(), id: randomUUID(), revision: 1 }),
        () => h.actions.deleteReflection({ date: "2026-10-22", id: randomUUID(), revision: 1 }),
      ]) assert.equal((await action()).code, "auth");
      assert.ok(!h.calls.some(([op]) => op === "service"));
    }
    Object.assign(h.state, { user: { id: h.owner }, authError: null, authThrows: false });
    h.calls.length = 0;
    assert.equal((await h.actions.createReflection({ ...sample(), owner_id: h.other })).code, "invalid");
    assert.equal((await h.actions.listReflections({ date: "2026-10-22", id: "forged" })).code, "invalid");
    assert.equal(h.calls.length, 0);
  });
  test("actual reflection page rejects auth-error-with-user visibly and loads defaults/history without any write", async t => {
    const h = await reflectionHarness({ enabled: true }); t.after(h.close);
    h.state.authError = { message: "private auth detail" };
    let output = await h.page();
    assert.equal(output.type, "main");
    assert.match(output.props.children[0].props.children, /confirmed sign-in/);
    assert.ok(!h.calls.some(([op]) => op === "service"));
    h.state.authError = null; h.calls.length = 0;
    output = await h.page();
    assert.equal(output.props.active, "/reflections");
    const props = output.props.children.props.children[1].props;
    assert.equal(props.owner, h.owner);
    assert.equal(props.date, schemas.hongKongDate());
    assert.equal(props.initial.code, "ok"); assert.equal(props.initial.row, null);
    assert.equal(props.history.code, "ok"); assert.equal(props.history.rows.length, 0);
    assert.ok(h.calls.filter(([op]) => !["auth", "service"].includes(op)).every(([op]) => op === "select"));
  });
  test("actual CRUD: daily uniqueness, owner/admin isolation, CAS update/delete and plain text roundtrip", async t => {
    const h = await reflectionHarness({ enabled: true }); t.after(h.close);
    const created = await h.actions.createReflection({ ...sample(), description: "<img src=x onerror=alert(1)>" });
    assert.equal(created.code, "ok"); const row = created.row;
    assert.equal(row.owner_id, h.owner); assert.equal(row.revision, 1);
    assert.equal((await h.actions.createReflection(sample())).code, "conflict");
    const version = { id: row.id, revision: row.revision, date: row.date };
    const changed = await h.actions.updateReflection({ ...sample(), ...version, diligence: "Changed" });
    assert.equal(changed.code, "ok"); assert.equal(changed.row.revision, 2);
    assert.equal((await h.actions.updateReflection({ ...sample(), ...version })).code, "conflict");
    assert.equal((await h.actions.deleteReflection(version)).code, "conflict");
    h.state.user = { id: h.other, app_metadata: { role: "admin", is_admin: true } };
    assert.equal((await h.actions.readReflection({ date: row.date })).row, null);
    assert.equal((await h.actions.listReflections()).rows.length, 0);
    assert.equal((await h.actions.updateReflection({ ...sample(), ...version })).code, "missing");
    assert.equal((await h.actions.deleteReflection({ ...version, revision: 2 })).code, "missing");
    h.state.user = { id: h.owner };
    assert.equal((await h.actions.readReflection({ date: row.date })).row.diligence, "Changed");
    assert.equal((await h.actions.deleteReflection({ ...version, revision: 2 })).code, "deleted");
    assert.equal((await h.actions.readReflection({ date: row.date })).row, null);
    assert.equal((await h.actions.createReflection(sample())).code, "ok");
    for (const [op, filters] of h.calls.filter(([op]) => ["select", "update", "delete"].includes(op))) {
      assert.ok(filters.some(([key]) => key === "owner_id"), op);
      if (op !== "select") assert.deepEqual(filters.map(([key]) => key), ["owner_id", "id", "date", "revision"]);
    }
  });
  test("history returns bounded stable metadata pages, no text or foreign records, rejects failures distinctly", async t => {
    const h = await reflectionHarness({ enabled: true }); t.after(h.close);
    await h.db.query(`insert into forge_reflections(owner_id,date,delegation,description,discernment,diligence)
      select $1, date '2026-01-01'+g, 'private','private','private','private' from generate_series(0,44) g`, [h.owner]);
    await h.db.query(`insert into forge_reflections(owner_id,date,delegation,description,discernment,diligence) values($1,'2026-10-22','foreign','foreign','foreign','foreign')`, [h.other]);
    let cursor = null, rows = [], sizes = [];
    do {
      const result = await h.actions.listReflections(cursor);
      assert.equal(result.code, "ok"); sizes.push(result.rows.length); rows.push(...result.rows); cursor = result.cursor;
      assert.ok(result.rows.every(row => Object.keys(row).sort().join(",") === "created_at,date,id,revision,updated_at"));
    } while (cursor);
    assert.deepEqual(sizes, [20, 20, 5]); assert.equal(new Set(rows.map(row => row.id)).size, 45);
    assert.deepEqual(rows.map(row => row.date), [...rows.map(row => row.date)].sort().reverse());
    for (const failure of ["returned", "throw", "malformed", "undefined", "malformedTail", "oversizedPage"]) {
      h.state.failure = failure;
      assert.equal((await h.actions.listReflections()).code, "unavailable");
      if (failure !== "oversizedPage") assert.equal((await h.actions.readReflection({ date: rows[0].date })).code, "unavailable");
    }
    h.state.failure = null;
    await h.db.exec("drop table forge_reflections");
    assert.equal((await h.actions.listReflections()).code, "unavailable");
  });
  test("actual writes never report success on returned/thrown/malformed/lost acknowledgements", async t => {
    const h = await reflectionHarness({ enabled: true }); t.after(h.close);
    for (const [index, failure] of ["returned", "throw", "malformed", "undefined", "lost", "foreign"].entries()) {
      h.state.failure = failure; h.state.failOp = "insert";
      const date = `2026-10-${String(index + 1).padStart(2, "0")}`;
      assert.equal((await h.actions.createReflection(sample(date))).code, "unconfirmed");
      h.state.failure = null;
      const read = await h.actions.readReflection({ date });
      assert.equal(read.code, "ok");
      assert.equal(!!read.row, ["malformed", "undefined", "lost", "foreign"].includes(failure));
    }
    let row = (await h.actions.createReflection(sample())).row;
    for (const failure of ["returned", "throw", "malformed", "undefined", "lost"]) {
      h.state.failure = failure; h.state.failOp = "update";
      assert.equal((await h.actions.updateReflection({ ...sample(), id: row.id, revision: row.revision })).code, "unconfirmed");
      h.state.failure = null; row = (await h.actions.readReflection({ date: row.date })).row;
    }
    for (const [index, failure] of ["returned", "throw", "malformed", "undefined", "lost"].entries()) {
      h.state.failure = null;
      const entry = (await h.actions.createReflection(sample(`2025-11-0${index + 1}`))).row;
      h.state.failure = failure; h.state.failOp = "delete";
      assert.equal((await h.actions.deleteReflection({ id: entry.id, date: entry.date, revision: 1 })).code, "unconfirmed");
    }
  });
}
