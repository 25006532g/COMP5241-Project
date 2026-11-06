import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
registerHooks({ resolve(specifier, context, next) {
  if (specifier === "@/lib/curriculum") return next(new URL("../src/lib/curriculum.ts", import.meta.url).href, context);
  return next(specifier, context);
} });
const { buildPathRequest, derivePreferences, lessonTopic, MAX_AI_CANDIDATES, MAX_PATH_LESSONS, recommendLessons, validatePathResponse } = await import("../src/lib/recommendations.ts");
const { FAMILIES } = await import("../src/lib/curriculum.ts");

const id = number => `11111111-1111-4111-8111-${String(number).padStart(12, "0")}`;
const lesson = (number, title, subject = "SDLC") => ({ id: id(number), title, subject, summary: "A practical lesson." });
const catalog = [lesson(1, "Requirements basics", "Software requirements"), lesson(2, "Software testing", "Software testing"), lesson(3, "Deployment basics", "Software deployment"), lesson(4, "Biology testing", "Biology")];
const token = (request, lessonId) => `candidate-${request.candidates.findIndex(item => item.id === lessonId) + 1}`;

test("ranking is deterministic, topic-sensitive, and limited to supplied SDLC lessons", () => {
  const preferences = derivePreferences({ level: "new" }, { topic: "testing" });
  const result = recommendLessons(catalog, preferences);
  assert.equal(result[0].id, id(2));
  assert.match(result[0].reason, /testing preference/);
  assert.deepEqual(result, recommendLessons([...catalog].reverse(), preferences));
  assert.ok(!result.some(item => item.id === id(4)));
  assert.deepEqual(recommendLessons([catalog[0]], preferences).map(item => item.id), [id(1)]);
});

test("completed lessons are omitted", () => {
  const result = recommendLessons(catalog, derivePreferences({}, { topic: "testing" }), [id(2)]);
  assert.ok(!result.some(item => item.id === id(2)));
});

test("all three families use metadata for local/AI paths and revalidate metadata changes", () => {
  const lessons = Object.entries(FAMILIES).map(([family, subject], index) => ({
    ...lesson(index + 20, `Synthetic ${family}`, subject),
    metadata: { version: 1, topic: family === "sdlc" ? "testing" : family, audience: "both", difficulty: "intermediate", outcomes: ["Apply a skill"], prerequisites: [] },
  }));
  const request = buildPathRequest(lessons, derivePreferences({ level: "intermediate" }));
  assert.equal(request.candidates.length, 3);
  assert.ok(request.candidates.every(item => item.reason.includes("Author-specified")));
  const response = JSON.stringify({ lessonIds: ["candidate-3", "candidate-2", "candidate-1"] });
  assert.equal(validatePathResponse(response, request.candidates, lessons).length, 3);
  assert.throws(() => validatePathResponse(response, request.candidates, lessons.map(item => ({ ...item, metadata: { ...item.metadata, difficulty: "advanced" } }))));
  assert.equal(recommendLessons(lessons, derivePreferences({}), [lessons[1].id]).length, 2);
});

test("selected topics and goals override profile-derived preferences", () => {
  const profile = { level: "foundation", subjects: "Software requirements", goals: "Improve software testing quality" };
  assert.equal(derivePreferences(profile).goal, "quality");
  assert.deepEqual(derivePreferences(profile).topics, ["requirements", "testing"]);
  assert.equal(recommendLessons(catalog, derivePreferences({}, { topic: "requirements" }))[0].id, id(1));
  assert.equal(recommendLessons(catalog, derivePreferences(profile, { topic: "deployment", goal: "delivery" }))[0].id, id(3));
  assert.equal(recommendLessons(catalog, derivePreferences({}, { goal: "quality" }))[0].id, id(2));
  assert.equal(recommendLessons(catalog, derivePreferences({}, { goal: "delivery" }))[0].id, id(3));
});

