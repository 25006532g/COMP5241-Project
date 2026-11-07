import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { harness } from "./lesson-generation-harness.mjs";
import {sources as presentationSources} from "./presentation-browser-harness.mjs";

// Offline mounts of the real async route functions and client components. No app server,
// environment files, connected database, provider, mail, or image requests are permitted.
// Saved generation uses real actions/helpers backed only by local in-memory PGlite.
const require = createRequire(import.meta.url);
const sources = Object.fromEntries([
  ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
].map(([name, pkg, file]) => [name, readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
function add(name, file) {
  sources[name] = ts.transpileModule(readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}
for (const name of ["learning", "curriculum", "slide-lesson", "demo-lessons", "recommendations", "resume", "lesson-generation","presentation"]) add(`@/lib/${name}`, `lib/${name}.ts`);
sources["./presentation.ts"]=sources["./presentation"]=sources["@/lib/presentation"];
sources["./learning"] = sources["@/lib/learning"];
sources["./curriculum"] = sources["@/lib/curriculum"];
for (const name of ["create-lesson", "learning-controls", "lesson-metadata", "lesson-preview", "catalog-search", "learning-path", "lesson-generation"]) {
  add(`@/components/${name}`, `components/${name}.tsx`);
  sources[`./${name}`] = sources[`@/components/${name}`];
}
for (const [name, file] of Object.entries({ catalog: "catalog/page.tsx", overview: "courses/[slug]/page.tsx", player: "courses/[slug]/lessons/[lesson]/page.tsx", paths: "paths/page.tsx", studio: "studio/page.tsx", teaching: "teaching/page.tsx" })) add(name, `app/${file}`);
Object.assign(sources,presentationSources);
sources["@/components/presentation-editor"]=sources["./presentation-editor"]=sources.editor;
function bundleCjs(path) {
  if (sources[path]) return path;
  sources[path] = "loading";
  const localRequire = createRequire(path);
  sources[path] = readFileSync(path, "utf8").replace(/require\(["']([^"']+)["']\)/g, (_, name) => `require(${JSON.stringify(bundleCjs(localRequire.resolve(name)))})`);
  return path;
}
sources.zod = `module.exports = require(${JSON.stringify(bundleCjs(require.resolve("zod")))});`;
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace('@import "tailwindcss";', "") +
  readFileSync(new URL("../src/components/lesson-metadata.module.css", import.meta.url), "utf8") +
  readFileSync(new URL("../src/components/lesson-generation.module.css", import.meta.url), "utf8");

test("real curriculum routes and components: combined filters, legacy, player, paths and mobile keyboard", async context => {
  const h = await harness(); context.after(h.close);
  const fetches = [];
  context.mock.method(globalThis, "fetch", async url => { fetches.push(String(url)); throw new Error("Network forbidden"); });
  const browser = await chromium.launch();
  const browserContext = await browser.newContext({ offline: true, serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  context.after(async () => { await browserContext.close(); await browser.close(); });
  const requests = [], errors = [];
  await browserContext.route("**/*", route => {
    if (route.request().url() === "https://forge-curriculum.synthetic/") {
      return route.fulfill({ contentType: "text/html", body: `<style>${css}</style><div id="root"></div>` });
    }
    requests.push(route.request().url()); return route.abort();
  });
  const page = await browserContext.newPage();
  page.setDefaultTimeout(5000);
  page.on("pageerror", error => errors.push(error.message));
  const screenshots = await mkdtemp(join(tmpdir(), "forge-tracker08-"));
  context.diagnostic(`Captured synthetic screenshots (not visual approval): ${screenshots}; Chromium ${browser.version()}`);
  await page.exposeFunction("invokeCurriculumGeneration", async (name, args) => {
    if (name === "createLesson" || name === "importTeachingMaterial") {
      const form = new FormData();
      for (const [key, value] of args) {
        form.set(key, key === "material" ? new File(["synthetic extraction fixture"], "synthetic.pdf", { type: "application/pdf" }) : value);
      }
      return (name === "createLesson" ? h.learningActions.createLesson : h.teachingActions.importTeachingMaterial)({}, form);
    }
    assert.ok(Object.hasOwn(h.actions, name), `Unexpected generation action ${name}`);
    return h.actions[name](...args);
  });
  await page.goto("https://forge-curriculum.synthetic/");
  await page.addScriptTag({path:join(process.cwd(),"node_modules/fabric/dist/index.min.js")});
  await page.evaluate(async sources => {
    const modules = {};
    let renderRoute, rows, currentRoute = 0;
    const user = { id: "synthetic-owner", app_metadata: { role: "instructor" } };
    const server = {
      requireUser: async () => user, displayName: async () => "Synthetic instructor",
      isAdmin: () => false, isInstructor: () => true, canPublishLessons: () => true,
      canEditLesson: (_, row) => row.owner_id === user.id, canManageEnrollment: () => true,
      visibleLessons: async () => rows.map(({ content, ...row }) => ({ ...row, metadata: content.metadata })),
      accessibleLesson: async id => structuredClone(rows.find(row => row.id === id)),
      userRecords: async () => ({ enrollments: [], bookmarks: [], attempts: [] }),
      database: () => ({ from(table) {
        const query = { select() { return query; }, eq() { return query; }, gte() { return query; }, order() { return query; }, or() { return query; },
          range: async () => ({ data: [], error: null }),
          maybeSingle: async () => ({ data: table === "profiles" ? { display_name: "Synthetic", learning_level: "intermediate" } : table === "forge_enrollments" ? { lesson_id: "enrolled" } : null, error: null }) };
        return query;
      } }),
    };
    const auth = { createClient: async () => ({ auth: { getUser: async () => ({ data: { user }, error: null }) } }) };
    const generationActions = new Proxy({}, { get: (_, name) => async (...args) => {
      if (name === "createLesson" || name === "importTeachingMaterial") {
        return window.invokeCurriculumGeneration(name, [...args[1].entries()].map(([key, value]) => [key, typeof value === "string" ? value : { filename: value.name }]));
      }
      return window.invokeCurriculumGeneration(name, args);
    } });
    const actions = new Proxy({}, { get: (_, name) => async (...args) => {
      if (name === "createLesson" || name === "importTeachingMaterial") return generationActions[name](...args);
      if (name === "saveResume") return { revision: 1 };
      if (name === "attend") return { success: "Attendance recorded." };
      return { error: "Synthetic unavailable service. Input is retained." };
    } });
    function load(name) {
      if(name==="fabric")return fabric;
      if (name.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
      if (name === "@/lib/learning-server") return server;
      if (name === "@/lib/supabase/server") return auth;
      if (name === "@/lib/ai-eligibility-server") return { requireAiAccess: async () => {} };
      if (name === "@/components/learner-shell") return { LearnerShell: ({ children }) => load("react").createElement("main", {}, children) };
      if (name === "@/components/learner-import" || name === "@/components/lesson-coach") return new Proxy({}, { get: () => () => null });
      if (name === "@/app/learning/generation-actions") return generationActions;
      if (name === "@/app/presentation/ai-actions") return {
        generatePresentationSuggestions: async () => ({ error: "Synthetic unavailable service. Input is retained." }),
        authorizePresentationAiApply: async () => ({ error: "Synthetic unavailable service. Input is retained." }),
      };
      if (name.endsWith("/actions") || name === "./actions") return actions;
      if (name === "next/navigation") return { useRouter: () => ({refresh(){}}), notFound() { throw new Error("Not found"); }, redirect(path) { throw new Error(`Redirect ${path}`); } };
      if (name === "next/image") return { __esModule: true, default: () => null };
      if (name === "next/link") return { __esModule: true, default: ({ children, href, ...props }) => load("react").createElement("a", { ...props, href, onClick(event) { event.preventDefault(); if (href === "/catalog") void renderRoute("catalog"); } }, children) };
      if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (!modules[name]) {
        if (!sources[name]) throw new Error(`Unexpected offline dependency ${name}`);
        const mod = { exports: {} }; modules[name] = mod;
        new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
      }
      return modules[name].exports;
    }
    const { FAMILIES } = load("@/lib/curriculum");
    rows = Object.entries(FAMILIES).map(([family, subject], index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, owner_id: user.id,
      title: `Synthetic ${family} lesson`, subject, summary: "Practice a useful software-development skill", visibility: index === 1 ? "private" : "public", version: 1,
      content: { title: `Synthetic ${family} lesson`, subject, summary: "Practice a useful software-development skill",
        metadata: { version: 1, audience: "both", difficulty: "intermediate", topic: family === "sdlc" ? "testing" : family, outcomes: [`Apply ${family} concepts`], prerequisites: [] },
        slides: Array(4).fill({ title: "Synthetic slide", body: "Explain the software example.", example: "Review a proposed change." }),
        activity: { prompt: "Order the work", steps: ["Plan", "Act", "Review"] },
        questions: Array(10).fill({ prompt: "Which option fits?", options: ["A", "B", "C", "D"], correct: 2, explanation: "SECRET_ANSWER_KEY" }),
      },
    }));
    rows.push({ ...structuredClone(rows[0]), id: "00000000-0000-4000-8000-000000000004", title: "Legacy lesson", subject: "SDLC" });
    delete rows[3].content.metadata;
    const root = load("react-dom/client").createRoot(document.getElementById("root"));
    const React = load("react");
    renderRoute = async (name, filters = {}, index = 0) => {
      const element = await load(name).default({ searchParams: Promise.resolve(filters), params: Promise.resolve({ slug: rows[index].id, lesson: "1" }) });
      if (name === "player") {
        const collect = node => {
          if (!node || typeof node !== "object") return;
          if (node.type === load("@/components/learning-controls").LessonPlayer) window.lastPlayerProps = structuredClone(node.props);
          React.Children.forEach(node.props?.children, collect);
        };
        collect(element);
      }
      // Resolving an async route does not mean React has committed root.render().
      // Complete the offline render before callers assert against the next page.
      load("react-dom").flushSync(() => root.render(React.createElement(React.Fragment, { key: ++currentRoute }, element)));
    };
    document.addEventListener("submit", event => {
      const form = event.target;
      if (form.getAttribute("action") === "/catalog") {
        event.preventDefault();
        void renderRoute("catalog", Object.fromEntries(new FormData(form)));
      }
    });
    window.curriculumUi = { renderRoute, rows, load, root, async pathWithCompleted() {
      load("react-dom").flushSync(() => root.render(React.createElement(load("@/components/learning-path").LearningPath, {
        catalog: rows.map(row => ({ ...row, metadata: row.content.metadata })), completedIds: [rows[0].id],
        initialPreferences: load("@/lib/recommendations").derivePreferences({ level: "intermediate" }), aiAvailable: false,
      })));
    } };
    await renderRoute("catalog");
  }, sources);
  const cards = page.locator(".catalog-card");
  await cards.nth(3).waitFor();
  assert.equal(await cards.count(), 4);
  assert.ok((await cards.nth(3).innerText()).includes("Not specified"));
  assert.ok(!(await cards.nth(3).innerText()).includes("None specified by author"));
  await page.keyboard.press("/");
  assert.equal(await page.locator('input[name="q"]').evaluate(element => document.activeElement === element), true);
  await page.locator('input[name="q"]').fill("Synthetic");
  await page.locator('select[name="subject"]').selectOption("AI Coding-Agent Skills");
  await page.locator('select[name="audience"]').selectOption("instructors");
  await page.locator('select[name="difficulty"]').selectOption("intermediate");
  await page.locator('select[name="visibility"]').selectOption("private");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll(".catalog-card").length === 1);
  assert.ok((await cards.innerText()).includes("coding-agents"));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: join(screenshots, "catalog-mobile-filtered.png"), fullPage: true });
  await page.locator('select[name="difficulty"]').selectOption("advanced");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "No matching lessons." }).waitFor();
  await page.getByRole("link", { name: "Clear all filters", exact: true }).click();
  await cards.nth(3).waitFor();
  for (let index = 0; index < 3; index++) {
    await page.evaluate(index => curriculumUi.renderRoute("overview", {}, index), index);
    await page.locator(".course-banner").waitFor();
    assert.equal(await cards.count(), 0);
    await page.getByRole("heading", { name: "Learning information" }).waitFor();
    assert.ok((await page.locator("main").innerText()).includes("Intermediate"));
    assert.ok(!(await page.locator("main").innerText()).includes("SECRET_ANSWER_KEY"));
    await page.evaluate(index => curriculumUi.renderRoute("player", {}, index), index);
    await page.getByRole("button", { name: "Next", exact: true }).waitFor();
    const props = await page.evaluate(() => lastPlayerProps);
    assert.equal(props.content.metadata.version, 1);
    for (const question of props.content.questions) assert.deepEqual(Object.keys(question).sort(), ["options", "prompt"]);
    assert.ok(!JSON.stringify(props).includes("SECRET_ANSWER_KEY"));
  }
  await page.evaluate(() => curriculumUi.renderRoute("paths"));
  await page.getByRole("heading", { name: "Local recommendations" }).waitFor();
  assert.ok((await page.locator("main").innerText()).includes("coding-agents"));
  assert.ok((await page.locator("main").innerText()).includes("soft-product"));
  await page.evaluate(() => curriculumUi.pathWithCompleted());
  await page.getByText("administrator-approved AI access", { exact: false }).waitFor();
  assert.equal(await page.locator('a[href="/courses/00000000-0000-4000-8000-000000000001"]').count(), 0);
  assert.equal(await page.getByRole("button", { name: "Generate AI path" }).isDisabled(), true);
  await page.evaluate(() => curriculumUi.renderRoute("studio"));
  await page.getByRole("heading",{name:"How to create a lesson"}).waitFor();
  assert.equal(await page.locator('select[name="subject"]').count(),0,"main Create is simple steps, not an AI draft");
  await page.evaluate(() => curriculumUi.renderRoute("studio",{manual:"1",starter:"sdlc-small-change"}));
  await page.getByRole("textbox",{name:"Lesson title",exact:true}).waitFor();
  assert.equal(await page.getByRole("textbox",{name:"Lesson title",exact:true}).inputValue(),"","manual always starts blank");
  assert.equal(await page.getByRole("heading",{name:"Your lessons",exact:true}).count(),0);
  for (const route of ["teaching"]) {
    await page.evaluate(route => curriculumUi.renderRoute(route), route);
    await page.locator('select[name="subject"]').waitFor();
    assert.equal(await page.locator('select[name="subject"] option').count(), 4);
    assert.equal(await page.locator('select[name="difficulty"]').inputValue(), "");
    await page.locator('select[name="subject"]').selectOption("AI Coding-Agent Skills");
    await page.locator('select[name="curriculumTopic"]').selectOption("coding-agents");
    await page.locator('select[name="audience"]').selectOption("learners");
    await page.locator('select[name="difficulty"]').selectOption("foundation");
    await page.locator('textarea[name="outcomes"]').fill("Evaluate a proposed change");
    await page.locator('textarea[name="topic"]').fill("Explain a synthetic software change");
    if (route === "teaching") {
      await page.locator('input[name="material"]').setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF synthetic offline boundary") });
      await page.locator('input[name="consent"]').check();
    }
    const save = page.getByRole("button", { name: "Save generation draft (no AI yet)", exact: true });
    const resume = page.getByRole("button", { name: "Resume / Retry explicitly", exact: true });
    const reload = page.getByRole("button", { name: "Load saved state / reconcile response loss", exact: true });
    const status = page.getByRole("heading", { name: "Generation status", exact: true });
    const callsBefore = h.state.completions.length;
    h.state.missing = true;
    await save.focus(); await page.keyboard.press("Enter");
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /lesson-generation migration/);
    assert.equal(await page.locator('select[name="subject"]').inputValue(), "AI Coding-Agent Skills");
    assert.equal(await page.locator('select[name="curriculumTopic"]').inputValue(), "coding-agents");
    assert.equal(await page.locator('select[name="audience"]').inputValue(), "learners");
    assert.equal(await page.locator('select[name="difficulty"]').inputValue(), "foundation");
    assert.equal(await page.locator('textarea[name="outcomes"]').inputValue(), "Evaluate a proposed change");
    assert.equal(await page.locator('textarea[name="topic"]').inputValue(), "Explain a synthetic software change");
    if (route === "teaching") {
      assert.equal(await page.locator('input[name="consent"]').isChecked(), true);
      assert.equal(await page.locator('input[name="material"]').evaluate(input => input.files[0]?.name), "synthetic.pdf");
    }
    // The delivered shared UI intentionally focuses its status heading, which
    // contains a visible role=alert; do not regress to silent or unfocused errors.
    assert.equal(await status.evaluate(element => element === document.activeElement), true);
    assert.equal(await save.isEnabled(), true);
    assert.equal(h.state.completions.length, callsBefore);
    await page.screenshot({ path: join(screenshots, `${route}-start-error-mobile.png`), fullPage: true });
    h.state.missing = false;
    await save.focus(); await page.keyboard.press("Enter");
    await resume.waitFor();
    await page.getByRole("heading", { name: "Saved generation drafts", exact: true }).waitFor();
    assert.equal(h.state.completions.length, callsBefore, "both route starts must save without inference");
    const id = (await h.db.query("select id from forge_lesson_generations where kind=$1", [route === "teaching" ? "import" : "studio"])).rows[0].id;
    const draft = (await h.actions.loadLessonGeneration(id)).draft;
    assert.deepEqual(draft.selection, {
      subject: "AI Coding-Agent Skills",
      metadata: { version: 1, topic: "coding-agents", audience: "learners", difficulty: "foundation", outcomes: ["Evaluate a proposed change"], prerequisites: [] },
    });
    assert.equal(draft.objective, "Explain a synthetic software change");
    assert.deepEqual(draft.parts, []);
    assert.equal(draft.kind, route === "teaching" ? "import" : "studio");
    if (route === "teaching") assert.equal(draft.source_text, h.state.source);
    h.state.failure = true;
    await resume.focus(); await page.keyboard.press("Enter");
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /Load saved state first/);
    assert.equal((await page.getByRole("alert").innerText()).includes("PRIVATE"), false);
    assert.equal(await status.evaluate(element => element === document.activeElement), true);
    assert.equal(await resume.isDisabled(), true);
    assert.equal(h.state.completions.length, callsBefore + 1);
    assert.deepEqual((await h.actions.loadLessonGeneration(id)).draft.parts, []);
    await page.screenshot({ path: join(screenshots, `${route}-stage-error-mobile.png`), fullPage: true });
    h.state.failure = false;
    await status.focus(); await page.keyboard.press("Tab");
    assert.equal(await reload.evaluate(element => element === document.activeElement), true, "disabled Resume is skipped by keyboard");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent === "Resume / Retry explicitly" && !button.disabled));
    assert.equal(await status.evaluate(element => element === document.activeElement), true);
    let release; h.state.gate = new Promise(resolve => { release = resolve; });
    try {
      await page.keyboard.press("Tab");
      assert.equal(await resume.evaluate(element => element === document.activeElement), true);
      await page.keyboard.press("Enter");
      await page.getByRole("button", { name: "Pause after current request", exact: true }).click();
    } finally { release(); h.state.gate = null; }
    await page.getByText(/1 saved parts/).waitFor();
    assert.equal(h.state.completions.length, callsBefore + 2);
    const resumed = (await h.actions.loadLessonGeneration(id)).draft;
    assert.deepEqual(resumed.selection, draft.selection, "retry preserves the exact curriculum instead of relabeling it");
    assert.equal(resumed.parts.length, 1);
    assert.equal(resumed.attempts.length, 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(screenshots, `${route}-saved-paused-mobile.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => curriculumUi.renderRoute("catalog"));
  await cards.nth(3).waitFor();
  await page.screenshot({ path: join(screenshots, "catalog-desktop.png"), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  assert.deepEqual(fetches, []);
});
