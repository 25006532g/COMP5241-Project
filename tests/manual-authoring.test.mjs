import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { z } from "zod";
import { slides as slideLesson } from "./slide-authoring-harness.mjs";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith("@/lib/")) return next(new URL(`../src/lib/${specifier.slice(6)}.ts`, import.meta.url).href, context);
  return next(specifier, context);
} });
const learning = await import("../src/lib/learning.ts");
const recommendations = await import("../src/lib/recommendations.ts");
const permissions = await import("../src/lib/permissions.ts");
const resume = await import("../src/lib/resume.ts");
const curriculum = await import("../src/lib/curriculum.ts");
const demoLessons = await import("../src/lib/demo-lessons.ts");
const require = createRequire(import.meta.url);
const transpile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const sources = Object.fromEntries([
  ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
].map(([name, pkg, file]) => [name, readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
sources.editor = transpile("../src/components/learning-controls.tsx");
sources["./lesson-preview"] = transpile("../src/components/lesson-preview.tsx");
sources["./lesson-metadata"] = transpile("../src/components/lesson-metadata.tsx");
sources["@/lib/curriculum"] = transpile("../src/lib/curriculum.ts");
sources["@/lib/learning"] = transpile("../src/lib/learning.ts");
sources["./presentation.ts"]=transpile("../src/lib/presentation.ts");
sources["@/lib/demo-lessons"] = transpile("../src/lib/demo-lessons.ts");
sources["@/lib/permissions"] = transpile("../src/lib/permissions.ts");
sources.studio = transpile("../src/app/studio/page.tsx");
function bundleCjs(path) {
  if (sources[path]) return path;
  sources[path] = "loading";
  const localRequire = createRequire(path);
  sources[path] = readFileSync(path, "utf8").replace(/require\(["']([^"']+)["']\)/g, (_, name) => `require(${JSON.stringify(bundleCjs(localRequire.resolve(name)))})`);
  return path;
}
sources.zod = `module.exports = require(${JSON.stringify(bundleCjs(require.resolve("zod")))});`;
const fixture = {
  title: "Software requirements", subject: "Software Development Life Cycle", summary: "Capture testable software requirements.",
  metadata: { version: 1, audience: "learners", difficulty: "foundation", topic: "requirements", outcomes: ["Write testable requirements"], prerequisites: [] },
  slides: Array.from({ length: 4 }, () => ({ title: "Requirements", body: "Write testable requirements.", example: "A learner can save a draft." })),
  activity: { prompt: "Order the work", steps: ["Discover", "Describe", "Validate"] },
  questions: Array.from({ length: 10 }, () => ({ prompt: "Which is testable?", options: ["A", "B", "C", "D"], correct: 0, explanation: "A is measurable." })),
};
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace('@import "tailwindcss";', "");

test("mounted real studio: manual creation, same-ID editing and retained uncertain-save contracts", async context => {
  const unexpectedFetches = [];
  context.mock.method(globalThis, "fetch", async url => {
    unexpectedFetches.push(String(url));
    throw new Error("Unexpected fetch: offline lesson tests require an injected synthetic response.");
  });
  const rows = new Map(), calls = [];
  const user = { id: "00000000-0000-4000-8000-000000000001", app_metadata: {} };
  let signedIn = true, failSave = false, gate = null, loseAcknowledgement = false, aiAllowed = true, insertOutcome = null;
  let configured = true, profileError = null, insertError = null, quotaError = null, quotaAllowed = true;
  const quotaCalls = [];
  const providerCalls = [];
  let aiAccessChecks = 0;
  const server = {
    ...permissions, currentUser: async () => { if (!signedIn) throw new Error("Please log in again."); return user; },
    accessibleLesson: async (id, account, review = false) => {
      const row = rows.get(id);
      return row && (row.visibility === "public" || row.owner_id === account.id || review && permissions.isAdmin(account) && row.review_requested) ? row : null;
    },
    enrolledLesson: async (id, account) => {
      const row = await server.accessibleLesson(id, account);
      if (!row) throw new Error("Lesson not found or unavailable.");
      return row;
    },
    database: () => {
      if (!configured) throw new Error("Learning services are not configured.");
      return { from(table) {
      if (table === "profiles") {
        const query = { select(columns) { assert.equal(columns, "age"); return query; }, eq(column, id) { assert.equal(column, "id"); assert.equal(id, user.id); return query; },
          maybeSingle: async () => ({ data: { age: 18 }, error: profileError }) };
        return query;
      }
      assert.equal(table, "forge_lessons");
      let values, kind;
      const filters = {};
      const query = {
        insert(input) { kind = "insert"; values = input; return query; },
        update(input) { kind = "update"; values = input; return query; },
        select() { return query; }, eq(key, value) { filters[key] = value; return query; },
        async single() {
          if (gate) await gate;
          if (insertError) return { data: null, error: insertError };
          if (failSave) return { data: null, error: { code: "23514", message: "Synthetic constraint rejection" } };
          const id = `00000000-0000-4000-8000-${String(rows.size + 10).padStart(12, "0")}`;
          calls.push({ kind, id });
          rows.set(id, { ...values, id, version: 1 });
          if (insertOutcome === "throw-after-commit") throw new Error("PRIVATE_DB_ACK lost after commit");
          if (insertOutcome === "returned-error-after-commit") return { data: null, error: { code: "PGRST116", message: "PRIVATE_DB_ACK response unavailable" } };
          if (insertOutcome === "missing-data-after-commit") return { data: null, error: null };
          if (insertOutcome === "malformed-data-after-commit") return { data: { id: "PRIVATE_DB_ACK invalid id" }, error: null };
          return { data: { id }, error: null };
        },
        async maybeSingle() {
          if (failSave) return { data: null, error: { code: "23514" } };
          calls.push({ kind, ...filters });
          const row = rows.get(filters.id);
          if (!row || row.version !== filters.version) return { data: null, error: null };
          rows.set(row.id, { ...row, ...values });
          return { data: { id: row.id }, error: null };
        },
      };
      return query;
    }, async rpc(name, parameters) { quotaCalls.push({ name, parameters }); return { data: quotaAllowed, error: quotaError }; } };
    },
  };
  const dependencies = {
    "next/cache": { revalidatePath() {} }, zod: { z },
    "@/lib/learning-server": server, "@/lib/learning": learning,
    "@/lib/recommendations": recommendations, "@/lib/resume": resume,
    "@/lib/curriculum": curriculum,
    "@/lib/slide-lesson": slideLesson,
    "@/lib/openrouter": { coachReply: async (...args) => { providerCalls.push(args); return "Synthetic coach reply"; } },
    "@/lib/lesson-generation-server": { startGeneration: async () => { throw new Error("Staged generation is covered by the real-helper/PGlite and mounted-generation suites."); } },
    "@/lib/ai-eligibility-server": { requireAiAccess: async () => { aiAccessChecks++; if (!aiAllowed) throw new Error("AI access denied"); } },
  };
  const mod = { exports: {} };
  new Function("require", "module", "exports", transpile("../src/app/learning/actions.ts"))(
    name => { assert.ok(name in dependencies, name); return dependencies[name]; }, mod, mod.exports);
  const browser = await chromium.launch();
  const browserContext = await browser.newContext({ offline: true, serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  context.after(async () => { await browserContext.close(); await browser.close(); });
  const requests = [], browserErrors = [];
  const screenshots = await mkdtemp(join(tmpdir(), "forge-manual-qa01-"));
  context.diagnostic(`Synthetic studio screenshots captured (inspection reported separately): ${screenshots}; Chromium ${browser.version()}`);
  await browserContext.route("**/*", route => { requests.push(route.request().url()); return route.abort(); });
  async function mount(initial = fixture, admin = false, persisted = { id: "", version: 1 }, route = null) {
  const page = await browserContext.newPage();
  page.setDefaultTimeout(5000);
  page.on("pageerror", error => browserErrors.push(error.message));
  await page.exposeFunction("invokeAction", async (name, previous, entries) => {
    const form = new FormData();
    for (const [key, value] of entries) form.set(key, value);
    const result = await mod.exports[name](previous, form);
    if (loseAcknowledgement) throw new Error("Synthetic lost acknowledgement");
    return result;
  });
  await page.exposeFunction("studioServer", async (method, ...args) => {
    if (method === "requireUser") return server.currentUser();
    assert.equal(method, "accessibleLesson");
    return server.accessibleLesson(...args);
  });
  await page.setContent(`<style>${css}</style><main class="portal-page studio-editor"><div id="root"></div></main>`);
  try {
  await page.evaluate(async ({ sources, fixture, admin, persisted, route }) => {
    const modules = {};
    window.manualSettled = 0;
    function load(name) {
      if (name === "@/components/learning-controls") return load("editor");
      if (name === "@/components/create-lesson") return { SlideLessonEditor() { throw new Error("Slide authoring is covered by slide-authoring-ui.test.mjs"); } };
      if (name === "@/components/presentation-editor") return {PresentationLessonEditor(){throw new Error("Native presentation authoring is covered by presentation-ui.test.mjs");}};
      if (name === "@/lib/slide-lesson") return {};
      if (name === "@/components/lesson-metadata") return load("./lesson-metadata");
      if (name === "@/components/lesson-generation") return { LessonGeneration: () => load("react").createElement("p", {}, "Saved generation remains available (not exercised here).") };
      if (name === "@/components/learner-shell") return { LearnerShell: ({ children }) => load("react").createElement("main", {}, children) };
      if (name === "@/lib/learning-server") return { ...load("@/lib/permissions"), requireUser: async () => studioServer("requireUser"),
        accessibleLesson: async (...args) => studioServer("accessibleLesson", ...args), displayName: async () => "Synthetic author" };
      if (name === "next/navigation") return { notFound() { throw new Error("Not found"); } };
      if (name === "@/app/learning/actions") return new Proxy({}, { get: (_, action) => async (previous, form) => {
        try { return await invokeAction(action, previous, [...form.entries()]); }
        finally { window.manualSettled++; }
      } });
      if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => load("react").createElement("a", props, children) };
      if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (name.endsWith(".module.css")) return { __esModule: true, default: {} };
      if (!modules[name]) {
        if (!sources[name]) throw new Error(`Unexpected module ${name}`);
        const mod = { exports: {} }; modules[name] = mod;
        new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
      }
      return modules[name].exports;
    }
    load("react-dom/client").createRoot(document.getElementById("root")).render(route
      ? await load("studio").default({ searchParams: Promise.resolve(route) })
      : load("react").createElement(load("editor").LessonEditor, {
        ...persisted, initial: fixture, admin, action: load("@/app/learning/actions").createManualLesson,
      }));
  }, { sources, fixture: initial, admin, persisted, route });
  if (route && route.manual !== "1" && !route.edit) await page.getByRole("heading", { name: "Explore a new topic.", exact: true }).waitFor();
  else await page.locator('input[data-editor-ready="true"]').waitFor({ state: "attached" });
  return page;
  } catch (error) { await page.close(); throw error; }
  }
  const page = await mount();
  await page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Lesson created." }).waitFor();
  await page.getByLabel("Title", { exact: true }).fill("Updated software requirements");
  await page.getByRole("button", { name: "Save lesson", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector("fieldset").disabled);
  context.diagnostic(`Actual action writes: ${JSON.stringify(calls)}; rows=${rows.size}`);
  assert.equal(rows.size, 1, "second save must update the created lesson, not insert another");
  assert.deepEqual(calls.map(call => call.kind), ["insert", "update"]);
  assert.equal(calls[1].id, calls[0].id);
  assert.equal(calls[1].version, 1);
  assert.equal(rows.get(calls[0].id).version, 2);
  assert.equal(rows.get(calls[0].id).title, "Updated software requirements");

  await context.test("retained legacy starter fixtures are editable, private then same-ID/version saved (not Studio defaults)", async () => {
    aiAllowed = false;
    try {
      for (const [index, id] of demoLessons.DEMO_LESSON_IDS.entries()) {
        const starter = demoLessons.getDemoLessonStarter(id);
        const before = calls.length, beforeRows = rows.size, beforeAi = aiAccessChecks;
        const beforeProvider = providerCalls.length, beforeQuota = quotaCalls.length;
        const page = await mount(starter.content);
        try {
          await page.setViewportSize({ width: index === 0 ? 320 : 1440, height: 900 });
          assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), starter.content.title);
          assert.equal(await page.locator('select[name="subject"]').inputValue(), starter.content.subject);
          assert.equal(await page.locator('select[name="curriculumTopic"]').inputValue(), starter.content.metadata.topic);
          assert.equal(await page.locator('input[name="lessonId"]').inputValue(), "");
          assert.deepEqual(JSON.parse(await page.locator('input[name="content"]').inputValue()), starter.content);
          assert.equal(await page.getByLabel("Review and publish this lesson").count(), 0);
          assert.equal(calls.length, before, "selection must not write");
          assert.equal(rows.size, beforeRows);
          const reopened = await mount(starter.content);
          assert.equal(await reopened.locator('input[name="lessonId"]').inputValue(), "");
          assert.equal(calls.length, before, "reopening the URL must not save");
          await reopened.close();
          await page.getByLabel("Title", { exact: true }).fill(`Reviewed draft ${index + 1}`);
          assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), `Reviewed draft ${index + 1}`);
          assert.equal(calls.length, before);
          await page.getByRole("button", { name: "Save lesson", exact: true }).focus();
          await page.keyboard.press("Enter");
          await page.getByRole("status").filter({ hasText: "Lesson created." }).waitFor();
          const savedId = calls[before].id;
          const saved = rows.get(savedId);
          assert.equal(saved.visibility, "private");
          assert.equal(saved.published_at, null);
          assert.equal(saved.owner_id, user.id);
          assert.deepEqual(saved.content.slides, starter.content.slides, "reference slide survives the real save action");
          assert.deepEqual(saved.content.questions, starter.content.questions);
          await page.getByRole("button", { name: "Preview lesson", exact: true }).focus();
          await page.keyboard.press("Enter");
          const preview = page.getByRole("dialog");
          assert.deepEqual(await preview.locator(".lesson-text").allTextContents(),
            saved.content.slides.flatMap(slide => [slide.body, slide.example]));
          assert.deepEqual(await preview.locator(".lesson-text a").evaluateAll(links => links.map(link => ({
            text: link.textContent, href: link.getAttribute("href"), target: link.target, rel: link.rel,
          }))), starter.references.map(reference => ({
            text: reference.url, href: reference.url, target: "_blank", rel: "noopener noreferrer",
          })), "all three starters' saved sources are usable in the real full author preview");
          assert.equal(calls.length, before + 1, "opening preview must not write");
          await page.keyboard.press("Escape");
          assert.equal(await page.getByRole("button", { name: "Preview lesson", exact: true }).evaluate(element => element === document.activeElement), true);
          // Playwright label text includes an initially populated textarea's text node.
          await page.getByLabel(/^Summary/).fill(`${starter.content.summary} Reviewed locally.`);
          await page.getByRole("button", { name: "Save lesson", exact: true }).click();
          await page.getByRole("status").filter({ hasText: "Lesson saved." }).waitFor();
          assert.deepEqual(calls.slice(before).map(call => call.kind), ["insert", "update"]);
          assert.equal(calls[before + 1].id, savedId);
          assert.equal(calls[before + 1].version, 1);
          assert.equal(rows.get(savedId).version, 2);
          assert.equal(rows.size, beforeRows + 1);
          assert.equal(aiAccessChecks, beforeAi, "manual starters must not invoke AI eligibility or inference");
          assert.equal(providerCalls.length, beforeProvider);
          assert.equal(quotaCalls.length, beforeQuota);
          const width = index === 0 ? 320 : 1440;
          await page.getByLabel("Title", { exact: true }).scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(screenshots, `starter-editor-${id}-${width}.png`) });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        } finally { await page.close(); }
      }
    } finally { aiAllowed = true; }
  });

  await context.test("actual full author preview preserves equivalent encoded Unicode and rejects invalid UTF-8/controls without saving", async () => {
    const pairs = [
      ["https://example.org/\u8cc7\u6599", "https://example.org/%E8%B3%87%E6%96%99"],
      ["https://example.org/\ud83d\ude00?q=\u8cc7\u6599%20a%26b%3Dc#\u7bc0\ud83d\ude00",
        "https://example.org/%F0%9F%98%80?q=%E8%B3%87%E6%96%99%20a%26b%3Dc#%E7%AF%80%F0%9F%98%80"],
    ];
    for (const [literal, encoded] of pairs) assert.equal(new URL(literal).href, new URL(encoded).href);
    const urls = pairs.flat(), content = structuredClone(fixture);
    content.slides[0].body = `  References:\n${urls.join("\n")}\n `;
    content.slides[0].example = ["%E8%B3", "%C0%AF", "%ED%A0%80", "%F4%90%80%80", "%0A", "%7F", "%C2%80", "%E2%80%8B"]
      .map(suffix => `https://e.org/${suffix}`).join("\n");
    assert.deepEqual(learning.lessonSchema.parse(content), content, "fixture must fit the unchanged lesson limits");
    const before = calls.length, page = await mount(content);
    try {
      assert.deepEqual(JSON.parse(await page.locator('input[name="content"]').inputValue()), content);
      await page.getByRole("button", { name: "Preview lesson", exact: true }).click();
      const preview = page.getByRole("dialog");
      await preview.waitFor();
      assert.deepEqual((await preview.locator(".lesson-text").allTextContents()).slice(0, 2), [content.slides[0].body, content.slides[0].example]);
      assert.deepEqual(await preview.locator(".lesson-text a").evaluateAll(links => links.map(link => ({
        text: link.textContent, href: link.getAttribute("href"), target: link.target, rel: link.rel, policy: link.referrerPolicy,
      }))), urls.map(url => ({ text: url, href: url, target: "_blank", rel: "noopener noreferrer", policy: "no-referrer" })));
      await page.keyboard.press("Escape");
      assert.deepEqual(JSON.parse(await page.locator('input[name="content"]').inputValue()), content, "validation must never rewrite editor content");
      assert.equal(calls.length, before, "preview must not save");
    } finally { await page.close(); }
  });

  await context.test("persisted legacy edit precedence and owner isolation", async () => {
    const before = calls.length, beforeAi = aiAccessChecks;
    const row = rows.get(calls[0].id);
    const snapshot = structuredClone(row);
    for (const starter of ["coding-agent-4d", ["unknown", "sdlc-small-change"]]) {
      const page = await mount(undefined, false, undefined, { edit: row.id, manual: "1", starter });
      assert.deepEqual(JSON.parse(await page.locator('input[name="content"]').inputValue()), row.content);
      assert.equal(await page.locator('input[data-editor-ready="true"]').inputValue(), row.id);
      assert.equal(await page.locator('input[name="version"]').inputValue(), String(row.version));
      assert.equal(await page.getByRole("heading", { name: "Authored lesson starters" }).count(), 0);
      assert.equal(await page.getByRole("alert").count(), 0);
      await page.close();
    }
    assert.deepEqual(row, snapshot);
    row.owner_id = "foreign-owner";
    await assert.rejects(mount(undefined, false, undefined, { edit: row.id, manual: "1", starter: "sdlc-small-change" }), /Not found/);
    row.owner_id = snapshot.owner_id;
    await assert.rejects(mount(undefined, false, undefined, { edit: "missing", manual: "1", starter: "sdlc-small-change" }), /Not found/);
    assert.equal(calls.length, before);
    assert.equal(aiAccessChecks, beforeAi);
  });

  await context.test("starter publication retains learner denial and instructor owner permission", async () => {
    const content = demoLessons.getDemoLessonStarter("coding-agent-4d").content;
    const form = new FormData(); form.set("content", JSON.stringify(content)); form.set("publish", "on");
    const before = calls.length;
    assert.match((await mod.exports.createManualLesson({}, form)).error, /Instructor access required/);
    const existing = rows.get(calls[0].id);
    form.set("lessonId", existing.id); form.set("version", String(existing.version));
    assert.match((await mod.exports.updateLesson({}, form)).error, /Instructor access is required/);
    assert.equal(calls.length, before);
    user.app_metadata.role = "instructor";
    try {
      const page = await mount(content, true);
      assert.equal(await page.getByLabel("Review and publish this lesson").isChecked(), false, "even instructors start private");
      await page.getByRole("button", { name: "Save lesson", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Lesson created." }).waitFor();
      const id = calls.at(-1).id;
      assert.equal(rows.get(id).visibility, "private");
      await page.getByLabel("Review and publish this lesson").check();
      await page.getByRole("button", { name: "Save lesson", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Reviewed lesson published." }).waitFor();
      assert.equal(calls.at(-1).id, id);
      assert.equal(rows.get(id).visibility, "public");
      assert.equal(rows.get(id).version, 2);
      await page.close();
    } finally { delete user.app_metadata.role; }
  });

  await context.test("activity blank second line is formatting, not an empty saved step", async () => {
    const page = await mount();
    try {
      const raw = "Discover\n\nDescribe\nValidate";
      await page.getByLabel(/^Steps in correct order, one per line/).fill(raw);
      await page.getByRole("button", { name: "Save lesson", exact: true }).click();
      await page.waitForFunction(() => window.manualSettled === 1);
      assert.equal(await page.getByRole("alert").count(), 0,
        `Blank separator must save successfully, not: ${await page.getByRole("alert").allTextContents()}`);
      await page.getByRole("status").filter({ hasText: "Lesson created." }).waitFor();
      assert.deepEqual(rows.get(calls.at(-1).id).content.activity.steps, fixture.activity.steps);
      assert.equal(await page.getByLabel(/^Steps in correct order, one per line/).inputValue(), raw);
    } finally { await page.close(); }
  });

  const submittedSteps = async page => JSON.parse(await page.locator('input[name="content"]').inputValue()).activity.steps;
  async function leaveNotices(page) {
    return page.evaluate(() => {
      const notices = [];
      window.confirm = message => { notices.push(message); return false; };
      const link = document.createElement("a"); link.href = "/catalog";
      link.addEventListener("click", event => event.preventDefault());
      document.body.append(link); link.click(); link.remove();
      return notices;
    });
  }
  for (const width of [320, 1440]) {
    await context.test(`activity bounds focus the field without writes and preserve Enter/caret at ${width}px`, async () => {
      const page = await mount();
      try {
        await page.setViewportSize({ width, height: 900 });
        const field = page.getByLabel("Steps in correct order, one per line", { exact: true });
        const before = calls.length;
        for (const [raw, message, screenshot] of [
          ["\n\n", /Add 3 more nonempty steps/, "insufficient"],
          ["", /Add 3 more nonempty steps/],
          ["Discover\n \t\n", /Add 2 more nonempty steps/],
          ["Discover\nDescribe", /Add 1 more nonempty step/],
          [Array.from({ length: 7 }, (_, index) => `Step ${index + 1}`).join("\n"), /You have 7 steps/],
          [`Discover\n${"x".repeat(121)}\nValidate`, /Step 2 has 121 characters.*120/, "overlong"],
        ]) {
          await field.fill(raw);
          assert.equal(await field.getAttribute("aria-invalid"), "true");
          const feedback = await field.evaluate(element => document.getElementById(`${element.id}-error`).textContent);
          assert.match(feedback, message);
          assert.equal(await field.evaluate(element => element.getAttribute("aria-describedby").includes(`${element.id}-error`)), true);
          assert.match(await field.evaluate(element => element.validationMessage), message);
          await page.getByRole("button", { name: "Save lesson", exact: true }).focus();
          await page.keyboard.press("Enter");
          assert.equal(await field.evaluate(element => element === document.activeElement), true);
          assert.equal(await field.inputValue(), raw, "invalid input must not be cleared or truncated");
          assert.equal(calls.length, before);
          assert.equal(await page.evaluate(() => window.manualSettled), 0, "invalid steps should not invoke the action");
          if (screenshot) {
            await field.evaluate(element => element.scrollIntoView({ block: "center" }));
            await page.screenshot({ path: join(screenshots, `activity-${screenshot}-${width}.png`) });
          }
        }
        const boundary = ["x".repeat(120), "Second", "Third", "Fourth", "Fifth", "Sixth"];
        await field.fill(boundary.join("\n"));
        assert.equal(await field.evaluate(element => element.checkValidity()), true);
        assert.deepEqual(await submittedSteps(page), boundary, "six real steps and exactly 120 characters must remain intact");
        await field.fill("Discover\nDescribe");
        await field.press("End");
        await field.press("Enter");
        assert.equal(await field.inputValue(), "Discover\nDescribe\n", "Enter must survive the controlled rerender");
        assert.equal(await field.evaluate(element => element.selectionStart), "Discover\nDescribe\n".length);
        assert.deepEqual(await submittedSteps(page), ["Discover", "Describe"], "no fabricated third step");
        await page.keyboard.type("Validate");
        assert.equal(await field.inputValue(), fixture.activity.steps.join("\n"));
        assert.equal(await field.evaluate(element => element.selectionStart), fixture.activity.steps.join("\n").length);
        assert.equal(await field.getAttribute("aria-invalid"), "false");
        assert.equal(await field.evaluate(element => element.validationMessage), "");
        await field.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Question 1");
        await page.keyboard.press("Shift+Tab");
        assert.equal(await field.evaluate(element => element === document.activeElement), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      } finally { await page.close(); }
    });

    await context.test(`activity formatting, preview, create/update, dirty baseline and retained failure at ${width}px`, async () => {
      const page = await mount();
      try {
        await page.setViewportSize({ width, height: 900 });
        const field = page.getByLabel("Steps in correct order, one per line", { exact: true });
        for (const raw of [
          "Discover\n\nDescribe\nValidate",
          "\n\n Discover \n Describe \n Validate \n\n",
          "\t\n Discover \n \t \n Describe \n Validate \n ",
          "\r\n Discover \r\n \t\r\n Describe \r\n Validate \r\n",
        ]) {
          await field.fill(raw);
          assert.equal(await field.inputValue(), raw.replace(/\r\n/g, "\n"), "only the browser's CRLF conversion changes raw entry");
          assert.deepEqual(await submittedSteps(page), fixture.activity.steps);
          assert.equal(await field.evaluate(element => element.checkValidity()), true);
          assert.deepEqual(await leaveNotices(page), [], "formatting alone must not mark canonical content dirty");
          await page.getByRole("button", { name: "Preview lesson", exact: true }).focus();
          await page.keyboard.press("Enter");
          const practice = page.getByRole("dialog").locator("section").filter({ has: page.getByText("PRACTICE", { exact: true }) });
          assert.deepEqual(await practice.locator("li").allTextContents(), await submittedSteps(page));
          await practice.scrollIntoViewIfNeeded();
          if (raw.includes("\r\n")) await page.screenshot({ path: join(screenshots, `activity-preview-${width}.png`) });
          await page.keyboard.press("Escape");
          assert.equal(await page.getByRole("button", { name: "Preview lesson", exact: true }).evaluate(element => element === document.activeElement), true);
        }
        const raw = await field.inputValue(), before = calls.length;
        await page.getByRole("button", { name: "Save lesson", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByRole("status").filter({ hasText: "Lesson created." }).waitFor();
        const id = calls.at(-1).id;
        assert.deepEqual(rows.get(id).content.activity.steps, await submittedSteps(page));
        assert.equal(await field.inputValue(), raw);
        assert.deepEqual(await leaveNotices(page), [], "confirmed normalized save establishes the clean baseline");

        const changed = ["Discover", "Describe  a test", "Validate"];
        const changedRaw = `\n ${changed[0]} \n\n ${changed[1]} \n ${changed[2]} \n`;
        await field.fill(changedRaw);
        assert.equal((await leaveNotices(page)).length, 1, "meaningful edits must remain dirty");
        failSave = true;
        await page.getByRole("button", { name: "Save lesson", exact: true }).click();
        await page.getByRole("alert").waitFor();
        assert.equal(await page.getByRole("alert").evaluate(element => element === document.activeElement), true);
        assert.equal(await field.inputValue(), changedRaw);
        assert.deepEqual(await submittedSteps(page), changed, "internal spaces are meaningful, not collapsed");
        assert.equal((await leaveNotices(page)).length, 1, "failure must not change the saved baseline");
        assert.deepEqual(rows.get(id).content.activity.steps, fixture.activity.steps);
        failSave = false;
        await page.getByRole("button", { name: "Save lesson", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByRole("status").filter({ hasText: "Lesson saved." }).waitFor();
        assert.deepEqual(calls.slice(before).map(call => call.kind), ["insert", "update"]);
        assert.equal(calls.at(-1).id, id);
        assert.equal(rows.get(id).version, 2);
        assert.deepEqual(rows.get(id).content.activity.steps, changed);
        assert.equal(await field.inputValue(), changedRaw);
        assert.deepEqual(await leaveNotices(page), []);
        await field.fill(`${changed.join("\n")}\n\n`);
        assert.deepEqual(await leaveNotices(page), [], "formatting after update must not re-dirty the lesson");
        await page.getByRole("button", { name: "Preview lesson", exact: true }).click();
        assert.deepEqual(await page.getByRole("dialog").locator("section").filter({ has: page.getByText("PRACTICE", { exact: true }) }).locator("li").allTextContents(), changed);
      } finally { failSave = false; await page.close(); }
    });
  }

  await context.test("retained legacy blank editor reveals incomplete ten-question quiz, then keyboard create and same-ID save", async () => {
    for (const width of [320, 1440]) {
      const page = await mount({
        title: "", subject: "", summary: "",
        slides: Array.from({length:4},() => ({title:"",body:"",example:""})),
        activity:{prompt:"",steps:["","",""]},
        questions:Array.from({length:10},() => ({prompt:"",options:["","","",""],correct:0,explanation:""})),
      });
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.getByLabel("Steps in correct order, one per line", { exact: true }).inputValue(), "\n\n");
      assert.deepEqual(await submittedSteps(page), [], "the raw empty default must not invent real steps");
      await page.getByLabel("Title", { exact: true }).fill(fixture.title);
      await page.locator('select[name="subject"]').selectOption(fixture.subject);
      await page.locator('select[name="curriculumTopic"]').selectOption(fixture.metadata.topic);
      await page.locator('select[name="audience"]').selectOption(fixture.metadata.audience);
      await page.locator('select[name="difficulty"]').selectOption(fixture.metadata.difficulty);
      await page.getByLabel("Learning outcomes", { exact: true }).fill(fixture.metadata.outcomes.join("\n"));
      await page.getByLabel("Summary", { exact: true }).fill(fixture.summary);
      for (let index = 0; index < 4; index++) {
        for (const field of ["title", "body", "example"]) await page.getByRole("group", { name: `Slide ${index + 1}`, exact: true }).getByLabel(field, { exact: true }).fill(fixture.slides[index][field]);
      }
      await page.getByLabel("Prompt", { exact: true }).fill(fixture.activity.prompt);
      await page.getByLabel("Steps in correct order, one per line", { exact: true }).fill(fixture.activity.steps.join("\n"));
      await page.getByRole("button", { name: "Save lesson", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelector("details").open);
      assert.equal(await page.locator("details").first().getByLabel("Question", { exact: true }).evaluate(element => element === document.activeElement), true);
      assert.equal(await page.getByRole("alert").count(), 0, "native validation should identify incomplete quiz before a server round trip");
      await page.locator("details").first().getByLabel("Question", { exact: true }).evaluate(element => element.scrollIntoView({ block: "center" }));
      await page.screenshot({ path: join(screenshots, `blank-quiz-${width}.png`) });
      for (let index = 0; index < 10; index++) {
        const question = page.locator("form > fieldset > details").nth(index);
        await question.evaluate(element => { element.open = true; });
        await question.getByLabel("Question", { exact: true }).fill(fixture.questions[index].prompt);
        for (let option = 0; option < 4; option++) await question.getByLabel(`Option ${option + 1}`, { exact: true }).fill(fixture.questions[index].options[option]);
        await question.getByLabel("Explanation", { exact: true }).fill(fixture.questions[index].explanation);
      }
      const before = calls.length;
      aiAllowed = false; // Manual creation must not use the AI gate or provider.
      await page.getByRole("button", { name: "Save lesson", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("status").filter({ hasText: "Lesson created." }).waitFor();
      await page.getByLabel("Title", { exact: true }).fill("Blank route updated lesson");
      await page.getByRole("button", { name: "Save lesson", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.getByRole("status").filter({ hasText: "Lesson saved." }).waitFor();
      assert.deepEqual(calls.slice(before).map(call => call.kind), ["insert", "update"]);
      assert.equal(calls[before].id, calls[before + 1].id);
      assert.equal(rows.get(calls[before].id).version, 2);
      assert.deepEqual(rows.get(calls[before].id).content.metadata.prerequisites, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: join(screenshots, `blank-saved-${width}.png`) });
      aiAllowed = true;
      await page.close();
    }
  });
  await context.test("all families choose metadata, preview, create and update the confirmed ID", async () => {
    for (const [family, subject] of Object.entries(curriculum.FAMILIES)) {
      const page = await mount({ ...fixture, subject: "", metadata: undefined });
      await page.locator('select[name="subject"]').selectOption(subject);
      await page.locator('select[name="curriculumTopic"]').selectOption(family === "sdlc" ? "testing" : family);
      await page.locator('select[name="audience"]').selectOption("both");
      await page.locator('select[name="difficulty"]').selectOption("intermediate");
      await page.getByLabel("Learning outcomes", { exact: true }).fill("Evaluate a software example");
      await page.getByLabel("Prerequisites", { exact: true }).fill("Read the project brief");
      await page.getByRole("button", { name: "Preview lesson", exact: true }).click();
      const dialog = page.getByRole("dialog");
      assert.ok((await dialog.innerText()).includes(subject));
      assert.ok((await dialog.innerText()).includes("Intermediate"));
      assert.ok(!(await dialog.innerText()).includes("A is measurable."));
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.textContent === "Preview lesson");
      const before = calls.length;
      await page.getByRole("button", { name: "Save lesson", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Lesson created." }).waitFor();
      await page.getByLabel("Title", { exact: true }).fill(`Updated ${family} lesson`);
      await page.getByRole("button", { name: "Save lesson", exact: true }).click();
      await page.getByRole("status").filter({ hasText: "Lesson saved." }).waitFor();
      assert.deepEqual(calls.slice(before).map(call => call.kind), ["insert", "update"]);
      const row = rows.get(calls[before].id);
      assert.equal(row.subject, subject);
      assert.equal(row.content.subject, subject);
      assert.deepEqual(row.content.metadata.prerequisites, ["Read the project brief"]);
      assert.equal(row.content.metadata.audience, "both");
      assert.equal(row.version, 2);
      await page.close();
    }
  });
  // Staged AI persistence/response loss is exercised by lesson-generation*.test.mjs
  // against the real server helpers, complete migrations and network-blocked UI.
  await context.test("manual storage configuration and definite schema rejections remain retryable", async () => {
    const form = new FormData(); form.set("content", JSON.stringify(fixture));
    configured = false;
    assert.equal((await mod.exports.createManualLesson({}, form)).error, "Learning services are not configured.");
    configured = true;
    for (const code of ["42P01", "42703", "PGRST204", "PGRST205"]) {
      insertError = { code, message: "PRIVATE missing lesson storage" };
      const result = await mod.exports.createManualLesson({}, form);
      assert.equal(result.error, "Lesson storage is unavailable. Check the learning database migrations and schema cache, then try again. Nothing was saved.");
      assert.equal(result.saveUncertain, undefined);
    }
    insertError = null;
  });
  await context.test("failed save retains input, focuses error and allows explicit retry; stale version cannot overwrite", async () => {
    const page = await mount();
    failSave = true;
    await page.getByLabel("Title", { exact: true }).fill("Retain this unsaved title");
    await page.getByRole("button", { name: "Save lesson", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Retain this unsaved title");
    assert.equal(await page.getByRole("alert").evaluate(element => element === document.activeElement), true);
    failSave = false;
    assert.equal(await page.locator("form").evaluate(form => form.checkValidity()), true);
    await page.getByRole("button", { name: "Save lesson", exact: true }).click();
    await page.getByRole("status").waitFor();
    const id = calls.at(-1).id;
    rows.get(id).version = 3;
    await page.getByLabel("Title", { exact: true }).fill("Stale title retained");
    await page.getByRole("button", { name: "Save lesson", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "changed in another session" }).waitFor();
    assert.equal(rows.get(id).title, "Retain this unsaved title");
    assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Stale title retained");
    await page.close();
  });
  await context.test("pending protection blocks same-tick duplicate submit; uncertain acknowledgement never replays", async () => {
    let release;
    gate = new Promise(resolve => { release = resolve; });
    const page = await mount();
    const before = calls.length;
    await page.locator("form").evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
    await page.getByRole("button", { name: "Working..." }).waitFor();
    assert.equal(await page.getByLabel("Title", { exact: true }).isDisabled(), true);
    release(); gate = null;
    await page.getByRole("status").waitFor();
    assert.equal(calls.length, before + 1);
    await page.close();
    const uncertain = await mount();
    loseAcknowledgement = true;
    const count = calls.length;
    await uncertain.getByRole("button", { name: "Save lesson", exact: true }).click();
    await uncertain.getByRole("alert").filter({ hasText: "Save outcome is unknown" }).waitFor();
    assert.equal(await uncertain.getByRole("button", { name: "Save lesson", exact: true }).isDisabled(), true);
    await uncertain.locator("form").evaluate(form => form.requestSubmit());
    assert.equal(calls.length, count + 1);
    assert.equal(await uncertain.getByLabel("Title", { exact: true }).inputValue(), fixture.title);
    assert.equal(await uncertain.getByRole("status").count(), 0);
    assert.equal(await uncertain.getByRole("link", { name: "Check my private lessons (new tab)", exact: true }).getAttribute("href"), "/catalog?visibility=private");
    assert.ok(!(await uncertain.getByRole("alert").innerText()).includes("Synthetic lost acknowledgement"));
    loseAcknowledgement = false;
    await uncertain.close();
  });
  for (const outcome of ["throw-after-commit", "returned-error-after-commit", "missing-data-after-commit", "malformed-data-after-commit"]) {
    await context.test(`QA-MANUAL-01: ${outcome} retains draft and blocks a second create`, async () => {
      const page = await mount();
      const before = calls.length, beforeRows = rows.size;
      insertOutcome = outcome;
      try {
        await page.getByLabel("Title", { exact: true }).fill("Retained acknowledgement-uncertain draft");
        await page.getByRole("button", { name: "Save lesson", exact: true }).click();
        await page.waitForFunction(() => window.manualSettled === 1);
        await page.getByRole("alert").waitFor();
        const enabledRetry = await page.getByRole("button", { name: "Save lesson", exact: true }).isEnabled();
        // Before repair this is a real, explicit UI retry, not two direct action calls.
        if (enabledRetry) {
          await page.getByRole("button", { name: "Save lesson", exact: true }).click();
          await page.waitForFunction(() => window.manualSettled === 2);
        }
        context.diagnostic(`${outcome}: retry enabled=${enabledRetry}, inserts=${calls.length - before}, rows=${rows.size - beforeRows}`);
        assert.equal(rows.size - beforeRows, 1, "ambiguous acknowledgement must not permit another creation");
        assert.equal(enabledRetry, false, "ambiguous creation must remain blocked pending reconciliation");
        assert.equal(await page.locator('input[name="lessonId"]').inputValue(), "");
        assert.equal(await page.getByLabel("Title", { exact: true }).inputValue(), "Retained acknowledgement-uncertain draft");
        assert.equal(await page.getByRole("status").count(), 0);
        assert.ok(!(await page.getByRole("alert").innerText()).includes("PRIVATE_DB_ACK"));
        const recovery = page.getByRole("link", { name: "Check my private lessons (new tab)", exact: true });
        assert.equal(await recovery.getAttribute("href"), "/catalog?visibility=private");
        assert.equal(await recovery.getAttribute("target"), "_blank");
        assert.equal(await page.getByRole("alert").evaluate(element => element === document.activeElement), true);
        await page.evaluate(() => {
          window.confirmations = [];
          window.confirm = message => { window.confirmations.push(message); return false; };
        });
        // Exercise the recovery link's real document-level leave guard without navigating.
        await recovery.evaluate(link => {
          link.addEventListener("click", event => event.preventDefault(), { once: true });
          link.click();
        });
        assert.deepEqual(await page.evaluate(() => window.confirmations), [], "opening recovery in a new tab must not claim unsaved content or discard the draft");
        await page.evaluate(() => {
          const link = document.createElement("a");
          link.href = "/catalog";
          document.body.append(link);
          link.addEventListener("click", event => event.preventDefault());
          link.click();
          link.remove();
        });
        const [leaveNotice] = await page.evaluate(() => window.confirmations);
        assert.match(leaveNotice, /save outcome is unknown/i);
        assert.ok(!leaveNotice.includes("unsaved lesson changes"));
        await page.locator("form").evaluate(form => form.requestSubmit());
        assert.equal(calls.length - before, 1);
        if (outcome === "throw-after-commit") {
          await recovery.scrollIntoViewIfNeeded();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.screenshot({ path: join(screenshots, "uncertain-create-mobile.png") });
          await page.setViewportSize({ width: 1280, height: 900 });
          await recovery.scrollIntoViewIfNeeded();
          await page.screenshot({ path: join(screenshots, "uncertain-create-desktop.png") });
          // Explicit reconciliation opens the canonical saved representation in a fresh editor;
          // the unknown editor itself is never unlocked, replayed, or assigned a guessed ID.
          const saved = await server.accessibleLesson(calls[before].id, user);
          insertOutcome = null;
          const reconciled = await mount(saved.content, false, { id: saved.id, version: saved.version });
          await reconciled.getByLabel("Title", { exact: true }).fill("Reconciled saved draft");
          await reconciled.getByRole("button", { name: "Save lesson", exact: true }).click();
          await reconciled.getByRole("status").filter({ hasText: "Lesson saved." }).waitFor();
          assert.equal(rows.size - beforeRows, 1);
          assert.deepEqual(calls.slice(before).map(call => call.kind), ["insert", "update"]);
          assert.equal(calls.at(-1).id, saved.id);
          assert.equal(rows.get(saved.id).version, 2);
          assert.equal(await page.getByRole("button", { name: "Save lesson", exact: true }).isDisabled(), true);
          await reconciled.close();
        }
      } finally {
        insertOutcome = null;
        await page.close();
      }
    });
  }
  const formFor = (content = fixture, extra = {}) => {
    const form = new FormData(); form.set("content", JSON.stringify(content));
    for (const [key, value] of Object.entries(extra)) form.set(key, value);
    return form;
  };
  await context.test("direct create/update tampering still rejects empty, too few/many and overlong activity steps", async () => {
    const before = calls.length, row = rows.get(calls[0].id), saved = structuredClone(row);
    for (const steps of [[], ["Discover", "", "Validate"], ["Discover", "Describe"],
      Array(7).fill("Real step"), ["Discover", "x".repeat(121), "Validate"]]) {
      const content = { ...fixture, activity: { ...fixture.activity, steps } };
      for (const [action, extra] of [["createManualLesson", {}], ["updateLesson", { lessonId: row.id, version: row.version }]]) {
        const result = await mod.exports[action]({}, formFor(content, extra));
        assert.match(result.error, /Please check activity.steps/);
        assert.equal(result.success, undefined);
        assert.equal(result.saveUncertain, undefined);
      }
    }
    assert.equal(calls.length, before, "server bounds must reject before any write");
    assert.deepEqual(row, saved);
  });
  await context.test("actual create/update actions reject forged metadata, anonymous, foreign ownership and publishing", async () => {
    const before = calls.length;
    for (const content of [{ ...fixture, metadata: undefined }, { ...fixture, subject: "Biology" },
      { ...fixture, metadata: { ...fixture.metadata, topic: "coding-agents" } }, { ...fixture, metadata: { ...fixture.metadata, outcomes: [] } }]) {
      assert.ok((await mod.exports.createManualLesson({}, formFor(content))).error);
    }
    signedIn = false;
    assert.ok((await mod.exports.createManualLesson({}, formFor())).error);
    signedIn = true;
    assert.ok((await mod.exports.createManualLesson({}, formFor(fixture, { publish: "on" }))).error);
    const row = rows.get(calls[0].id);
    row.owner_id = "foreign-owner";
    assert.ok((await mod.exports.updateLesson({}, formFor(fixture, { lessonId: row.id, version: row.version }))).error);
    row.visibility = "public"; user.app_metadata.role = "instructor";
    assert.ok((await mod.exports.updateLesson({}, formFor(fixture, { lessonId: row.id, version: row.version }))).error);
    assert.equal(calls.length, before);
    user.app_metadata.role = "admin"; row.visibility = "private";
    assert.ok((await mod.exports.updateLesson({}, formFor(fixture, { lessonId: row.id, version: row.version }))).error);
    row.review_requested = true;
    assert.ok((await mod.exports.updateLesson({}, formFor(fixture, { lessonId: row.id, version: row.version, publish: "on" }))).success);
    delete user.app_metadata.role;
  });
  await context.test("coach actions resolve each family and deny private access, unsupported scope or revoked AI", async () => {
    for (const [family, subject] of Object.entries(curriculum.FAMILIES)) {
      const form = formFor();
      const topic = family === "sdlc" ? "testing" : family;
      for (const [key, value] of Object.entries({ subject, curriculumTopic: topic, audience: "learners", difficulty: "foundation", outcomes: "Apply a software skill", prerequisites: "", topic: "Synthetic objective" })) form.set(key, value);
      form.set("content", JSON.stringify({ ...fixture, subject, metadata: { ...fixture.metadata, topic } }));
      const result = await mod.exports.createManualLesson({}, form);
      assert.ok(result.success);
      assert.ok((await mod.exports.askCoach(result.lessonId, [{ role: "user", content: "Explain the example" }])).reply);
      assert.equal(providerCalls.at(-1)[0].subject, subject);
      assert.equal(providerCalls.at(-1)[0].topic, topic);
      assert.equal("questions" in providerCalls.at(-1)[0], false);
      aiAllowed = false;
      const before = providerCalls.length;
      assert.ok((await mod.exports.askCoach(result.lessonId, [{ role: "user", content: "Explain" }])).error);
      assert.equal(providerCalls.length, before);
      aiAllowed = true;
      rows.get(result.lessonId).owner_id = "foreign-owner";
      assert.ok((await mod.exports.askCoach(result.lessonId, [{ role: "user", content: "Explain" }])).error);
      rows.get(result.lessonId).owner_id = user.id;
      rows.get(result.lessonId).subject = "Biology";
      assert.ok((await mod.exports.askCoach(result.lessonId, [{ role: "user", content: "Explain" }])).error);
      assert.equal(providerCalls.length, before);
    }
  });
  assert.deepEqual(requests, []);
  assert.deepEqual(unexpectedFetches, [], "Node-side provider requests must use synthetic fetch only");
  assert.deepEqual(browserErrors, [], "handled failures must not crash the mounted form");
});