test("background level uses author metadata only, never title-inferred difficulty", () => {
  const levels = [lesson(5, "Advanced software design"), lesson(6, "Software design basics")];
  assert.equal(recommendLessons(levels, derivePreferences({ level: "new" }))[0].id, id(5));
  assert.match(recommendLessons(levels, derivePreferences({}))[0].reason, /not specified/);
  levels[0].metadata = { version: 1, audience: "learners", difficulty: "advanced", topic: "design", outcomes: ["Design"], prerequisites: [] };
  levels[1].metadata = { ...levels[0].metadata, difficulty: "new" };
  assert.equal(recommendLessons(levels, derivePreferences({ level: "new" }))[0].id, id(6));
  const advanced = recommendLessons(levels, derivePreferences({ level: "advanced" }));
  assert.equal(advanced[0].id, id(5));
  assert.match(advanced[0].reason, /Author-specified/);
  assert.equal(derivePreferences({ level: "arbitrary personal data" }).level, "new");
});

test("scope depends on an explicit SDLC subject, not incidental keywords in unrelated material", () => {
  for (const subject of ["Biology", "Testing", "Fashion design", "Project management", "Gardening", "SDLC cooking"]) {
    assert.equal(lessonTopic(lesson(7, "Requirements, design, testing and deployment", subject)), null);
  }
  assert.equal(lessonTopic(lesson(7, "Unit testing", "Software Testing")), "testing");
  assert.equal(lessonTopic(lesson(7, "Release automation", "SDLC: Deployment")), "deployment");
});

test("metadata and explicit subjects determine topics, never incidental title/summary mentions", () => {
  assert.equal(lessonTopic({ ...lesson(7, "Unit testing"), summary: "Validate requirements and design through automated tests." }), "overview");
  assert.equal(lessonTopic({ ...lesson(7, "Requirements validation", "Software Testing"), summary: "Software design and implementation." }), "testing");
});

test("ranking and AI candidates are bounded, deduplicated, and contain only supplied accessible IDs", () => {
  const many = Array.from({ length: 50 }, (_, index) => lesson(index + 10, "SDLC overview"));
  const preferences = derivePreferences({});
  assert.equal(recommendLessons(many, preferences).length, MAX_PATH_LESSONS);
  assert.equal(buildPathRequest(many, preferences).candidates.length, MAX_AI_CANDIDATES);
  assert.equal(recommendLessons(many, preferences, [], Infinity).length, MAX_PATH_LESSONS);
  assert.equal(recommendLessons(many, preferences, [], 0).length, 0);
  assert.equal(recommendLessons([catalog[0], catalog[0], { ...catalog[0], id: "../../admin" }], preferences).length, 1);
  assert.throws(() => buildPathRequest([], preferences));
  assert.throws(() => buildPathRequest([catalog[0]], preferences, [id(1)]));
});

test("external payload contains only allowed coarse preferences and course metadata", () => {
  const preferences = derivePreferences({ level: "advanced", subjects: "Software testing", goals: "I am Private Name, private@example.com, user-secret-123. Improve testing." });
  const request = buildPathRequest(catalog.map(item => ({ ...item, owner_id: "owner-secret", questions: ["answer-secret"], score: 2, summary: "summary-secret" })), preferences);
  const payload = JSON.parse(request.messages[1].content);
  assert.deepEqual(Object.keys(payload).sort(), ["lessons", "preferences"]);
  for (const entry of payload.lessons) assert.deepEqual(Object.keys(entry).sort(), ["audience", "difficulty", "id", "title", "topic"]);
  const serialized = JSON.stringify(request.messages);
  for (const secret of ["Private Name", "private@example.com", "user-secret", "owner-secret", "answer-secret", "summary-secret", "score"]) assert.ok(!serialized.includes(secret));
  for (const item of catalog) assert.ok(!serialized.includes(item.id));
  assert.throws(() => buildPathRequest(catalog, { ...preferences, email: "private@example.com" }));
  assert.throws(() => buildPathRequest(catalog, { ...preferences, topics: ["cooking"] }));
});

test("valid AI ordering uses only local titles and reasons", () => {
  const request = buildPathRequest(catalog, derivePreferences({}));
  const path = validatePathResponse(JSON.stringify({ lessonIds: [token(request, id(3)), token(request, id(1))] }), request.candidates, catalog);
  assert.deepEqual(path.map(item => item.id), [id(3), id(1)]);
  assert.equal(path[0].title, catalog[2].title);
  assert.match(path[0].reason, /Not yet completed/);
});

