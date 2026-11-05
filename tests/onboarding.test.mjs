import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const sourcePaths = {
  "@/lib/learning": "src/lib/learning.ts",
  "./presentation.ts":"src/lib/presentation.ts",
  "@/lib/diagnostic": "src/lib/diagnostic.ts", "@/lib/onboarding": "src/lib/onboarding.ts",
  "@/lib/onboarding-server": "src/lib/onboarding-server.ts",
  onboarding: "src/app/onboarding/actions.ts", diagnostic: "src/app/diagnostic/actions.ts",
  dashboard: "src/app/dashboard/page.tsx", middleware: "src/lib/supabase/middleware.ts",
};
const sources = Object.fromEntries(Object.entries(sourcePaths).map(([name, path]) => [name, ts.transpileModule(
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
).outputText]));
const copy = value => JSON.parse(JSON.stringify(value));
const emptyProfile = () => ({ id: "owner", learning_level: "foundation", learning_setup_revision: 0, onboarding_completed_at: null, onboarding_background: null, diagnostic_summary: null });

function fixture(options = {}) {
  let row = options.row === null ? null : copy(options.row ?? emptyProfile());
  const user = { id: "owner", app_metadata: { role: options.role ?? "learner" }, user_metadata: { role: "instructor" } };
  const calls = [], modules = {};
  const stubs = {
    "server-only": {}, zod: require("zod"), "react/jsx-runtime": require("react/jsx-runtime"),
    "next/link": { __esModule: true, default: "a" },
    "lucide-react": { BookOpen: () => null, Plus: () => null },
    "@/components/learner-shell": { LearnerShell: ({ children }) => children },
    "next/navigation": { redirect(path) { throw new Error(`REDIRECT:${path}`); } },
    "@/lib/supabase/server": { async createClient() {
      if (options.createThrows) throw new Error("private config");
      return { auth: { async getUser() {
        calls.push("auth");
        if (options.authThrows) throw new Error("private auth");
        return options.auth ?? { data: { user }, error: null };
      } } };
    } },
    "@/lib/learning-server": {
      isInstructor: user => user.app_metadata.role === "instructor", isAdmin: () => false,
      displayName: async () => "Synthetic", visibleLessons: async () => options.lessons ?? [],
      userRecords: async () => options.records ?? { attempts: [], enrollments: [] },
      database() {
        if (options.databaseThrows) throw new Error("private database");
        return { from(table) {
          const filters = []; let patch;
          return {
            select() { return this; }, eq(...filter) { filters.push(filter); return this; },
            update(value) { patch = copy(value); return this; },
            async maybeSingle() {
              calls.push({ table, filters: copy(filters), patch });
              if (!patch) {
                if (options.readThrows) throw new Error("private read");
                return options.readResult ?? { data: copy(row), error: null };
              }
              if (options.beforeWrite) await options.beforeWrite();
              if (options.writeResult) return options.writeResult;
              if (!row || !filters.every(([key, value]) => row[key] === value)) return { data: null, error: null };
              row = { ...row, ...patch };
              if (options.writeThrows) throw new Error("lost acknowledgement");
              return { data: copy(row), error: null };
            },
          };
        } };
      },
    },
  };
  function load(name) {
    if (name === "./diagnostic") name = "@/lib/diagnostic";
    if (stubs[name]) return stubs[name];
    if (!modules[name]) {
      assert.ok(sources[name], `Unexpected dependency: ${name}`);
      const exports = {}; modules[name] = exports;
      runInNewContext(sources[name], { exports, require: load, Date, JSON, process: { env: {} } });
    }
    return modules[name];
  }
  return { load, calls, user, options, get row() { return row; }, set row(value) { row = copy(value); } };
}
const input = (role = "learner") => ({ revision: 0, role, experience: role === "learner" ? "coursework" : "teaching", goals: role === "learner" ? ["sdlc", "agents"] : ["assessment"], level: "intermediate" });

test("validated role-specific onboarding saves independent completion/background, never ages or permissions", async () => {
  for (const role of ["learner", "instructor", "admin"]) {
    const f = fixture({ role });
    const result = await f.load("onboarding").saveOnboarding(input(role === "learner" ? role : "instructor"));
    assert.equal(result.code, "saved");
    assert.equal(f.row.learning_level, "intermediate");
    assert.ok(f.row.onboarding_completed_at);
    assert.equal(f.row.diagnostic_summary, null);
    const timestamp = f.row.onboarding_completed_at;
    assert.equal((await f.load("onboarding").saveOnboarding({ ...input(role === "learner" ? role : "instructor"), revision: 1 })).code, "saved");
    assert.equal(f.row.onboarding_completed_at, timestamp);
    for (const call of f.calls.filter(call => call.patch)) {
      assert.deepEqual(call.filters, [["id", "owner"], ["learning_setup_revision", call.patch.learning_setup_revision - 1]]);
      assert.deepEqual(Object.keys(call.patch).sort(), ["learning_level", "learning_setup_revision", "onboarding_background", "onboarding_completed_at"]);
    }
  }
});

