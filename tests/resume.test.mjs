import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { resumeSchema } from "../src/lib/resume.ts";

const progress = { stage: "quiz", slide: 2, ordering: [2, 1, 0], answers: Array(10).fill(-1) };

test("resume accepts unfinished answers without storing an answer key", () => {
  assert.deepEqual(resumeSchema.parse({ ...progress, answers: [0, 3, ...Array(8).fill(-1)] }), { ...progress, answers: [0, 3, ...Array(8).fill(-1)] });
  assert.equal("questions" in resumeSchema.parse({ ...progress, questions: [{ correct: 0 }] }), false);
});

test("resume rejects invalid position and answer payloads", () => {
  for (const invalid of [
    { ...progress, stage: "passed" },
    { ...progress, slide: -1 },
    { ...progress, answers: Array(10).fill(4) },
    { ...progress, answers: Array(2).fill(-1) },
    { ...progress, answers: Array(11).fill(-1) },
    { ...progress, ordering: Array(100).fill(0) },
  ]) assert.equal(resumeSchema.safeParse(invalid).success, false);
});

test("mounted LessonPlayer progress scheduling (offline)", async context => {
  const require = createRequire(import.meta.url);
  const sources = Object.fromEntries([
    ["react", "react", "react.development.js"],
    ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
    ["react-dom", "react-dom", "react-dom.development.js"],
    ["react-dom/client", "react-dom", "react-dom-client.development.js"],
    ["scheduler", "scheduler", "scheduler.development.js"],
  ].map(([name, packageName, file]) => [name, readFileSync(join(dirname(require.resolve(`${packageName}/package.json`)), "cjs", file), "utf8")]));
  for (const [name, file] of [["player", "learning-controls"], ["./lesson-preview", "lesson-preview"],["./presentation-view","presentation-view"]]) {
    sources[name] = ts.transpileModule(readFileSync(new URL(`../src/components/${file}.tsx`, import.meta.url), "utf8"), {
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
  }
  const browser = await chromium.launch();
  const browserContext = await browser.newContext({ offline: true, serviceWorkers: "block" });
  const requests = [];
  await browserContext.route("**/*", route => { requests.push(route.request().url()); return route.abort(); });
  try {
    async function mount(overrides = {}) {
      const page = await browserContext.newPage();
      context.after(() => page.close());
      await page.clock.install({ time: new Date("2026-09-25T00:00:00Z") });
      await page.clock.pauseAt(new Date("2026-09-25T00:00:01Z"));
      await page.setContent('<div id="root"></div>');
      await page.evaluate(async ({ sources, overrides }) => {
        const modules = {};
        const calls = [];
        const pending = [];
        const actions = {
          saveResume: (...args) => new Promise((resolve, reject) => { calls.push(args); pending.push({ resolve, reject }); }),
          attend: async () => ({}),
          submitQuiz: async () => ({ score: 0 }),
        };
        function load(name) {
          if (name === "@/app/learning/actions") return actions;
          if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => load("react").createElement("a", props, children) };
          if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
          // Metadata views are not exercised by the scheduler; preview/text use the real module.
          if (name === "./lesson-metadata") return { MetadataFields: () => null, LessonMetadata: () => null };
          if (!modules[name]) {
            if (!sources[name]) throw new Error(`Unexpected offline module: ${name}`);
            const loadedModule = { exports: {} };
            modules[name] = loadedModule;
            new Function("require", "module", "exports", "process", sources[name])(load, loadedModule, loadedModule.exports, { env: { NODE_ENV: "development" } });
          }
          return modules[name].exports;
        }
        const React = load("react");
        globalThis.IS_REACT_ACT_ENVIRONMENT = true;
        const root = load("react-dom/client").createRoot(document.getElementById("root"));
        const initial = { stage: "slides", slide: 0, ordering: [2, 1, 0], answers: Array(10).fill(-1) };
        const props = {
          id: "synthetic-lesson", version: 3, saved: initial, revision: 7, resumeAvailable: true,
          content: {
            slides: Array.from({ length: 4 }, (_, index) => ({ title: `Slide ${index + 1}`, body: "Synthetic body", example: "Synthetic example" })),
            activity: { prompt: "Order the steps", steps: ["Arrange", "Act", "Assert"] },
            questions: Array.from({ length: 10 }, () => ({ prompt: "Synthetic question", options: ["First", "Second", "Third", "Fourth"] })),
          },
          ...overrides,
        };
        globalThis.playerTest = { calls, pending, root, act: React.act };
        await React.act(async () => { root.render(React.createElement(load("player").LessonPlayer, props)); });
      }, { sources, overrides });
      return page;
    }
    async function click(page, name) {
      await page.getByRole("button", { name, exact: true }).evaluate(button => playerTest.act(async () => { button.click(); }));
    }
    async function calls(page) { return page.evaluate(() => playerTest.calls); }
    async function settle(page, outcome) {
      await page.evaluate(outcome => playerTest.act(async () => { playerTest.pending.shift().resolve(outcome); }), outcome);
    }
    async function unmount(page) { await page.evaluate(() => playerTest.act(async () => { playerTest.root.unmount(); })); }

    await context.test("dispatches changed progress before an immediate unmount without advancing the clock", async () => {
      const page = await mount();
      assert.equal((await calls(page)).length, 0);
      await click(page, "Next");
      await unmount(page);
      const savedCalls = await calls(page);
      assert.equal(savedCalls.length, 1);
      assert.deepEqual(savedCalls[0], ["synthetic-lesson", 3, 7, { stage: "slides", slide: 1, ordering: [2, 1, 0], answers: Array(10).fill(-1) }]);
      await settle(page, { revision: 8 });
    });
    await context.test("serializes saves and drains only the latest queued state after unmount", async () => {
      const page = await mount();
      await click(page, "Next");
      await click(page, "Next");
      await click(page, "Practice");
      await click(page, "Move step 1 down");
      await click(page, "Final quiz");
      await page.locator('input[name="question-0"]').nth(2).evaluate(input => playerTest.act(async () => { input.click(); }));
      assert.equal((await calls(page)).length, 1);
      await unmount(page);
      await settle(page, { revision: 8 });
      const savedCalls = await calls(page);
      assert.equal(savedCalls.length, 2);
      assert.deepEqual(savedCalls[1], ["synthetic-lesson", 3, 8, { stage: "quiz", slide: 2, ordering: [1, 2, 0], answers: [2, ...Array(9).fill(-1)] }]);
      await settle(page, { revision: 9 });
      assert.equal((await calls(page)).length, 2);
    });
    await context.test("a reversion to lastSaved supersedes queued progress while the first save is unresolved", async () => {
      const page = await mount();
      await click(page, "Next");
      await click(page, "Next");
      await click(page, "Previous");
      await click(page, "Previous");
      assert.equal((await calls(page)).length, 1);
      await settle(page, { revision: 8 });
      const savedCalls = await calls(page);
      assert.equal(savedCalls.length, 2);
      assert.equal(savedCalls[1][2], 8);
      assert.equal(savedCalls[1][3].slide, 0);
      await settle(page, { revision: 9 });
      await click(page, "Next");
      assert.equal((await calls(page))[2][2], 9);
      await settle(page, { revision: 10 });
      await unmount(page);
    });
    await context.test("returned errors retain the failed state and revision for explicit retry", async () => {
      const page = await mount();
      await click(page, "Next");
      await settle(page, { error: "Could not save progress." });
      assert.match(await page.getByRole("alert").textContent(), /Could not save progress/);
      await click(page, "Retry saving progress");
      assert.deepEqual((await calls(page))[1], (await calls(page))[0]);
      assert.equal(await page.getByRole("button", { name: "Retry saving progress" }).isDisabled(), true);
      await settle(page, { revision: 8 });
      assert.equal(await page.getByRole("alert").count(), 0);
      await unmount(page);
    });
    await context.test("a failed save does not replace newer queued changes when retried", async () => {
      const page = await mount();
      await click(page, "Next");
      await click(page, "Next");
      await settle(page, { error: "Could not save progress." });
      assert.equal((await calls(page)).length, 1);
      await click(page, "Retry saving progress");
      const savedCalls = await calls(page);
      assert.equal(savedCalls[1][2], 7);
      assert.equal(savedCalls[1][3].slide, 2);
      await settle(page, { revision: 8 });
      assert.equal(await page.getByRole("alert").count(), 0);
      await unmount(page);
    });
    await context.test("reverting after a failed save discards stale queued changes", async () => {
      const page = await mount();
      await click(page, "Next");
      await settle(page, { error: "Could not save progress." });
      assert.equal(await page.getByRole("alert").count(), 1);
      await click(page, "Previous");
      assert.equal(await page.getByRole("alert").count(), 0);
      assert.equal(await page.getByRole("button", { name: "Retry saving progress" }).count(), 0);
      assert.equal((await calls(page)).length, 1);
      await unmount(page);
    });
    await context.test("conflicts block both queued and subsequent saves until reload", async () => {
      const page = await mount();
      await click(page, "Next");
      await click(page, "Next");
      await settle(page, { error: "Progress changed on another device. Reload before continuing.", conflict: true });
      assert.equal(await page.getByRole("button", { name: "Reload lesson" }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Retry saving progress" }).count(), 0);
      await click(page, "Previous");
      await click(page, "Previous");
      assert.match(await page.getByRole("alert").textContent(), /Progress changed on another device/);
      assert.equal(await page.getByRole("button", { name: "Reload lesson" }).count(), 1);
      await click(page, "Practice");
      assert.equal((await calls(page)).length, 1);
      await unmount(page);
    });
    await context.test("unavailable persistence never dispatches progress", async () => {
      const page = await mount({ resumeAvailable: false });
      await click(page, "Next");
      await click(page, "Practice");
      assert.match(await page.getByRole("alert").textContent(), /Progress saving is unavailable/);
      assert.equal((await calls(page)).length, 0);
      await unmount(page);
    });
    await context.test("transport rejection remains retryable without leaking exception details", async () => {
      const page = await mount();
      await click(page, "Next");
      await click(page, "Next");
      await page.evaluate(() => playerTest.act(async () => { playerTest.pending.shift().reject(new Error("private synthetic transport detail")); }));
      assert.equal(await page.getByRole("alert").count(), 1);
      assert.match(await page.getByRole("alert").textContent(), /Could not save progress/);
      assert.doesNotMatch(await page.locator("body").textContent(), /private synthetic transport detail/);
      await click(page, "Retry saving progress");
      const savedCalls = await calls(page);
      assert.equal(savedCalls[1][2], 7);
      assert.equal(savedCalls[1][3].slide, 2);
      await settle(page, { revision: 8 });
      assert.equal(await page.getByRole("alert").count(), 0);
      await unmount(page);
    });
    assert.deepEqual(requests, []);
  } finally { await browser.close(); }
});