test("rejects malicious, duplicate, missing, inaccessible, completed, and excessive model IDs", () => {
  const request = buildPathRequest(catalog, derivePreferences({}));
  const invalid = [null, {}, { lessonIds: [] }, { lessonIds: [null] }, { lessonIds: ["javascript:alert(1)"] },
    { lessonIds: ["../../admin"] }, { lessonIds: ["candidate-1", "candidate-1"] }, { lessonIds: ["candidate-99"] },
    { lessonIds: [id(4)] }, { lessonIds: [id(1)], reason: "model-controlled reason" },
    { lessonIds: Array.from({ length: MAX_PATH_LESSONS + 1 }, (_, index) => id(index + 1)) }];
  for (const response of invalid) assert.throws(() => validatePathResponse(JSON.stringify(response), request.candidates, catalog));
  for (const response of ["not JSON", "```json\n{}\n```", " ".repeat(4097)]) assert.throws(() => validatePathResponse(response, request.candidates, catalog));
  const response = JSON.stringify({ lessonIds: [token(request, id(1))] });
  assert.throws(() => validatePathResponse(response, request.candidates, catalog.slice(1)));
  assert.throws(() => validatePathResponse(response, request.candidates, catalog, [id(1)]));
  assert.throws(() => validatePathResponse(response, request.candidates, [{ ...catalog[0], subject: "Biology" }]));
  assert.throws(() => validatePathResponse(response, request.candidates, [{ ...catalog[0], title: "Changed title" }]));
  assert.throws(() => validatePathResponse(response, [], catalog));
});