test("onboarding rejects malformed choices, duplicates, excess goals, forged roles/fields and stale revisions", async () => {
  for (const patch of [{ role: "instructor", experience: "teaching", goals: ["assessment"] }, { role: "admin" },
    { experience: "invented" }, { goals: [] }, { goals: ["sdlc", "sdlc"] }, { goals: ["assessment"] },
    { goals: ["sdlc", "agents", "teamwork", "sdlc"] }, { level: "expert" }, { age: 22 }, { completed_at: "yesterday" }, { score: 6 }, { revision: "0" }]) {
    const f = fixture();
    assert.equal((await f.load("onboarding").saveOnboarding({ ...input(), ...patch })).code, "invalid");
    assert.equal(f.calls.filter(call => call.patch).length, 0);
  }
  const f = fixture();
  assert.equal((await f.load("onboarding").saveOnboarding({ ...input(), revision: 10 })).code, "conflict");
});

test("diagnostic real actions compute score, reject forged score/role, adopt/override explicitly and keep level on retake", async () => {
  for (const role of ["learner", "instructor"]) {
    const f = fixture({ role });
    const actions = f.load("diagnostic"), rubric = f.load("@/lib/diagnostic");
    const answers = rubric.diagnosticQuestions[role].map(q => q.correct);
    for (const patch of [{ score: 6 }, { suggested_level: "advanced" }, { role: role === "learner" ? "instructor" : "learner" }]) {
      assert.equal((await actions.runDiagnostic({ revision: 0, role, answers, ...patch })).code, "invalid");
    }
    assert.equal((await actions.runDiagnostic({ revision: 0, role, answers })).code, "saved");
    assert.equal(f.row.diagnostic_summary.score, 6);
    assert.equal(f.row.learning_level, "foundation");
    assert.equal(f.row.onboarding_completed_at, null);
    assert.equal((await actions.chooseDiagnosticLevel({ revision: 1, role, decision: "adopt", level: "new" })).code, "invalid");
    assert.equal((await actions.chooseDiagnosticLevel({ revision: 1, role, decision: "adopt", level: "advanced" })).code, "saved");
    assert.equal(f.row.learning_level, "advanced");
    assert.equal((await actions.chooseDiagnosticLevel({ revision: 2, role, decision: "override", level: "new" })).code, "saved");
    assert.equal(f.row.learning_level, "new");
    assert.equal((await actions.runDiagnostic({ revision: 3, role, answers })).code, "saved");
    assert.equal(f.row.learning_level, "new");
    assert.equal(f.row.diagnostic_summary.score, 6);
    f.user.app_metadata.role = role === "learner" ? "instructor" : "learner";
    assert.equal((await actions.chooseDiagnosticLevel({ revision: 4, role: f.user.app_metadata.role, decision: "adopt", level: "advanced" })).code, "invalid");
  }
});

test("auth failures including user-plus-error deny all setup mutations", async () => {
  for (const options of [{ createThrows: true }, { authThrows: true }, { auth: { data: { user: null }, error: null } },
    { auth: { data: { user: { id: "owner" } }, error: { status: 500 } } }, { auth: { data: { user: { id: "owner" } } } }]) {
    const f = fixture(options);
    assert.equal((await f.load("onboarding").saveOnboarding(input())).code, "auth");
    assert.equal((await f.load("diagnostic").runDiagnostic({ role: "learner", revision: 0, answers: Array(6).fill(0) })).code, "auth");
    assert.equal(f.calls.filter(call => call.table).length, 0);
  }
});

test("missing/schema/read failure never invents a profile or claims a save", async () => {
  for (const [options, code] of [
    [{ row: null }, "missing"], [{ databaseThrows: true }, "unavailable"], [{ readThrows: true }, "unavailable"],
    [{ readResult: { data: null, error: { code: "42703" } } }, "schema"],
    [{ readResult: { data: { ...emptyProfile(), diagnostic_summary: { score: 100 } }, error: null } }, "unavailable"],
    [{ readResult: { data: { ...emptyProfile(), id: "someone-else" }, error: null } }, "unavailable"],
    [{ readResult: { data: emptyProfile() } }, "unavailable"],
  ]) {
    const f = fixture(options);
    assert.equal((await f.load("onboarding").saveOnboarding(input())).code, code);
    assert.equal(f.calls.filter(call => call.patch).length, 0);
  }
});

