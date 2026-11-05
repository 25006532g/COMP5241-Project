import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import { harness, transpile, nativeRequire } from "./lesson-generation-harness.mjs";

const sources = Object.fromEntries([
  ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
].map(([name, pkg, file]) => [name, readFileSync(join(dirname(nativeRequire.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
for (const [key, path] of [
  ["component", "../src/components/lesson-generation.tsx"], ["./lesson-metadata", "../src/components/lesson-metadata.tsx"],
  ["@/lib/lesson-generation", "../src/lib/lesson-generation.ts"], ["@/lib/curriculum", "../src/lib/curriculum.ts"],
  ["./curriculum", "../src/lib/curriculum.ts"], ["./learning", "../src/lib/learning.ts"],
  ["./presentation.ts","../src/lib/presentation.ts"],
]) sources[key] = transpile(path);
function bundleCjs(path) {
  if (sources[path]) return path;
  sources[path] = "loading";
  const require = nativeRequire("node:module").createRequire(path);
  sources[path] = readFileSync(path, "utf8").replace(/require\(["']([^"']+)["']\)/g, (_, name) => `require(${JSON.stringify(bundleCjs(require.resolve(name)))})`);
  return path;
}
sources.zod = `module.exports = require(${JSON.stringify(bundleCjs(nativeRequire.resolve("zod")))});`;
const moduleCss = readFileSync(new URL("../src/components/lesson-generation.module.css", import.meta.url), "utf8") +
  readFileSync(new URL("../src/components/lesson-metadata.module.css", import.meta.url), "utf8");
const classes = Object.fromEntries([...moduleCss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => [match[1], match[1]]));
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace('@import "tailwindcss";', "") + moduleCss;

test("mounted shared generation UI: separate requests, pause/retry/reload recovery, keyboard and responsive screenshots", async t => {
  const h = await harness(); t.after(h.close);
  t.mock.method(globalThis, "fetch", () => { throw new Error("No network permitted"); });
  const browser = await chromium.launch();
  const context = await browser.newContext({ offline: true, serviceWorkers: "block" });
  t.after(async () => { await context.close(); await browser.close(); });
  const errors = [], requests = [], bridges = [];
  let dropStart = false, dropFinalize = false;
  const screenshots = await mkdtemp(join(tmpdir(), "forge-generation-20261020-"));
  t.diagnostic(`Synthetic screenshots (inspect separately): ${screenshots}; Chromium ${browser.version()}`);
  await context.route("**/*", route => {
    if (route.request().url() === "https://forge.synthetic/") return route.fulfill({ contentType: "text/html", body: `<style>${css}</style><main class="portal-page studio-editor"><div id="root"></div></main>` });
    requests.push(route.request().url()); return route.abort();
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(error.message));
  await page.exposeFunction("invokeGeneration", async (name, args) => {
    bridges.push(name);
    if (name === "createLesson" || name === "importTeachingMaterial") {
      if (dropStart) { dropStart = false; throw new Error("Synthetic lost start transport before dispatch"); }
      const f = new FormData();
      for (const [key, value] of args) {
        if (key === "material") f.set(key, new File(["synthetic file, extractor separately covered"], "teaching.pdf"));
        else f.set(key, value);
      }
      return (name === "createLesson" ? h.learningActions.createLesson : h.teachingActions.importTeachingMaterial)({}, f);
    }
    const result = await h.actions[name](...args);
    if (name === "finalizeLessonGeneration" && dropFinalize) { dropFinalize = false; throw new Error("Synthetic lost finalization transport after commit"); }
    return result;
  });
  async function mount(importing = false) {
    await page.goto("https://forge.synthetic/");
    await page.evaluate(({ sources, classes, importing }) => {
      const cache = {};
      function load(name) {
        if (name.endsWith(".module.css")) return { __esModule: true, default: classes };
        if (name.startsWith("@/app/")) return new Proxy({}, { get: (_, key) => async (...args) => {
          if (key === "createLesson" || key === "importTeachingMaterial") {
            return window.invokeGeneration(key, [...args[1].entries()].map(([k, v]) => [k, typeof v === "string" ? v : { filename: v.name }]));
          }
          return window.invokeGeneration(key, args);
        } });
        if (!cache[name]) {
          if (!sources[name]) throw new Error(`Unexpected module ${name}`);
          const mod = { exports: {} }; cache[name] = mod;
          new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
        }
        return cache[name].exports;
      }
      load("react-dom/client").createRoot(document.getElementById("root")).render(load("react").createElement(load("component").LessonGeneration, { importing }));
    }, { sources, classes, importing });
    try { await page.getByRole("heading", { name: "Generation status", exact: true }).waitFor(); }
    catch (error) { t.diagnostic(`Mount errors: ${JSON.stringify(errors)}`); throw error; }
    await page.waitForFunction(() => document.querySelectorAll("button").length >= 3);
  }
  async function fill() {
    await page.locator('select[name="subject"]').selectOption("Software Development Life Cycle");
    await page.locator('select[name="curriculumTopic"]').selectOption("requirements");
    await page.locator('select[name="audience"]').selectOption("learners");
    await page.locator('select[name="difficulty"]').selectOption("foundation");
    await page.getByLabel("Learning outcomes", { exact: true }).fill("Write testable requirements");
    await page.getByLabel("Learning objective", { exact: true }).fill("Describe testable software requirements");
  }
  const resume = () => page.getByRole("button", { name: "Resume / Retry explicitly", exact: true });
  const reload = () => page.getByRole("button", { name: "Load saved state / reconcile response loss", exact: true });
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await mount();
    // Start fresh after first viewport while retaining the completed saved draft.
    const another = page.getByRole("button", { name: "Prepare another draft", exact: true });
    if (await another.count()) await another.click();
    await fill();
    const before = h.state.completions.length;
    if (width === 320) {
      dropStart = true;
      await page.getByRole("button", { name: "Save generation draft (no AI yet)", exact: true }).click();
      await page.getByRole("alert").filter({ hasText: "Start acknowledgement was lost" }).waitFor();
      assert.equal(await page.getByLabel("Learning objective", { exact: true }).inputValue(), "Describe testable software requirements");
      assert.equal(await page.locator('select[name="curriculumTopic"]').inputValue(), "requirements");
      await reload().click();
      await page.waitForFunction(() => [...document.querySelectorAll("button")].some(b => b.textContent === "Save generation draft (no AI yet)" && !b.disabled));
      h.state.lose = "forge_generation_start";
    }
    await page.getByRole("button", { name: "Save generation draft (no AI yet)", exact: true }).focus();
    await page.keyboard.press("Enter");
    if (width === 320) {
      await page.getByRole("alert").filter({ hasText: "could not be confirmed" }).waitFor();
      await reload().click();
    }
    await resume().waitFor();
    assert.equal(h.state.completions.length, before);
    assert.equal(await page.getByRole("heading", { name: "Generation status", exact: true }).evaluate(el => el === document.activeElement), true);
    let release; h.state.gate = new Promise(resolve => { release = resolve; });
    await resume().focus(); await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Pause after current request", exact: true }).waitFor();
    await page.getByRole("button", { name: "Pause after current request", exact: true }).click();
    release(); h.state.gate = null;
    await page.getByText(/1 saved parts/).waitFor();
    await page.waitForTimeout(50);
    assert.equal(h.state.completions.length, before + 1, "pause stops scheduling after in-flight outline");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(screenshots, `paused-${width}.png`), fullPage: true });
    await mount(); // Real page reload, storage ID recovery and DB saved parts, no inference.
    await page.getByText(/1 saved parts/).waitFor();
    assert.equal(h.state.completions.length, before + 1);
    h.state.failure = true;
    await resume().click();
    await page.getByRole("alert").waitFor();
    assert.equal(await resume().isDisabled(), true, "must load state before explicit retry");
    assert.ok(!(await page.getByRole("alert").innerText()).includes("PRIVATE_"));
    assert.equal(h.state.completions.length, before + 2);
    assert.equal(await page.getByRole("heading", { name: "Generation status", exact: true }).evaluate(el => el === document.activeElement), true);
    await page.screenshot({ path: join(screenshots, `error-${width}.png`), fullPage: true });
    h.state.failure = false;
    await reload().click(); await page.waitForFunction(() => [...document.querySelectorAll("button")].some(b => b.textContent === "Resume / Retry explicitly" && !b.disabled));
    // Simulate a committed part whose RPC acknowledgement is lost.
    h.state.lose = "forge_generation_settle";
    await resume().click();
    await page.getByRole("alert").waitFor();
    const afterLost = h.state.completions.length;
    await reload().click(); await page.getByText(/2 saved parts/).waitFor();
    assert.equal(h.state.completions.length, afterLost);
    dropFinalize = true;
    await resume().focus(); await page.keyboard.press("Enter");
    await page.getByRole("alert").filter({ hasText: "Response lost" }).waitFor();
    await reload().click();
    await page.getByRole("link", { name: "Review completed private lesson in editor", exact: true }).waitFor();
    assert.equal(h.state.completions.length, before + 9, "eight successful stages plus one explicit failed call");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(screenshots, `completed-${width}.png`), fullPage: true });
    assert.ok(bridges.filter(n => n === "advanceLessonGeneration").length >= 9);
  }
  // A page close/reload is not a worker: only the already in-flight part may save.
  await page.getByRole("button", { name: "Prepare another draft", exact: true }).click();
  await fill();
  await page.getByRole("button", { name: "Save generation draft (no AI yet)", exact: true }).click();
  await resume().waitFor();
  const beforeClose = h.state.completions.length;
  let releaseClose; h.state.gate = new Promise(resolve => { releaseClose = resolve; });
  await resume().click();
  for (let i = 0; i < 100 && h.state.completions.length === beforeClose; i++) await page.waitForTimeout(5);
  assert.equal(h.state.completions.length, beforeClose + 1);
  await mount();
  releaseClose(); h.state.gate = null;
  await page.waitForTimeout(100);
  await reload().click(); await page.getByText(/1 saved parts/).waitFor();
  assert.equal(h.state.completions.length, beforeClose + 1, "closing stops all subsequent scheduling");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Delete this generation draft", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Draft content/reference deleted" }).waitFor();
  await mount(true); await fill();
  await page.getByLabel("Teaching file", { exact: true }).setInputFiles({ name: "teaching.pdf", mimeType: "application/pdf", buffer: Buffer.from("synthetic") });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Save generation draft (no AI yet)", exact: true }).click();
  await resume().waitFor();
  assert.equal(h.state.extractionCalls, 1);
  await page.screenshot({ path: join(screenshots, "import-1440.png"), fullPage: true });
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Delete this generation draft", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Draft content/reference deleted" }).waitFor();
  assert.deepEqual(requests, []); assert.deepEqual(errors, []);
});