test("server action gates AI, minimizes data, and rechecks current catalog and completions without enrollment", async context => {
  const key = Symbol.for("forge.recommendations.test");
  // Execute actual auth helpers; replace only the getUser I/O boundary, not policy.
  const authExports = {};
  const actualLearning = await import("../src/lib/learning.ts");
  const actualPermissions = await import("../src/lib/permissions.ts");
  const actualZod = await import("zod");
  new Function("require", "exports", "process", ts.transpileModule(readFileSync(new URL("../src/lib/learning-server.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText)(name => {
    if (name === "@/lib/supabase/server") return { createClient: async () => ({ auth: { getUser: async () => {
      const state = globalThis[key];
      state.calls.push(["auth"]);
      if (state.authThrows) throw new Error("PRIVATE AUTH CONFIG");
      return { data: { user: state.user }, error: state.authError };
    } } }) };
    if (name === "next/navigation") return { redirect() { throw new Error("Redirect /login"); } };
    if (name === "@supabase/supabase-js") return { createClient: () => {
      const state = globalThis[key];
      if (state.dbUnavailable) throw new Error("PRIVATE DATABASE CONFIG");
      state.calls.push(["database"]); return state.database;
    } };
    if (name === "@/lib/learning") return actualLearning;
    if (name === "@/lib/permissions") return actualPermissions;
    if (name === "zod") return actualZod;
    if (name === "server-only") return {};
    throw new Error(`Unexpected auth dependency ${name}`);
  }, authExports, { env: { NEXT_PUBLIC_SUPABASE_URL: "https://offline.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic" } });
  globalThis[Symbol.for("forge.path.auth")] = authExports;
  const hooks = registerHooks({
    resolve(specifier, resolveContext, nextResolve) {
      if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
      if (specifier === "@/lib/learning-server") return { url: `data:text/javascript,${encodeURIComponent(`
        const state = () => globalThis[Symbol.for("forge.recommendations.test")];
        export const requireUser = (...args) => globalThis[Symbol.for("forge.path.auth")].requireUser(...args);
        export const currentUser = (...args) => globalThis[Symbol.for("forge.path.auth")].currentUser(...args);
        export const database = (...args) => globalThis[Symbol.for("forge.path.auth")].database(...args);
        export const visibleLessons = (...args) => globalThis[Symbol.for("forge.path.auth")].visibleLessons(...args);
      `)}`, shortCircuit: true };
      if (specifier === "@/lib/openrouter-client") return { url: `data:text/javascript,${encodeURIComponent(`
        export class OpenRouterError extends Error {}
        export const completion = (...args) => globalThis[Symbol.for("forge.recommendations.test")].completion(...args);
      `)}`, shortCircuit: true };
      if (specifier.startsWith("@/lib/")) return nextResolve(new URL(`../src/lib/${specifier.slice(6)}.ts`, import.meta.url).href, resolveContext);
      return nextResolve(specifier, resolveContext);
    },
  });
  let generateLearningPath, PathOpenRouterError;
  try {
    ({ generateLearningPath } = await import("../src/app/paths/actions.ts"));
    ({ OpenRouterError: PathOpenRouterError } = await import("@/lib/openrouter-client"));
  }
  finally { hooks.deregister(); }

  function setup(overrides = {}) {
    const calls = [];
    const state = {
      user: { id: "user-private-id", app_metadata: { ai_access: true } },
      profile: { age: 18, learning_level: "new", preferred_subjects: ["Software testing"], learning_goals: "Private Name private@example.com wants testing" },
      catalog: [...catalog], passed: [], allowed: true, profileError: false,
      calls, authError: null, ownerId: "user-private-id", ...overrides,
    };
    state.database = {
      from(table) {
        assert.ok(["profiles", "forge_attempts", "forge_lessons"].includes(table));
        const query = {
          select(value) { assert.notEqual(value,"age","Path AI authorization must not query profile age");calls.push(["select", table, value]); return query; },
          eq(column, value) { assert.equal(column, table === "profiles" ? "id" : "user_id"); assert.equal(value, state.ownerId, "Never query another owner"); return query; },
          or(value) { assert.equal(value, `visibility.eq.public,owner_id.eq.${state.ownerId}`); return query; },
          gte(column, value) { assert.equal(column, "score"); assert.equal(value, 6); return query; },
          order() { return query; },
          async range() {
            if (state.failTable === table) return { data: null, error: new Error("PRIVATE ROW DETAIL") };
            return { data: table === "forge_lessons" ? state.catalog : state.passed.map(original_lesson_id => ({ original_lesson_id })), error: null };
          },
          async maybeSingle() { return { data: state.profile, error: state.profileError ? new Error("private db detail") : null }; },
        };
        return query;
      },
      async rpc(name, args) { assert.equal(name, "forge_claim_request"); assert.deepEqual(args, { request_user: state.ownerId }); calls.push(["quota"]); return { data: state.allowed, error: state.quotaError ? new Error("PRIVATE QUOTA") : null }; },
    };
    state.completion = async (messages, schema) => {
      calls.push(["completion", messages, schema]);
      if (state.afterCompletion) state.afterCompletion();
      if (state.providerError) throw state.providerError;
      return state.response ?? JSON.stringify({ lessonIds: [JSON.parse(messages[1].content).lessons.find(item => item.title === catalog[1].title).id] });
    };
    globalThis[key] = state;
    const form = new FormData();
    form.set("topic", "profile"); form.set("goal", "profile"); form.set("shareCourseContent", "on");
    return { state, form, calls };
  }

  try {
    await context.test("initial auth error with a user fails closed before privileged reads", async () => {
      const { state, form, calls } = setup();
      state.authError = new Error("PRIVATE AUTH ERROR");
      const result = await generateLearningPath({}, form);
      assert.ok(result.error);
      assert.equal(result.path, undefined);
      assert.deepEqual(calls.map(call => call[0]), ["auth"]);
    });
    await context.test("replacement grant, owner switch and lost session reject after inference before further reads", async () => {
      for (const variant of ["grant", "owner", "expired", "user-error", "auth-throw"]) {
        const { state, form, calls } = setup();
        let after;
        state.afterCompletion = () => {
          after = calls.length;
          state.user = variant === "expired" ? null : { ...state.user, id: variant === "owner" ? "other-owner" : state.user.id, app_metadata: { ai_access: variant !== "grant" } };
          if (variant === "user-error") state.authError = new Error("PRIVATE SESSION ERROR");
          if (variant === "auth-throw") state.authThrows = true;
        };
        const result = await generateLearningPath({}, form);
        assert.ok(result.error, variant);
        assert.equal(result.path, undefined, variant);
        assert.equal(calls.filter(call => call[0] === "auth").length, 2, variant);
        if (variant !== "grant") assert.deepEqual(calls.slice(after).map(call => call[0]), ["auth"]);
      }
    });
    await context.test("unapproved/string/spoof grant cannot call external AI at any age", async () => {
      for (const [age, approved] of [[13, false], [17, false], [null, undefined], [18, "true"], [120, false], [undefined,false]]) {
        const { state, form, calls } = setup();
        state.profile.age = age; state.user.app_metadata.ai_access = approved;
        state.user.user_metadata={ai_access:true,age};
        const result = await generateLearningPath({ path: [{ id: id(99) }] }, form);
        assert.match(result.error, /administrator-approved AI access/);
        assert.equal(result.path, undefined);
        assert.ok(!calls.some(call => ["quota", "completion"].includes(call[0])));
        assert.ok(recommendLessons(state.catalog, derivePreferences({})).length > 0);
      }
    });
    await context.test("approved users receive paths regardless of missing profile age",async()=>{
      for(const age of [13,17,18,120,null,undefined]){
        const {state,form,calls}=setup();state.profile.age=age;
        state.afterCompletion=()=>{state.profile.age=null;};
        assert.ok((await generateLearningPath({},form)).path);
        assert.equal(calls.filter(call=>call[0]==="completion").length,1);
        assert.equal(calls.filter(call=>call[0]==="select"&&call[2]==="age").length,0);
      }
    });
    await context.test("approved user receives validated non-persisted path with no personal fields sent", async () => {
      const { form, calls } = setup();
      const result = await generateLearningPath({}, form);
      assert.equal(result.path[0].id, id(2));
      assert.equal(result.selectionKey, "profile:profile");
      assert.equal(calls.filter(call => call[0] === "auth").length, 2);
      assert.equal(calls.filter(call => call[0] === "select" && call[2] === "age").length, 0);
      assert.equal(calls.filter(call => call[0] === "quota").length, 1);
      assert.equal(calls.filter(call => call[0] === "completion").length, 1);
      const external = JSON.stringify(calls.find(call => call[0] === "completion").slice(1));
      for (const secret of ["user-private-id", "Private Name", "private@example.com", "learning_goals", "score", "answers"]) assert.ok(!external.includes(secret));
      assert.ok(calls.some(call => call[0] === "select" && call[2] === "original_lesson_id"));
    });
    await context.test("auth/config/quota/read/provider failures are sanitized with no stale path or automatic inference", async () => {
      for (const variant of ["expired", "auth", "config", "quota", "catalog", "passed", "post-catalog", "post-passed", "transport", "provider"]) {
        const { state, form, calls } = setup();
        if (variant === "expired") state.user = null;
        if (variant === "auth") state.authThrows = true;
        if (variant === "config") state.dbUnavailable = true;
        if (variant === "quota") state.quotaError = true;
        if (variant === "catalog") state.failTable = "forge_lessons";
        if (variant === "passed") state.failTable = "forge_attempts";
        state.afterCompletion = () => {
          if (variant === "post-catalog") state.failTable = "forge_lessons";
          if (variant === "post-passed") state.failTable = "forge_attempts";
        };
        if (variant === "transport") state.providerError = new Error("PRIVATE TRANSPORT");
        if (variant === "provider") state.providerError = new PathOpenRouterError("PRIVATE PROVIDER KEY");
        const result = await generateLearningPath({ path: [{ id: id(99) }] }, form);
        assert.ok(result.error, variant); assert.equal(result.path, undefined, variant);
        assert.ok(!/PRIVATE|private db|KEY/.test(result.error), variant);
        const inference = calls.filter(call => call[0] === "completion").length;
        assert.equal(inference, variant.startsWith("post-") || ["transport", "provider"].includes(variant) ? 1 : 0, variant);
      }
    });
    await context.test("invalid input, missing sharing consent, failed profile read, quota, or empty catalog never calls AI", async () => {
      for (const variant of ["invalid", "consent", "profile", "quota", "empty"]) {
        const { state, form, calls } = setup();
        if (variant === "invalid") form.set("topic", "cooking");
        if (variant === "consent") form.delete("shareCourseContent");
        if (variant === "profile") state.profileError = true;
        if (variant === "quota") state.allowed = false;
        if (variant === "empty") state.catalog = [];
        assert.ok((await generateLearningPath({}, form)).error);
        assert.ok(!calls.some(call => call[0] === "completion"));
      }
    });
    await context.test("revoked visibility, newly passed lessons, revoked eligibility, and malicious outputs reject the entire path", async () => {
      for (const variant of ["visibility", "passed", "eligibility", "title", "metadata", "malicious"]) {
        const { state, form } = setup();
        state.afterCompletion = () => {
          if (variant === "visibility") state.catalog = [catalog[0]];
          if (variant === "passed") state.passed = [id(2)];
          if (variant === "eligibility") state.user.app_metadata.ai_access = false;
          if (variant === "title") state.catalog = state.catalog.map(item => ({ ...item, title: "Changed title" }));
          if (variant === "metadata") state.catalog = state.catalog.map(item => ({ ...item, metadata: { version: 1, topic: "testing", audience: "both", difficulty: "advanced", outcomes: ["Test"], prerequisites: [] } }));
        };
        if (variant === "malicious") state.response = JSON.stringify({ lessonIds: [id(2), id(99)] });
        const result = await generateLearningPath({}, form);
        assert.ok(result.error);
        assert.equal(result.path, undefined);
      }
    });
  } finally { delete globalThis[key]; delete globalThis[Symbol.for("forge.path.auth")]; }
});

test("learning-path initial UI exposes local links but requires explicit eligible AI sharing", async () => {
  const key = Symbol.for("forge.recommendations.ui.test");
  globalThis[key] = createElement;
  const componentUrl = new URL("../src/components/learning-path.tsx", import.meta.url).href;
  const hooks = registerHooks({
    resolve(specifier, resolveContext, nextResolve) {
      if (specifier === "next/link") return { url: `data:text/javascript,${encodeURIComponent('export default function Link({children, ...props}) { return globalThis[Symbol.for("forge.recommendations.ui.test")]("a", props, children); }')}`, shortCircuit: true };
      if (specifier === "@/app/paths/actions") return { url: "data:text/javascript,export async function generateLearningPath(){throw new Error('No automatic AI generation allowed')}", shortCircuit: true };
      if (specifier === "@/lib/recommendations") return nextResolve(new URL("../src/lib/recommendations.ts", import.meta.url).href, resolveContext);
      return nextResolve(specifier, resolveContext);
    },
    load(url, loadContext, nextLoad) {
      if (url === componentUrl) return {
        format: "module", shortCircuit: true,
        source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText,
      };
      return nextLoad(url, loadContext);
    },
  });
  try {
    const { LearningPath } = await import(componentUrl);
    const props = { ownerId: "synthetic-owner", catalog, completedIds: [id(1)], initialPreferences: derivePreferences({}), aiAvailable: false };
    const minor = renderToStaticMarkup(createElement(LearningPath, props));
    assert.match(minor, /Local recommendations/);
    assert.match(minor, new RegExp(`/courses/${id(2)}`));
    assert.ok(!minor.includes(`/courses/${id(1)}`));
    assert.ok(!minor.includes(`/courses/${id(4)}`));
    assert.match(minor, /administrator-approved AI access/);
    assert.match(minor, /<select name="topic"/);
    assert.match(minor, /<button[^>]*disabled=""/);
    assert.match(minor, /not saved/);
    const adult = renderToStaticMarkup(createElement(LearningPath, { ...props, aiAvailable: true }));
    assert.ok(!adult.includes("administrator-approved AI access"));
    assert.match(adult, /name="shareCourseContent"/);
    assert.match(adult, /<button[^>]*disabled=""/);
    const empty = renderToStaticMarkup(createElement(LearningPath, { ...props, catalog: [] }));
    assert.match(empty, /No uncompleted curriculum lessons/);
  } finally { hooks.deregister(); delete globalThis[key]; }
});