test("uncertain/failed writes never report saved; reload reconciles a lost acknowledgement", async () => {
  for (const [writeResult, code] of [
    [{ data: null, error: { code: "23514" } }, "rejected"], [{ data: null, error: { code: "42703" } }, "schema"],
    [{ data: null, error: { code: "500" } }, "unknown"], [{ data: null, error: null }, "conflict"],
    [{ data: emptyProfile(), error: null }, "unknown"], [{ data: emptyProfile() }, "unknown"],
  ]) {
    const f = fixture({ writeResult });
    assert.equal((await f.load("onboarding").saveOnboarding(input())).code, code);
  }
  const f = fixture({ writeThrows: true });
  assert.equal((await f.load("onboarding").saveOnboarding(input())).code, "unknown");
  assert.equal(f.row.learning_setup_revision, 1);
  const reloaded = await f.load("onboarding").reloadLearningSetup();
  assert.equal(reloaded.code, "loaded");
  assert.equal(reloaded.profile.learning_level, "intermediate");
  assert.equal(f.calls.filter(call => call.patch).length, 1);
});

test("duplicate/concurrent real actions permit exactly one compare-and-swap write", async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const f = fixture({ beforeWrite: () => wait });
  const a = f.load("onboarding").saveOnboarding(input());
  const b = f.load("diagnostic").runDiagnostic({ revision: 0, role: "learner", answers: Array(6).fill(0) });
  await new Promise(resolve => setImmediate(resolve)); release();
  assert.deepEqual((await Promise.all([a, b])).map(result => result.code).sort(), ["conflict", "saved"]);
  assert.equal(f.row.learning_setup_revision, 1);
  f.row = { ...f.row, learning_setup_revision: 2, learning_level: "advanced" };
  assert.equal((await f.load("onboarding").saveOnboarding({ ...input(), revision: 1 })).code, "conflict");
  assert.equal(f.row.learning_level, "advanced");
});

test("actual dashboard gates first entry, permits return entry and leaves account recovery on read failure", async () => {
  const first = fixture();
  await assert.rejects(first.load("dashboard").default(), /REDIRECT:\/onboarding/);
  const returning = fixture();
  await returning.load("onboarding").saveOnboarding(input());
  const { renderToStaticMarkup } = require("react-dom/server");
  assert.match(renderToStaticMarkup(await returning.load("dashboard").default()), /Welcome, Synthetic/);
  const broken = fixture({ readThrows: true });
  const html = renderToStaticMarkup(await broken.load("dashboard").default());
  assert.match(html, /Learning setup unavailable/);
  assert.match(html, /href="\/profile"/);
  assert.match(html, /href="\/login"/);
  assert.doesNotMatch(html, /Welcome/);
});

test("actual dashboard integrates shared version-specific progress after onboarding", async () => {
  const lesson = { id: "synthetic-lesson", owner_id: "owner", version: 2, title: "Synthetic versioned lesson", subject: "Testing", summary: "Synthetic lesson evidence.", visibility: "private" };
  const stamp = "2026-10-21T00:00:00Z";
  const enrollment = { lesson_id: lesson.id, attended_at: stamp };
  const oldPass = { original_lesson_id: lesson.id, lesson_version: 1, score: 10 };
  const records = { enrollments: [enrollment], attempts: [oldPass] };
  const f = fixture({ lessons: [lesson], records });
  await f.load("onboarding").saveOnboarding(input());
  const { renderToStaticMarkup } = require("react-dom/server");
  const html = async () => renderToStaticMarkup(await f.load("dashboard").default());
  assert.match(await html(), /<strong>Version 2 · Continue<\/strong>/);
  assert.match(await html(), /1 passed \(any version\)/);
  enrollment.progress_evidence = { 1: { reviewed_at: stamp, attended_at: stamp } };
  assert.match(await html(), /<strong>Version 2 · Continue<\/strong>/);
  enrollment.progress_evidence[2] = { reviewed_at: stamp };
  assert.match(await html(), /<strong>Version 2 · Reviewed · Continue<\/strong>/);
  enrollment.progress_evidence[2].attended_at = stamp;
  assert.match(await html(), /<strong>Version 2 · Attended · Continue<\/strong>/);
  records.attempts.push({ ...oldPass, lesson_version: 2, score: 6 });
  assert.match(await html(), /<strong>Version 2 · Passed<\/strong>/);
});

test("actual middleware protects both new routes without onboarding-gating profile/recovery", async () => {
  const { NextResponse, NextRequest } = require("next/server");
  const exports = {};
  runInNewContext(sources.middleware, { exports, URL, process: { env: {} }, require(name) {
    if (name === "next/server") return { NextResponse };
    if (name === "../public-config") return { publicConfig: () => ({ supabaseUrl: "https://synthetic.invalid", anonKey: "synthetic", siteOrigin: "https://app.invalid" }) };
    if (name === "@supabase/ssr") return { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null }, error: null }) } }) };
    throw new Error(name);
  } });
  for (const path of ["/onboarding", "/diagnostic", "/profile", "/profile/delete"]) {
    assert.match((await exports.updateSession(new NextRequest(`https://app.invalid${path}`))).headers.get("location"), /\/login/);
  }
  assert.equal((await exports.updateSession(new NextRequest("https://app.invalid/forgot-password"))).status, 200);
});
