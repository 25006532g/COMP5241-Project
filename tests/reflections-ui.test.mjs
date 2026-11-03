import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { reflectionHarness, sample } from "./reflections.test.mjs";

const nativeRequire = createRequire(import.meta.url);
const sources = Object.fromEntries([
  ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
].map(([name, pkg, file]) => [name, readFileSync(join(dirname(nativeRequire.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
for (const [key, file] of [
  ["component", "../src/components/daily-reflections.tsx"], ["shell", "../src/components/learner-shell.tsx"],
  ["@/lib/reflections", "../src/lib/reflections.ts"],
]) sources[key] = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
sources["lucide-react"] = readFileSync(nativeRequire.resolve("lucide-react"), "utf8");
function bundleCjs(path) {
  if (sources[path]) return path;
  sources[path] = "loading";
  const localRequire = createRequire(path);
  sources[path] = readFileSync(path, "utf8").replace(/require\(["']([^"']+)["']\)/g, (_, name) => `require(${JSON.stringify(bundleCjs(localRequire.resolve(name)))})`);
  return path;
}
sources.zod = `module.exports = require(${JSON.stringify(bundleCjs(nativeRequire.resolve("zod")))});`;
const moduleCss = readFileSync(new URL("../src/components/reflections.module.css", import.meta.url), "utf8");
const classes = Object.fromEntries([...moduleCss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => [match[1], match[1]]));
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace('@import "tailwindcss";', "") + moduleCss;

test("daily reflections navigation is hidden for all roles on desktop and mobile", async t => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ offline: true, serviceWorkers: "block" });
  t.after(async () => { await context.close(); await browser.close(); });
  const requests = [], errors = [];
  await context.route("**/*", route => { requests.push(route.request().url()); return route.abort(); });
  const page = await context.newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", error => errors.push(error.message));
  const screenshots = await mkdtemp(join(tmpdir(), "forge-hidden-reflections-"));
  t.diagnostic(`Synthetic navigation screenshots: ${screenshots}; Chromium ${browser.version()}`);
  for (const role of ["learner", "instructor", "admin"]) {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.setContent(`<style>${css}</style><div id="root"></div>`);
      await page.evaluate(({ sources, role }) => {
        const cache = {};
        function load(name) {
          if (name === "@/app/auth/actions") return { logOut: async () => {} };
          if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => load("react").createElement("a", props, children) };
          if (!cache[name]) {
            if (!sources[name]) throw new Error(`Unexpected browser module ${name}`);
            const mod = { exports: {} }; cache[name] = mod;
            new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
          }
          return cache[name].exports;
        }
        const React = load("react"), root = load("react-dom/client").createRoot(document.getElementById("root"));
        root.render(React.createElement(load("shell").LearnerShell, {
          active: "/dashboard", admin: role === "admin", instructor: role === "instructor",
        }, React.createElement("h1", {}, "Dashboard")));
      }, { sources, role });
      await page.getByRole("heading", { name: "Dashboard" }).waitFor();
      if (width === 320) {
        await page.getByRole("button", { name: "Open navigation", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByRole("link", { name: "Dashboard", exact: true }).waitFor();
        await page.waitForFunction(() => document.getElementById("learner-navigation").getBoundingClientRect().left === 0);
        assert.equal(await page.getByRole("button", { name: "Close navigation", exact: true }).evaluate(el => el === document.activeElement), true);
        await page.keyboard.press("Tab");
        assert.equal(await page.locator(".portal-profile").evaluate(el => el === document.activeElement), true);
      }
      assert.equal(await page.locator('a[href="/reflections"]').count(), 0);
      assert.equal(await page.getByRole("link", { name: "Daily 4D reflections", exact: true }).count(), 0);
      assert.equal(await page.getByRole("link", { name: "Create lesson", exact: true }).isVisible(), true);
      assert.equal(await page.getByRole("link", { name: "Quiz reports", exact: true }).isVisible(), true);
      assert.equal(await page.getByRole("link", { name: "Teaching", exact: true }).count(), role === "learner" ? 0 : 1);
      assert.equal(await page.getByRole("link", { name: "Account maintenance", exact: true }).count(), role === "admin" ? 1 : 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (role === "admin") await page.screenshot({ path: join(screenshots, `navigation-${width}.png`), fullPage: true });
      if (width === 320) {
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("button", { name: "Open navigation", exact: true }).evaluate(el => el === document.activeElement), true);
      }
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
});

test("actual reflection UI/actions/database: drafts, failure reconciliation, CAS, history, keyboard and responsive layout offline", async t => {
  const h = await reflectionHarness({ enabled: true }); t.after(h.close);
  t.mock.method(globalThis, "fetch", () => { throw new Error("Network forbidden"); });
  const browser = await chromium.launch();
  const context = await browser.newContext({ offline: true, serviceWorkers: "block" });
  t.after(async () => { await context.close(); await browser.close(); });
  const requests = [], errors = [], calls = [];
  const screenshots = await mkdtemp(join(tmpdir(), "forge-reflections-20261022-"));
  t.diagnostic(`Synthetic screenshots: ${screenshots}; Chromium ${browser.version()}`);
  await context.route("**/*", route => { requests.push(route.request().url()); return route.abort(); });
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  page.on("pageerror", error => errors.push(error.message));
  let afterAction = null, deferred = null;
  await page.exposeFunction("reflectionAction", async (name, args) => {
    calls.push([name, args]);
    const result = await h.actions[name](...args);
    if (afterAction?.name === name) {
      const mode = afterAction.mode; afterAction = null;
      if (mode === "malformed") return { code: "ok", unexpected: true };
      if (mode === "unavailable") return { code: "unavailable" };
      if (mode === "throw") throw new Error("Synthetic lost action acknowledgement");
      if (mode === "defer") return new Promise(resolve => { deferred = () => resolve(result); });
    }
    return result;
  });
  async function mount(date = "2026-10-22", width = 320, overrides = {}) {
    await page.setViewportSize({ width, height: 1000 });
    const props = { owner: h.owner, date, initial: await h.actions.readReflection({ date }), history: await h.actions.listReflections(), ...overrides };
    await page.setContent(`<style>${css}</style><div id="root"></div>`);
    await page.evaluate(({ sources, classes, props }) => {
      const cache = {};
      function load(name) {
        if (name.endsWith(".module.css")) return { __esModule: true, default: classes };
        if (name === "@/app/reflections/actions") return new Proxy({}, { get: (_, key) => (...args) => window.reflectionAction(key, args) });
        if (name === "@/app/auth/actions") return { logOut: async () => {} };
        if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => load("react").createElement("a", props, children) };
        if (!cache[name]) {
          if (!sources[name]) throw new Error(`Unexpected browser module ${name}`);
          const mod = { exports: {} }; cache[name] = mod;
          new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
        }
        return cache[name].exports;
      }
      const React = load("react"), root = load("react-dom/client").createRoot(document.getElementById("root"));
      window.unmountReflections = () => root.unmount();
      root.render(React.createElement(load("shell").LearnerShell, { active: "/reflections" },
        React.createElement("div", { className: "portal-page" }, React.createElement("h1", {}, "Daily 4D reflections"), React.createElement(load("component").DailyReflections, props))));
    }, { sources, classes, props });
    await page.getByLabel("Delegation", { exact: true }).waitFor();
  }
  const field = label => page.getByLabel(label, { exact: true });
  const status = text => page.getByRole("status").filter({ hasText: text }).waitFor();
  async function fill(suffix = "") {
    for (const label of ["Delegation", "Description", "Discernment", "Diligence"]) await field(label).fill(`${label}: not used today${suffix}`);
  }
  async function assertDraft(suffix = "") {
    for (const label of ["Delegation", "Description", "Discernment", "Diligence"]) assert.equal(await field(label).inputValue(), `${label}: not used today${suffix}`);
  }
  async function overflow() {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  async function cancelGuard(key = "Escape") {
    await page.getByRole("dialog").waitFor();
    assert.equal(await page.getByRole("button", { name: "Cancel — keep editing" }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await page.getByRole("dialog").getByRole("button").last().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("button", { name: "Cancel — keep editing" }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press(key);
    assert.equal(await page.getByRole("dialog").count(), 0);
  }
  async function acceptCanonical() {
    await page.getByRole("button", { name: "Use canonical entry (discard draft)" }).click();
    if (await page.getByRole("dialog").count()) await page.getByRole("button", { name: "Discard and continue" }).click();
  }

  await mount("2026-10-22", 320, { initial: { code: "unavailable" }, history: { code: "unavailable" } });
  assert.equal(await page.getByRole("button", { name: "Create entry", exact: true }).isDisabled(), true);
  assert.equal(await page.getByText("No saved entries.", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Retry loading selected date" }).click();
  await status("No entry for this date");
  await fill();
  // Both actual database errors and response-transport uncertainty retain all text.
  h.state.failure = "returned"; h.state.failOp = "insert";
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await status("unconfirmed"); await assertDraft();
  assert.equal(await page.getByRole("button", { name: "Create entry", exact: true }).isDisabled(), true);
  await page.screenshot({ path: join(screenshots, "unconfirmed-create-320.png"), fullPage: true });
  h.state.failure = null;
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await page.getByRole("button", { name: "Keep draft for new entry" }).click();
  afterAction = { name: "createReflection", mode: "throw" };
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await status("unconfirmed"); await assertDraft();
  assert.equal((await h.db.query("select count(*)::int as n from forge_reflections where owner_id=$1", [h.owner])).rows[0].n, 1);
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await page.getByRole("heading", { name: "Canonical entry · 2026-10-22" }).waitFor();
  await acceptCanonical();
  assert.equal(await page.getByRole("button", { name: "Save changes", exact: true }).isDisabled(), true);
  const beforeUnchanged = calls.length;
  await page.evaluate(async () => {
    document.querySelector("[data-reflection-form]").requestSubmit();
    await new Promise(requestAnimationFrame);
  });
  assert.equal(calls.length, beforeUnchanged, "An unchanged form submit must not dispatch a write");

  await fill(" changed");
  await field("Diligence").focus();
  const originalDate = await page.getByLabel(/Reflection date/).inputValue();
  await page.getByLabel(/Reflection date/).fill("2026-10-21");
  await cancelGuard(); await assertDraft(" changed");
  assert.equal(await page.getByLabel(/Reflection date/).inputValue(), originalDate);
  // Real shell links are guarded, including keyboard cancellation and safe focus return.
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page.getByRole("link", { name: "Course catalog", exact: true }).click();
  await cancelGuard(); await assertDraft(" changed");
  assert.equal(await page.getByRole("link", { name: "Course catalog", exact: true }).evaluate(el => el === document.activeElement), true);
  await page.getByRole("button", { name: "Close navigation", exact: true }).click();
  // Stale-tab save: actual CAS conflict; inspect must not replace draft.
  const saved = (await h.actions.readReflection({ date: originalDate })).row;
  await h.actions.updateReflection({ ...sample(), id: saved.id, revision: saved.revision, diligence: "Canonical newer edit" });
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await status("newer edit"); await assertDraft(" changed");
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await assertDraft(" changed");
  await page.getByRole("button", { name: "Use canonical entry (discard draft)" }).click();
  await cancelGuard(); await assertDraft(" changed");
  await page.getByRole("button", { name: "Use canonical entry (discard draft)" }).click();
  await page.getByRole("button", { name: "Discard and continue" }).click();
  assert.equal(await field("Diligence").inputValue(), "Canonical newer edit");

  // Duplicate submission and deferred late acknowledgement: one mutation only.
  await fill(" double");
  afterAction = { name: "updateReflection", mode: "defer" };
  const beforeUpdates = calls.filter(([name]) => name === "updateReflection").length;
  await page.getByRole("button", { name: "Save changes", exact: true }).evaluate(el => { el.click(); el.click(); });
  await page.waitForFunction(() => document.querySelector("#reflection-delegation").disabled || document.querySelector("#reflection-delegation").closest("fieldset").disabled);
  while (!deferred) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(calls.filter(([name]) => name === "updateReflection").length, beforeUpdates + 1);
  assert.equal(await page.getByLabel(/Reflection date/).isDisabled(), true);
  deferred(); deferred = null;
  await status("Entry saved privately");
  await assertDraft(" double");
  await overflow();

  // Returned malformed action acknowledgement blocks repeats after a committed update.
  await fill(" malformed");
  afterAction = { name: "updateReflection", mode: "malformed" };
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await status("unconfirmed"); await assertDraft(" malformed");
  assert.equal(await page.getByRole("button", { name: "Save changes", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await acceptCanonical();

  await fill(" unavailable ack");
  afterAction = { name: "updateReflection", mode: "unavailable" };
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await status("unconfirmed"); await assertDraft(" unavailable ack");
  assert.equal(await page.getByRole("button", { name: "Save changes", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await acceptCanonical();

  // Explicit delete confirmation, stale revision, failure and lost acknowledgement.
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await cancelGuard("Enter");
  assert.equal(calls.filter(([name]) => name === "deleteReflection").length, 0);
  const current = (await h.actions.readReflection({ date: originalDate })).row;
  await h.actions.updateReflection({ ...sample(), id: current.id, revision: current.revision });
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  await status("newer edit");
  assert.equal((await h.actions.readReflection({ date: originalDate })).row.revision, current.revision + 1);
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await acceptCanonical();
  afterAction = { name: "deleteReflection", mode: "throw" };
  const beforeDeleteText = await field("Diligence").inputValue();
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  await status("unconfirmed");
  assert.equal(await field("Diligence").inputValue(), beforeDeleteText);
  assert.equal((await h.actions.readReflection({ date: originalDate })).row, null);
  assert.equal(await page.getByRole("button", { name: "Delete entry", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await page.getByRole("button", { name: "Keep draft for new entry" }).click();
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await status("Entry saved privately");
  await page.getByRole("button", { name: "Delete entry", exact: true }).click();
  await page.getByRole("button", { name: "Confirm deletion", exact: true }).click();
  await status("Deletion confirmed");
  assert.equal(await page.getByRole("button", { name: "Create entry", exact: true }).isDisabled(), true);
  await page.screenshot({ path: join(screenshots, "confirmed-delete-320.png"), fullPage: true });

  // Metadata history pages, load errors and real selection preserve the current draft.
  await h.db.query(`insert into forge_reflections(owner_id,date,delegation,description,discernment,diligence)
    select $1,date '2026-01-01'+g,'private','private','private','private' from generate_series(0,24) g`, [h.owner]);
  await mount("2026-01-25", 1440);
  assert.equal(await page.getByRole("button", { name: /2026-\d\d-\d\d · revision/ }).count(), 20);
  await fill(" history");
  h.state.failure = "returned"; h.state.failOp = "select";
  await page.getByRole("button", { name: "Load older dates", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "unavailable" }).waitFor();
  await assertDraft(" history");
  assert.equal(await page.getByRole("button", { name: /2026-\d\d-\d\d · revision/ }).count(), 20);
  h.state.failure = null;
  await page.getByRole("button", { name: "Load older dates", exact: true }).click();
  await page.getByRole("button", { name: "2026-01-01 · revision 1", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: /2026-\d\d-\d\d · revision/ }).count(), 25);
  const beforeNoOp = calls.filter(([name]) => /^(create|update|delete)Reflection$/.test(name)).length;
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  await assertDraft(" history");
  assert.equal(calls.filter(([name]) => /^(create|update|delete)Reflection$/.test(name)).length, beforeNoOp);
  // An accepted discard followed by a failed load still retains both draft and selection.
  h.state.failure = "throw"; h.state.failOp = "select";
  await page.getByRole("button", { name: "2026-01-01 · revision 1", exact: true }).click();
  await page.getByRole("button", { name: "Discard and continue" }).click();
  await status("unavailable"); await assertDraft(" history");
  assert.equal(await page.getByLabel(/Reflection date/).inputValue(), "2026-01-25");
  h.state.failure = null;
  await page.getByRole("button", { name: "2026-01-01 · revision 1", exact: true }).click();
  await cancelGuard(); await assertDraft(" history");
  await page.getByRole("button", { name: "2026-01-01 · revision 1", exact: true }).click();
  await page.getByRole("button", { name: "Discard and continue" }).click();
  await status("Entry loaded");
  assert.equal(await page.getByLabel(/Reflection date/).inputValue(), "2026-01-01");
  await field("Description").fill("<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await status("Entry saved privately");
  await page.getByRole("button", { name: "Inspect canonical entry", exact: true }).click();
  assert.equal(await page.locator(".canonical img,.canonical script").count(), 0);
  await overflow();
  await page.screenshot({ path: join(screenshots, "history-canonical-1440.png"), fullPage: true });

  // Boundary validation focuses feedback; no call is dispatched.
  await field("Delegation").fill(" ".repeat(3));
  const beforeInvalid = calls.length;
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await status("Check the date");
  assert.equal(calls.length, beforeInvalid);
  assert.equal(await page.locator(".notice").evaluate(el => el === document.activeElement), true);
  await page.screenshot({ path: join(screenshots, "validation-focus-1440.png"), fullPage: true });

  // Late responses after owner/selection unmount never overwrite the next mounted editor.
  await fill(" late");
  afterAction = { name: "updateReflection", mode: "defer" };
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  while (!deferred) await new Promise(resolve => setTimeout(resolve, 10));
  await page.evaluate(() => window.unmountReflections());
  await mount("2026-01-02", 320);
  deferred(); deferred = null;
  assert.equal(await page.getByLabel(/Reflection date/).inputValue(), "2026-01-02");
  assert.equal(await field("Delegation").inputValue(), "private");
  await overflow();
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
});
