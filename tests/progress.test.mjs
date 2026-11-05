import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdir, mkdtemp } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { chromium } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { z } from "zod";
import * as learning from "../src/lib/learning.ts";
import * as resume from "../src/lib/resume.ts";
import * as permissions from "../src/lib/permissions.ts";
const { lessonProgress, versionEvidence } = learning;

const source = file => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const transpile = file => ts.transpileModule(source(file), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function load(file, dependencies) {
  const mod = { exports: {} };
  new Function("require", "module", "exports", "process", transpile(file))(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected offline dependency: ${name}`);
    return dependencies[name];
  }, mod, mod.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: "https://offline.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic-not-a-key" } });
  return mod.exports;
}
const canonical = {
  title: "Synthetic review lesson", subject: "Testing", summary: "Synthetic offline evidence fixture.",
  slides: Array.from({ length: 4 }, (_, index) => ({ title: `Slide ${index + 1}`, body: "Review this synthetic example.", example: "Arrange, act, assert." })),
  activity: { prompt: "Order the steps", steps: ["Arrange", "Act", "Assert"] },
  questions: Array.from({ length: 10 }, (_, index) => ({ prompt: `Question ${index + 1}`, options: ["Correct", "Second", "Third", "Fourth"], correct: 0, explanation: "The first option is correct." })),
};

async function fixture(context) {
  const db = new PGlite();
  context.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as 'select null::uuid';`);
  await db.exec(source("supabase/schema.sql"));
  for (const name of (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(name => name.endsWith(".sql") && !name.startsWith("20261021")).sort()) {
    await db.exec(source(`supabase/migrations/${name}`));
  }
  const owner = randomUUID(), other = randomUUID(), lesson = randomUUID();
  await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"age\":22}'),($2,'{\"age\":22}')", [owner, other]);
  await db.query("insert into forge_lessons(id,owner_id,title,subject,summary,content) values($1,$2,$3,$4,$5,$6)", [lesson, owner, canonical.title, canonical.subject, canonical.summary, JSON.stringify(canonical)]);
  await db.query("insert into forge_enrollments(user_id,lesson_id,attended_at) values($1,$2,'2026-09-01T00:00:00Z')", [owner, lesson]);
  await db.exec(source("supabase/migrations/20261021_progress_evidence_ran.sql"));
  const state = { user: { id: owner, app_metadata: {} }, rpcCalls: [], lose: false, malformed: false, beforeRpc: null, fail: false, insertAck: true };
  function query(table) {
    assert.match(table, /^forge_[a-z_]+$/);
    const filters = [], params = [], orders = [];
    let mutation = null, one = false, range = "";
    const q = {
      select() { return q; },
      eq(key, value) { assert.match(key, /^[a-z_]+$/); filters.push(`${key}=$${params.push(value)}`); return q; },
      order(key, options) { assert.match(key, /^[a-z_]+$/); orders.push(`${key} ${options?.ascending === false ? "desc" : "asc"}`); return q; },
      range(start, end) { range = ` limit ${end - start + 1} offset ${start}`; return q; },
      single() { one = true; return q; }, maybeSingle() { one = true; return q; },
      insert(row) { mutation = row; return q; },
      async then(resolve, reject) {
        try {
          let rows;
          if (mutation) {
            const entries = Object.entries(mutation);
            rows = (await db.query(`insert into ${table}(${entries.map(([key]) => key).join(",")}) values(${entries.map((_, index) => `$${index + 1}`).join(",")}) returning *`,
              entries.map(([, value]) => typeof value === "object" ? JSON.stringify(value) : value))).rows;
          } else rows = (await db.query(`select * from ${table}${filters.length ? ` where ${filters.join(" and ")}` : ""}${orders.length ? ` order by ${orders.join(",")}` : ""}${range}`, params)).rows;
          resolve({ data: mutation && !state.insertAck ? null : one ? rows[0] ?? null : rows, error: null });
        } catch (error) { if (reject) reject(error); else throw error; }
      },
    };
    return q;
  }
  const client = { from: query, async rpc(name, args) {
    assert.equal(name, "forge_record_progress"); state.rpcCalls.push(args);
    if (state.beforeRpc) { const fn = state.beforeRpc; state.beforeRpc = null; await fn(); }
    if (state.fail) return { data: null, error: { code: "PGRST202" } };
    const result = await db.query("select forge_record_progress($1,$2,$3,$4) as evidence", Object.values(args));
    if (state.lose) { state.lose = false; throw new Error("Synthetic lost acknowledgement"); }
    return { data: state.malformed ? { version: 999 } : result.rows[0].evidence, error: null };
  } };
  const auth = { async createClient() { return { auth: { getUser: async () => ({ data: { user: state.user }, error: state.user ? null : {} }) } }; } };
  const server = load("src/lib/learning-server.ts", {
    "server-only": {}, "@supabase/supabase-js": { createClient: () => client },
    "next/navigation": { redirect() { throw new Error("Redirect"); } }, "@/lib/supabase/server": auth,
    "@/lib/learning": learning, "@/lib/permissions": permissions, zod: { z },
  });
  const actions = load("src/app/learning/actions.ts", {
    "next/cache": { revalidatePath() {} }, zod: { z }, "@/lib/learning-server": server,
    "@/lib/learning": learning, "@/lib/resume": resume, "@/lib/curriculum": {}, "@/lib/slide-lesson": {},
    "@/lib/openrouter": {}, "@/lib/lesson-generation-server": {}, "@/lib/ai-eligibility-server": {},
  });
  const enrollment = async () => (await db.query("select * from forge_enrollments where user_id=$1 and lesson_id=$2", [owner, lesson])).rows[0];
  async function reset() {
    await db.query("update forge_lessons set visibility='private',version=1 where id=$1", [lesson]);
    await db.query("update forge_enrollments set progress_evidence='{}',attended_at='2026-09-01T00:00:00Z',attendance_kind=null where user_id=$1", [owner]);
    await db.query("delete from forge_attempts");
    await db.query("delete from forge_resume");
    Object.assign(state, { user: { id: owner, app_metadata: {} }, lose: false, malformed: false, beforeRpc: null, fail: false, insertAck: true });
  }
  return { db, owner, other, lesson, state, server, actions, enrollment, reset };
}

test("progress evidence never infers review or versioned attendance from historical activity or passing", () => {
  const attempt = { original_lesson_id: "lesson", lesson_version: 1, score: 6 };
  const legacy = { attended_at: "2026-09-01T00:00:00Z", enrolled_at: "2026-09-01T00:00:00Z", stage: "quiz" };
  assert.deepEqual(lessonProgress(legacy, [attempt], "lesson", 1), { version: 1, reviewedAt: null, attendedAt: null, passed: true });
  assert.equal(lessonProgress(legacy, [{ ...attempt, score: 5 }], "lesson", 1).passed, false);
  assert.equal(lessonProgress(legacy, [attempt], "lesson", 2).passed, false);
  assert.equal(lessonProgress(legacy, [attempt], "other", 1).passed, false);
  for (const progress_evidence of [null, [], { 1: { reviewed_at: "forged" } }, { 1: { attended_at: 123 } }]) {
    assert.deepEqual(versionEvidence({ progress_evidence }, 1), { version: 1, reviewedAt: null, attendedAt: null });
  }
  const enrollment = { progress_evidence: { 1: { reviewed_at: "2026-10-21T00:00:00Z" }, 2: { attended_at: "2026-10-21T01:00:00+00:00" } } };
  assert.deepEqual(lessonProgress(enrollment, [], "lesson", 1), { version: 1, reviewedAt: "2026-10-21T00:00:00Z", attendedAt: null, passed: false });
  assert.deepEqual(lessonProgress(enrollment, [], "lesson", 2), { version: 2, reviewedAt: null, attendedAt: "2026-10-21T01:00:00+00:00", passed: false });
});

test("real progress actions and helpers with additive migration (offline PGlite)", async context => {
  const h = await fixture(context);
  const { actions: a, state: s, lesson, owner, other, db } = h;
  context.mock.method(globalThis, "fetch", async () => { throw new Error("Network forbidden"); });
  await context.test("migration leaves historical evidence unknown; real records are owner filtered", async () => {
    assert.deepEqual((await h.enrollment()).progress_evidence, {});
    const records = await h.server.userRecords(s.user);
    assert.equal(records.enrollments.length, 1);
    assert.equal(new Date(records.enrollments[0].attended_at).toISOString().startsWith("2026-09-01"), true);
    assert.deepEqual((await h.server.userRecords({ id: other })).enrollments, []);
    const denied = await a.submitQuiz(lesson, 1, Array(10).fill(0));
    assert.match(denied.error, /Reach the final quiz/);
  });

  await context.test("mounted real player/routes: explicit review, real saved quiz, stale replies, keyboard and 320/1440 (offline)", async context => {
    const h = await fixture(context);
    context.mock.method(globalThis, "fetch", async () => { throw new Error("Network forbidden"); });
    const require = createRequire(import.meta.url);
    const sources = Object.fromEntries([
      ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
      ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"],
      ["scheduler", "scheduler", "scheduler.development.js"],
    ].map(([name, pkg, file]) => [name, readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
    sources.player = transpile("src/components/learning-controls.tsx");
    sources["./lesson-preview"] = transpile("src/components/lesson-preview.tsx");
    const css = source("src/app/globals.css").replace('@import "tailwindcss";', "");
    const artifacts = await mkdtemp(join(tmpdir(), "forge-progress-20261021-"));
    context.diagnostic(`Synthetic UI evidence retained: ${artifacts}`);
    const browser = await chromium.launch();
    const bc = await browser.newContext({ offline: true, serviceWorkers: "block", viewport: { width: 320, height: 900 } });
    context.after(async () => { await bc.close(); await browser.close(); });
    const network = [], errors = [];
    await bc.route("**/*", route => { network.push(route.request().url()); return route.abort(); });
    const page = await bc.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", error => errors.push(error.message));
    let hold = false;
    const held = [];
    await page.exposeFunction("invokeProgress", async (name, args) => {
      if (name === "saveResume") return { revision: 1 }; // covered by the existing real resume scheduler suite
      assert.ok(["reviewLesson", "attend", "submitQuiz"].includes(name));
      const result = await h.actions[name](...args);
      if (name === "reviewLesson" && hold) return new Promise(resolve => held.push(() => resolve(result)));
      return result;
    });
    await page.setContent(`<style>${css}</style><main class="portal-page"><h1>Synthetic review lesson</h1><div id="root"></div></main>`);

    const preview = load("src/components/lesson-preview.tsx", {
      react: require("react"), "react/jsx-runtime": require("react/jsx-runtime"),
      "lucide-react": new Proxy({}, { get: () => () => null }), "./lesson-metadata": { LessonMetadata: () => null },
    });
    const controls = load("src/components/learning-controls.tsx", {
      react: require("react"), "react/jsx-runtime": require("react/jsx-runtime"), "next/link": { __esModule: true, default: ({ children, ...props }) => createElement("a", props, children) },
      "lucide-react": new Proxy({}, { get: () => () => null }), "@/app/learning/actions": h.actions,
      "./lesson-preview": preview, "./lesson-metadata": { MetadataFields: () => null },
    });
    const routeDeps = {
      "react/jsx-runtime": require("react/jsx-runtime"),
      "next/link": { __esModule: true, default: ({ children, ...props }) => createElement("a", props, children) },
      "next/navigation": { notFound() { throw new Error("Not found"); }, redirect(path) { throw new Error(`Redirect ${path}`); } },
      "@/components/learner-shell": { LearnerShell: ({ children }) => createElement("main", {}, children) },
      "@/components/learning-controls": controls, "@/components/lesson-coach": { LessonCoach: () => null },
      "@/components/lesson-metadata": { LessonMetadata: () => null }, "@/lib/curriculum": { readMetadata: () => null },
      "@/app/learning/actions": h.actions, "@/lib/learning": learning, "@/lib/resume": resume,
      "@/lib/learning-server": { ...h.server, displayName: async () => "Synthetic owner" },
      "@/lib/onboarding-server": { loadSetup: async () => ({ code: "ok", profile: { onboarding_completed_at: "2026-10-21" }, user: h.state.user }) },
      "lucide-react": new Proxy({}, { get: () => () => null }),
    };
    const lessonRoute = load("src/app/courses/[slug]/lessons/[lesson]/page.tsx", routeDeps).default;
    const overviewRoute = load("src/app/courses/[slug]/page.tsx", routeDeps).default;
    const historyRoute = load("src/app/progress/page.tsx", routeDeps).default;
    const dashboardRoute = load("src/app/dashboard/page.tsx", routeDeps).default;
    // visibleLessons uses a PostgREST-specific projection/OR. Only this catalog
    // adapter is replaced; progress records, lesson authorization and actions run real.
    routeDeps["@/lib/learning-server"].visibleLessons = async () => (await h.db.query("select * from forge_lessons where owner_id=$1 or visibility='public'", [h.state.user.id])).rows;
    function findPlayer(node) {
      if (!node || typeof node !== "object") return null;
      if (node.type === controls.LessonPlayer) return node.props;
      for (const child of [node.props?.children].flat(Infinity)) { const found = findPlayer(child); if (found) return found; }
      return null;
    }
    async function routeProps() {
      const props = findPlayer(await lessonRoute({ params: Promise.resolve({ slug: h.lesson, lesson: "1" }) }));
      assert.ok(props); assert.equal(props.ownerId, h.state.user.id);
      assert.equal("correct" in props.content.questions[0], false);
      assert.equal("explanation" in props.content.questions[0], false);
      return props;
    }
    async function render(props) {
      await page.evaluate(async ({ sources, props }) => {
        if (!globalThis.progressUI) {
          const modules = {};
          function load(name) {
            if (name === "@/app/learning/actions") return new Proxy({}, { get: (_, action) => (...args) => window.invokeProgress(action, args) });
            if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => load("react").createElement("a", props, children) };
            if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
            if (name === "./lesson-metadata") return new Proxy({}, { get: () => () => null });
            if (!modules[name]) {
              if (!sources[name]) throw new Error(`Unexpected module: ${name}`);
              const mod = { exports: {} }; modules[name] = mod;
              new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
            }
            return modules[name].exports;
          }
          progressUI = { root: load("react-dom/client").createRoot(document.getElementById("root")), load };
        }
        progressUI.root.render(progressUI.load("react").createElement(progressUI.load("player").LessonPlayer, props));
      }, { sources, props });
      await page.getByRole("region", { name: `Version ${props.version} evidence`, exact: true }).waitFor();
    }
    async function lastSlide() {
      for (let index = 0; index < 3; index++) await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.getByRole("button", { name: "Acknowledge slide review", exact: true }).waitFor();
    }
    async function screenshot(name, width) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} overflows`);
      await page.screenshot({ path: join(artifacts, `${name}-${width}.png`), fullPage: true });
    }
    async function evidenceText() { return page.getByRole("region", { name: /Version \d+ evidence/ }).innerText(); }

    await context.test("real learner route preserves source text, HTTPS links and answer-key privacy without progress writes", async () => {
      const linked = structuredClone(canonical);
      linked.slides[0].body = "  Read:\nhttps://example.org/a_(b)?q=1&x=2#part.\n ";
      linked.slides[0].example = "Source: https://example.org/reference; javascript:https://evil.org stays literal.";
      const before = h.state.rpcCalls.length;
      try {
        await h.db.query("update forge_lessons set content=$2 where id=$1", [h.lesson, JSON.stringify(linked)]);
        await render({ ...await routeProps(), ownerId: `${h.owner}:references` });
        assert.deepEqual(await page.locator(".slide-stage .lesson-text").allTextContents(), [linked.slides[0].body, linked.slides[0].example]);
        assert.deepEqual(await page.locator(".slide-stage .lesson-text a").evaluateAll(links => links.map(link => ({
          text: link.textContent, href: link.getAttribute("href"), target: link.target, rel: link.rel,
        }))), ["https://example.org/a_(b)?q=1&x=2#part", "https://example.org/reference"].map(url => ({
          text: url, href: url, target: "_blank", rel: "noopener noreferrer",
        })));
        assert.equal(h.state.rpcCalls.length, before);
        assert.deepEqual((await routeProps()).content.questions, canonical.questions.map(({ prompt, options }) => ({ prompt, options })));
      } finally {
        await h.db.query("update forge_lessons set content=$2 where id=$1", [h.lesson, JSON.stringify(canonical)]);
      }
    });

    await context.test("actual learner route links equivalent encoded CJK/emoji but not invalid UTF-8 or encoded controls", async () => {
      const pairs = [
        ["https://example.org/\u8cc7\u6599", "https://example.org/%E8%B3%87%E6%96%99"],
        ["https://example.org/\ud83d\ude00?q=\u8cc7\u6599%20a%26b%3Dc#\u7bc0\ud83d\ude00",
          "https://example.org/%F0%9F%98%80?q=%E8%B3%87%E6%96%99%20a%26b%3Dc#%E7%AF%80%F0%9F%98%80"],
      ];
      for (const [literal, encoded] of pairs) assert.equal(new URL(literal).href, new URL(encoded).href);
      const urls = pairs.flat(), linked = structuredClone(canonical);
      linked.slides[0].body = `  References:\n${urls.join("\n")}\n `;
      linked.slides[0].example = ["%E8%B3", "%C0%AF", "%ED%A0%80", "%F4%90%80%80", "%0A", "%7F", "%C2%80", "%E2%80%8B"]
        .map(suffix => `https://e.org/${suffix}`).join("\n");
      assert.deepEqual(learning.lessonSchema.parse(linked), linked, "fixture must fit the unchanged lesson limits");
      const before = h.state.rpcCalls.length;
      try {
        await h.db.query("update forge_lessons set content=$2 where id=$1", [h.lesson, JSON.stringify(linked)]);
        await render({ ...await routeProps(), ownerId: `${h.owner}:unicode-references` });
        await page.waitForFunction(body => document.querySelector(".slide-stage .lesson-text")?.textContent === body, linked.slides[0].body);
        assert.deepEqual(await page.locator(".slide-stage .lesson-text").allTextContents(), [linked.slides[0].body, linked.slides[0].example]);
        assert.deepEqual(await page.locator(".slide-stage .lesson-text a").evaluateAll(links => links.map(link => ({
          text: link.textContent, href: link.getAttribute("href"), target: link.target, rel: link.rel, policy: link.referrerPolicy,
        }))), urls.map(url => ({ text: url, href: url, target: "_blank", rel: "noopener noreferrer", policy: "no-referrer" })));
        assert.deepEqual((await routeProps()).content.questions, canonical.questions.map(({ prompt, options }) => ({ prompt, options })));
        assert.deepEqual((await h.db.query("select content from forge_lessons where id=$1", [h.lesson])).rows[0].content, linked, "rendering must not rewrite stored content");
        assert.equal(h.state.rpcCalls.length, before);
      } finally {
        await h.db.query("update forge_lessons set content=$2 where id=$1", [h.lesson, JSON.stringify(canonical)]);
      }
    });

    await context.test("route hydration has unknown history and no visit writes; lost acknowledgement is focused and explicitly retryable", async () => {
      const props = await routeProps();
      assert.equal(props.evidence.reviewedAt, null);
      await render(props);
      assert.equal((await h.enrollment()).progress_evidence && Object.keys((await h.enrollment()).progress_evidence).length, 0);
      await lastSlide();
      await screenshot("optional-review", 320); await screenshot("optional-review", 1440);
      h.state.lose = true;
      const acknowledge = page.getByRole("button", { name: "Acknowledge slide review", exact: true });
      await acknowledge.focus(); await page.keyboard.press("Enter");
      await page.getByRole("alert").filter({ hasText: "Review acknowledgement is unconfirmed" }).waitFor();
      assert.match(await page.locator(":focus").innerText(), /unconfirmed/);
      assert.match(await evidenceText(), /REVIEWED — No acknowledgement recorded/);
      await screenshot("review-unconfirmed", 320);
      const first = versionEvidence(await h.enrollment(), 1);
      await page.keyboard.press("Tab");
      assert.equal(await page.locator(":focus").innerText(), "Previous");
      await acknowledge.focus(); await page.keyboard.press("Enter");
      await page.getByRole("status").filter({ hasText: "Review acknowledgement saved" }).waitFor();
      assert.match(await page.locator(":focus").innerText(), /saved for this version/);
      assert.match(await evidenceText(), /REVIEWED — Acknowledgement saved/);
      assert.match(await evidenceText(), /ATTENDED — No version-specific/);
      assert.equal(await page.getByRole("link", { name: "Download certificate" }).count(), 0);
      assert.deepEqual(versionEvidence(await h.enrollment(), 1), first);
      await screenshot("review-saved", 1440);
      // A fresh server load (not optimistic local state) restores the acknowledgement.
      assert.deepEqual((await routeProps()).evidence, { ...first, passed: false });
    });
    await context.test("optional review is not a quiz gate; actual action pass and retry stay separate", async () => {
      await h.reset();
      const props = { ...await routeProps(), ownerId: `${h.owner}:fresh` };
      await render(props);
      const quizTab = page.getByRole("button", { name: "Final quiz", exact: true });
      await quizTab.focus(); await page.keyboard.press("Enter");
      await page.getByRole("heading", { name: "Final quiz", exact: true }).waitFor();
      assert.equal(await page.locator(":focus").innerText(), "Final quiz");
      assert.equal(versionEvidence(await h.enrollment(), 1).reviewedAt, null);
      assert.ok(versionEvidence(await h.enrollment(), 1).attendedAt);
      assert.equal(await page.getByRole("button", { name: "Submit quiz", exact: true }).isDisabled(), true);
      for (let index = 0; index < 10; index++) await page.locator(`input[name="question-${index}"]`).first().check();
      await page.getByRole("button", { name: "Submit quiz", exact: true }).focus(); await page.keyboard.press("Enter");
      await page.getByRole("heading", { name: "10 / 10 (100%)", exact: true }).waitFor();
      assert.equal(await page.locator(":focus").innerText(), "10 / 10 (100%)");
      assert.match(await evidenceText(), /PASSED — Saved passing quiz result \(at least 60%\)/);
      assert.match(await evidenceText(), /REVIEWED — No acknowledgement/);
      await screenshot("quiz-passed", 320);
      await page.getByRole("button", { name: "Retry quiz", exact: true }).click();
      assert.equal(await page.locator("input:checked").count(), 0);
      assert.match(await evidenceText(), /PASSED — Saved/);
      assert.equal((await routeProps()).evidence.passed, true);
    });
    await context.test("restored legacy quiz keeps answers and records attendance only when actually remounted at the quiz", async () => {
      await h.reset();
      await h.db.query("insert into forge_resume(user_id,lesson_id,lesson_version,stage,slide,ordering,answers) values($1,$2,1,'quiz',3,$3,$4)",
        [h.owner, h.lesson, [2, 1, 0], Array(10).fill(0)]);
      const props = await routeProps();
      assert.equal(props.saved.stage, "quiz");
      assert.equal(props.evidence.attendedAt, null);
      await render({ ...props, ownerId: `${h.owner}:restored` });
      await page.getByRole("region", { name: "Version 1 evidence", exact: true }).getByText("Final quiz reached", { exact: false }).waitFor();
      assert.equal(await page.locator("input:checked").count(), 10);
      assert.equal(versionEvidence(await h.enrollment(), 1).reviewedAt, null);
      assert.equal((await routeProps()).saved.stage, "quiz");
    });
    await context.test("pending review permits the quiz; duplicate clicks and late reply cannot overwrite attendance", async () => {
      await h.reset(); hold = true;
      await render({ ...await routeProps(), ownerId: `${h.owner}:parallel` });
      await lastSlide();
      const before = h.state.rpcCalls.length;
      await page.getByRole("button", { name: "Acknowledge slide review", exact: true }).evaluate(button => { button.click(); button.click(); });
      await assertEventually(() => held.length === 1);
      assert.equal(h.state.rpcCalls.length, before + 1);
      await page.getByRole("button", { name: "Final quiz", exact: true }).click();
      await page.getByRole("heading", { name: "Final quiz", exact: true }).waitFor();
      assert.match(await evidenceText(), /ATTENDED — Final quiz reached/);
      held.shift()(); hold = false;
      await page.getByRole("region", { name: "Version 1 evidence", exact: true }).getByText("Acknowledgement saved", { exact: false }).waitFor();
      assert.match(await evidenceText(), /ATTENDED — Final quiz reached/);
      assert.match(await evidenceText(), /PASSED — No saved passing/);
    });
    await context.test("a late review reply cannot mark a newer version or another owner", async () => {
      await h.reset(); hold = true;
      await render({ ...await routeProps(), ownerId: `${h.owner}:stale` });
      await lastSlide(); await page.getByRole("button", { name: "Acknowledge slide review", exact: true }).click();
      await assertEventually(() => held.length === 1);
      // Review transport is pending, but practice remains usable.
      assert.equal(await page.getByRole("button", { name: "Practice", exact: true }).first().isEnabled(), true);
      await h.db.query("update forge_lessons set version=2 where id=$1", [h.lesson]);
      await render(await routeProps());
      held.shift()(); hold = false;
      await page.waitForTimeout(50);
      assert.match(await evidenceText(), /Version 2 evidence/);
      assert.match(await evidenceText(), /REVIEWED — No acknowledgement/);
      await lastSlide(); hold = true;
      await page.getByRole("button", { name: "Acknowledge slide review", exact: true }).click();
      await assertEventually(() => held.length === 1);
      await h.db.query("update forge_lessons set visibility='public' where id=$1", [h.lesson]);
      await h.db.query("insert into forge_enrollments(user_id,lesson_id) values($1,$2)", [h.other, h.lesson]);
      h.state.user = { id: h.other, app_metadata: {} };
      await render(await routeProps());
      held.shift()(); hold = false;
      await page.waitForTimeout(50);
      assert.match(await evidenceText(), /REVIEWED — No acknowledgement/);
      assert.equal((await page.getByRole("button", { name: "Next", exact: true }).count()), 1);
    });
    await context.test("actual overview and history retain versions, unknown legacy and inaccessible lesson boundaries", async () => {
      h.state.user = { id: h.owner, app_metadata: {} };
      assert.match(renderToStaticMarkup(await dashboardRoute()), /Version 2 · Reviewed · Continue/);
      await h.actions.attend(h.lesson, 2);
      assert.match(renderToStaticMarkup(await dashboardRoute()), /Version 2 · Attended · Continue/);
      await h.actions.submitQuiz(h.lesson, 2, [0, 0, 0, 0, 0, 0, 1, 1, 1, 1]);
      await h.actions.submitQuiz(h.lesson, 2, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
      const legacy = randomUUID();
      await h.db.query("insert into forge_lessons(id,owner_id,title,subject,summary,content) values($1,$2,'Historical learning example',$3,$4,$5)",
        [legacy, h.owner, canonical.subject, canonical.summary, JSON.stringify(canonical)]);
      await h.db.query("insert into forge_enrollments(user_id,lesson_id,attended_at) values($1,$2,'2026-09-01T00:00:00Z')", [h.owner, legacy]);
      const overview = renderToStaticMarkup(await overviewRoute({ params: Promise.resolve({ slug: h.lesson }) }));
      assert.match(overview, /Version 2 evidence/); assert.match(overview, /Acknowledgement saved/); assert.match(overview, /Saved passing quiz result/);
      const history = renderToStaticMarkup(await historyRoute());
      assert.match(history, /Version 1 evidence/); assert.match(history, /Version 2 evidence/);
      assert.match(history, /Historical review is unknown/); assert.match(history, /No acknowledgement recorded/);
      assert.match(history, /6\/10/); assert.match(history, /5\/10/); assert.match(history, /Not passed/);
      assert.match(renderToStaticMarkup(await dashboardRoute()), /Version 2 · Passed/);
      await h.db.query("update forge_lessons set version=3 where id=$1", [h.lesson]);
      const dashboard = renderToStaticMarkup(await dashboardRoute());
      assert.match(dashboard, /passed \(any version\)/);
      assert.match(dashboard, /Version 3 · Continue/);
      await h.db.query("update forge_lessons set version=2 where id=$1", [h.lesson]);
      // Static rendering uses the actual route and real evidence component; shell,
      // metadata and framework navigation are the only presentation adapters.
      await page.evaluate(() => progressUI.root.unmount());
      await page.setContent(`<style>${css}</style>${dashboard}`);
      await screenshot("dashboard-new-version", 320); await screenshot("dashboard-new-version", 1440);
      await page.setContent(`<style>${css}</style>${history}`);
      await screenshot("history", 320); await screenshot("history", 1440);
      await h.db.query("update forge_lessons set visibility='private' where id=$1", [h.lesson]);
      h.state.user = { id: h.other, app_metadata: {} };
      const unavailable = renderToStaticMarkup(await historyRoute());
      assert.match(unavailable, /Unavailable lesson/);
      assert.doesNotMatch(unavailable, /Synthetic review lesson/);
      await assert.rejects(lessonRoute({ params: Promise.resolve({ slug: h.lesson, lesson: "1" }) }), /Not found/);
    });
    assert.deepEqual(network, []); assert.deepEqual(errors, []);
  });

  async function assertEventually(check) {
    for (let index = 0; index < 100; index++) {
      if (check()) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.fail("Synthetic action bridge did not reach its expected pending state");
  }
  await context.test("explicit review is idempotent and cannot grant attendance, passing or a certificate", async () => {
    await h.reset();
    const first = await a.reviewLesson(lesson, 1);
    assert.ok(first.progress.reviewedAt);
    assert.equal(first.progress.attendedAt, null);
    assert.equal(first.score, undefined); assert.equal(first.attemptId, undefined);
    assert.deepEqual((await a.reviewLesson(lesson, 1)).progress, first.progress);
    assert.match((await a.submitQuiz(lesson, 1, Array(10).fill(0))).error, /Reach the final quiz/);
    assert.equal((await db.query("select * from forge_attempts")).rows.length, 0);
  });
  await context.test("quiz attendance never requires review; server grades 5/10 then 6/10; retries retain a pass", async () => {
    await h.reset();
    const attendance = await a.attend(lesson, 1);
    assert.ok(attendance.progress.attendedAt); assert.equal(attendance.progress.reviewedAt, null);
    assert.deepEqual((await a.attend(lesson, 1)).progress, attendance.progress);
    for (const correct of [5, 6, 0]) {
      const result = await a.submitQuiz(lesson, 1, Array.from({ length: 10 }, (_, index) => index < correct ? 0 : 1));
      assert.equal(result.score, correct); assert.ok(result.attemptId);
    }
    const records = await h.server.userRecords(s.user);
    assert.deepEqual(lessonProgress(records.enrollments[0], records.attempts, lesson, 1), { ...attendance.progress, passed: true });
    assert.equal(records.attempts.length, 3);
    assert.match((await a.submitQuiz(lesson, 1, Array(9).fill(0))).error, /Please check/);
  });
  await context.test("lost, failed and malformed acknowledgements never claim success; replay preserves first timestamp", async () => {
    await h.reset(); s.fail = true;
    assert.match((await a.reviewLesson(lesson, 1)).error, /unconfirmed/);
    assert.deepEqual((await h.enrollment()).progress_evidence, {});
    s.fail = false; s.lose = true;
    const lost = await a.reviewLesson(lesson, 1);
    assert.match(lost.error, /may have saved/); assert.equal(lost.progress, undefined);
    const stored = versionEvidence(await h.enrollment(), 1);
    s.malformed = true;
    assert.equal((await a.reviewLesson(lesson, 1)).progress, undefined);
    s.malformed = false;
    assert.deepEqual((await a.reviewLesson(lesson, 1)).progress, stored);
    s.insertAck = false;
    await a.attend(lesson, 1);
    const quiz = await a.submitQuiz(lesson, 1, Array(10).fill(0));
    assert.match(quiz.error, /unconfirmed/); assert.equal(quiz.score, undefined);
  });
  await context.test("attendance response loss retries safely; concurrent review/attendance retain both independent fields", async () => {
    await h.reset(); s.lose = true;
    const unknown = await a.attend(lesson, 1);
    assert.equal(unknown.progress, undefined); assert.match(unknown.error, /may have saved/);
    const first = versionEvidence(await h.enrollment(), 1);
    assert.equal(first.reviewedAt, null); assert.ok(first.attendedAt);
    const [review, attendance] = await Promise.all([a.reviewLesson(lesson, 1), a.attend(lesson, 1)]);
    assert.ok(review.progress.reviewedAt);
    assert.equal(attendance.progress.attendedAt, first.attendedAt);
    assert.ok(versionEvidence(await h.enrollment(), 1).reviewedAt);
    assert.equal((await db.query("select * from forge_attempts")).rows.length, 0);
  });
  await context.test("version changes reject old requests and retain old evidence without attributing it to a new version", async () => {
    await h.reset();
    await a.reviewLesson(lesson, 1); await a.attend(lesson, 1);
    s.beforeRpc = () => db.query("update forge_lessons set version=2 where id=$1", [lesson]);
    assert.match((await a.reviewLesson(lesson, 1)).error, /unconfirmed/);
    assert.match((await a.reviewLesson(lesson, 1)).error, /updated/);
    assert.match((await a.submitQuiz(lesson, 1, Array(10).fill(0))).error, /updated/);
    assert.match((await a.submitQuiz(lesson, 2, Array(10).fill(0))).error, /Reach/);
    assert.equal(versionEvidence(await h.enrollment(), 2).reviewedAt, null);
    await a.reviewLesson(lesson, 2);
    assert.ok(versionEvidence(await h.enrollment(), 1).reviewedAt);
    assert.ok(versionEvidence(await h.enrollment(), 2).reviewedAt);
    assert.equal(versionEvidence(await h.enrollment(), 2).attendedAt, null);
  });
  await context.test("private, unenrolled, revoked, unauthenticated and direct owner tampering are denied", async () => {
    await h.reset(); s.user = { id: other, app_metadata: { role: "admin" } };
    for (const fn of [a.reviewLesson, a.attend]) assert.match((await fn(lesson, 1)).error, /unavailable/);
    await db.query("update forge_lessons set visibility='public' where id=$1", [lesson]);
    assert.match((await a.reviewLesson(lesson, 1)).error, /Enroll/);
    await db.query("insert into forge_enrollments(user_id,lesson_id) values($1,$2)", [other, lesson]);
    s.beforeRpc = () => db.query("update forge_lessons set visibility='private' where id=$1", [lesson]);
    assert.match((await a.reviewLesson(lesson, 1)).error, /unconfirmed/);
    assert.deepEqual((await db.query("select progress_evidence from forge_enrollments where user_id=$1", [other])).rows[0].progress_evidence, {});
    assert.deepEqual((await h.enrollment()).progress_evidence, {});
    s.user = null; assert.match((await a.reviewLesson(lesson, 1)).error, /log in/);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query("select * from forge_enrollments"), /permission denied/);
      await assert.rejects(db.query("update forge_enrollments set progress_evidence='{}'"), /permission denied/);
      await assert.rejects(db.query("select forge_record_progress($1,$2,1,'reviewed_at')", [owner, lesson]), /permission denied/);
      await db.exec("reset role");
    }
    await db.exec("set role service_role");
    assert.ok((await db.query("select forge_record_progress($1,$2,1,'reviewed_at') as evidence", [owner, lesson])).rows[0].evidence.reviewedAt);
    await assert.rejects(db.query("select forge_record_progress($1,$2,1,'passed')", [owner, lesson]), /Invalid evidence/);
    await db.exec("reset role");
  });
  await context.test("owner account cascade removes all versioned evidence", async () => {
    await db.query("delete from auth.users where id=$1", [owner]);
    assert.equal((await db.query("select * from forge_enrollments")).rows.length, 0);
    assert.equal((await db.query("select * from forge_attempts")).rows.length, 0);
  });
});
