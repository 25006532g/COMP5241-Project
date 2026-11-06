import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { z } from "zod";

const require = createRequire(import.meta.url);
const source = file => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
const compile = file => ts.transpileModule(source(file), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function load(file, dependencies) {
  const mod = { exports: {} };
  new Function("require", "module", "exports", "process", compile(file))(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`);
    return dependencies[name];
  }, mod, mod.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: "https://offline.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic" } });
  return mod.exports;
}
const curriculum = load("lib/curriculum.ts", { zod: { z } });
const recommendations = load("lib/recommendations.ts", { zod: { z }, "@/lib/curriculum": curriculum });
const learning = load("lib/learning.ts", { zod: { z },"./presentation.ts":load("lib/presentation.ts",{zod:{z}}) });
const permissions = load("lib/permissions.ts", {});
const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, "0")}`;
const catalog = [1, 2].map(n => ({ id: id(n), title: `Synthetic private testing ${n}`, subject: "Software testing", summary: "Synthetic only." }));

function pageHarness() {
  const state = { user: { id: "owner-a", app_metadata: { ai_access: true } }, error: null, reads: 0, authCalls: 0, configFailure: false };
  const auth = { createClient: async () => {
    if (state.configFailure) throw new Error("Synthetic configuration unavailable");
    return { auth: { getUser: async () => { state.authCalls++; return { data: { user: state.user }, error: state.error }; } } };
  } };
  const navigation = { redirect(path) { throw new Error(`Redirect ${path}`); } };
  const client = { from(table) {
    state.reads++;
    const query = {
      select() { return query; }, eq() { return query; }, or() { return query; }, gte() { return query; }, order() { return query; },
      range: async () => ({ data: table === "forge_lessons" ? catalog : [], error: null }),
      maybeSingle: async () => ({ data: { age: state.age, learning_level: state.level ?? "new" }, error: state.profileError }),
    };
    return query;
  } };
  const server = load("lib/learning-server.ts", {
    "server-only": {}, "@supabase/supabase-js": { createClient: () => client }, "next/navigation": navigation,
    "@/lib/supabase/server": auth, "@/lib/learning": learning, "@/lib/permissions": permissions, zod: { z },
  });
  const eligibility = load("lib/ai-eligibility-server.ts", {
    "server-only": {}, "@/lib/learning-server": server, "@/lib/eligibility": load("lib/eligibility.ts", {}),
  });
  function LearningPath() { return null; }
  const route = load("app/paths/page.tsx", {
    "react/jsx-runtime": jsx, "@/components/learner-shell": { LearnerShell: () => null },
    "@/components/learning-path": { LearningPath }, "@/lib/learning-server": server,
    "@/lib/ai-eligibility-server": eligibility, "@/lib/learning": learning,
    "@/lib/recommendations": recommendations, "@/lib/curriculum": curriculum,
    "@/lib/supabase/server": auth, "next/navigation": navigation,
  }).default;
  const find = tree => {
    if (!React.isValidElement(tree)) return null;
    if (tree.type === LearningPath) return tree;
    for (const child of React.Children.toArray(tree.props.children)) { const found = find(child); if (found) return found; }
    return null;
  };
  return { state, route, clientElement: async () => find(await route()) };
}

test("actual paths page fails closed before reads and keys its client by owner/coarse preferences", async () => {
  for (const variant of ["user-error", "expired"]) {
    const h = pageHarness();
    if (variant === "expired") h.state.user = null;
    else h.state.error = new Error("PRIVATE AUTH");
    await assert.rejects(h.route(), /Redirect \/login/);
    assert.equal(h.state.reads, 0);
  }
  const h = pageHarness();
  const first = await h.clientElement();
  assert.equal(first.props.ownerId, "owner-a");
  assert.equal(first.props.aiAvailable,true,"approved user without age can access AI");
  h.state.user = { ...h.state.user, id: "owner-b" };
  const next = await h.clientElement();
  assert.notEqual(first.key, next.key);
  h.state.level = "advanced";
  assert.notEqual(next.key, (await h.clientElement()).key);
  assert.equal(h.state.authCalls, 3);
  for(const age of [13,17,18,120,null,undefined]){
    h.state.age=age;
    assert.equal((await h.clientElement()).props.aiAvailable,true);
  }
  h.state.user.app_metadata={};h.state.user.user_metadata={ai_access:true};
  assert.equal((await h.clientElement()).props.aiAvailable,false,"editable metadata cannot grant access");
  h.state.configFailure = true;
  await assert.rejects(h.route(), /configuration unavailable/);
  h.state.configFailure = false; h.state.profileError = {};
  await assert.rejects(h.route(), /Could not load your learning preferences/);
});

const sources = Object.fromEntries([
  ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
].map(([name, pkg, file]) => [name, readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
for (const name of ["curriculum", "recommendations"]) sources[`@/lib/${name}`] = compile(`lib/${name}.ts`);
sources["@/components/learning-path"] = compile("components/learning-path.tsx");
function bundle(path) {
  if (sources[path]) return path;
  sources[path] = "loading";
  const local = createRequire(path);
  sources[path] = readFileSync(path, "utf8").replace(/require\(["']([^"']+)["']\)/g, (_, name) => `require(${JSON.stringify(bundle(local.resolve(name)))})`);
  return path;
}
sources.zod = `module.exports = require(${JSON.stringify(bundle(require.resolve("zod")))});`;

test("mounted optional paths: duplicate guard, transport recovery, focus, stale context and late owner completion", async context => {
  const browser = await chromium.launch();
  const bc = await browser.newContext({ offline: true, serviceWorkers: "block" });
  context.after(async () => { await bc.close(); await browser.close(); });
  const unexpected = [], errors = [];
  const css = source("app/globals.css").replace('@import "tailwindcss";', "");
  await bc.route("**/*", route => {
    if (route.request().url() === "https://forge-path.synthetic/") return route.fulfill({ contentType: "text/html", body: `<style>${css}</style><div id="root"></div>` });
    unexpected.push(route.request().url()); return route.abort();
  });
  const page = await bc.newPage(); page.setDefaultTimeout(5000);
  page.on("pageerror", error => errors.push(error.message));
  const images = await mkdtemp(join(tmpdir(), "forge-path-"));
  context.diagnostic(`Synthetic images: ${images}; Chromium ${browser.version()}`);
  const h = pageHarness();
  const first = await h.clientElement();
  const props = first.props;
  await page.goto("https://forge-path.synthetic/");
  const mountBundle = ({ sources, props, key }) => {
    const modules = {};
    window.pathCalls = 0;
    function load(name) {
      if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => load("react").createElement("a", props, children) };
      if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
      if (name === "@/app/paths/actions") return { generateLearningPath: () => {
        window.pathCalls++;
        return new Promise((resolve, reject) => { window.finishPath = resolve; window.rejectPath = () => reject(new Error("PRIVATE TRANSPORT")); });
      } };
      if (!modules[name]) {
        if (!sources[name]) throw new Error(`Unexpected browser dependency ${name}`);
        const mod = { exports: {} }; modules[name] = mod;
        new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
      }
      return modules[name].exports;
    }
    const React = load("react"), root = load("react-dom/client").createRoot(document.getElementById("root"));
    const Component = load("@/components/learning-path").LearningPath;
    window.pathProps = props; window.pathKey = key;
    window.mountPath = (patch = {}, newKey = window.pathKey) => {
      window.pathProps = { ...window.pathProps, ...patch }; window.pathKey = newKey;
      root.render(React.createElement(Component, { ...window.pathProps, key: newKey }));
    };
    window.goodPath = () => ({
      selectionKey: `${document.querySelector('[name="topic"]').value}:${document.querySelector('[name="goal"]').value}`,
      path: load("@/lib/recommendations").recommendLessons(window.pathProps.catalog, window.pathProps.initialPreferences, window.pathProps.completedIds),
    });
    window.mountPath();
  };
  await page.evaluate(mountBundle, { sources, props, key: first.key });
  const submit = page.getByRole("button", { name: "Generate AI path" });
  const heading = page.getByRole("heading", { name: "Generated path (not saved)" });
  const consent = page.locator('[name="shareCourseContent"]');
  const ai = page.locator('section[aria-labelledby="ai-path-heading"]');
  async function generate() { await consent.check(); await submit.click(); }
  async function finish() { await page.evaluate(() => window.finishPath(window.goodPath())); await heading.waitFor(); }
  async function reset() {
    await page.evaluate(props => window.mountPath(props, `reset-${Math.random()}`), props);
    await submit.waitFor();
  }

  assert.equal(await page.evaluate(() => window.pathCalls), 0);
  assert.ok(await page.getByRole("link", { name: /Synthetic private/ }).count());
  assert.equal(await submit.isDisabled(), true);
  await page.locator('[name="topic"]').selectOption("testing");
  await page.locator('[name="goal"]').selectOption("quality");
  await consent.check();
  await page.evaluate(() => { const form = document.querySelector("form"); form.requestSubmit(); form.requestSubmit(); });
  await page.getByRole("status").filter({ hasText: "Generating" }).waitFor();
  assert.equal(await page.evaluate(() => window.pathCalls), 1);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: join(images, "pending-320.png"), fullPage: true });
  await page.evaluate(() => window.rejectPath());
  const alert = page.getByRole("alert"); await alert.waitFor();
  assert.match(await alert.innerText(), /may have used|may consume/);
  assert.match(await alert.innerText(), /automatic retry/i);
  assert.equal(await alert.evaluate(el => document.activeElement === el), true);
  assert.equal(await page.locator('[name="topic"]').inputValue(), "testing");
  assert.equal(await page.locator('[name="goal"]').inputValue(), "quality");
  assert.equal(await consent.isChecked(), true);
  assert.equal(await page.evaluate(() => window.pathCalls), 1, "The duplicate must not become a queued retry");
  await page.screenshot({ path: join(images, "error-320.png"), fullPage: true });
  await submit.focus(); await page.keyboard.press("Enter"); await finish();
  assert.equal(await heading.evaluate(el => document.activeElement === el), true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: join(images, "success-1440.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await submit.click();
  await page.evaluate(() => window.finishPath({ error: "Synthetic returned failure. Local recommendations remain available." }));
  await alert.waitFor(); assert.equal(await consent.isChecked(), true);
  assert.equal(await alert.evaluate(el => document.activeElement === el), true);
  assert.equal(await page.locator('[name="topic"]').inputValue(), "testing");
  assert.equal(await page.locator('[name="goal"]').inputValue(), "quality");
  assert.equal(await heading.count(), 0);

  for (const variant of ["visibility", "passed", "title", "metadata", "preferences", "eligibility", "selection", "owner"]) {
    await reset(); await generate(); await finish();
    await page.evaluate(variant => {
      const p = window.pathProps;
      if (variant === "visibility") window.mountPath({ catalog: p.catalog.slice(1) });
      if (variant === "passed") window.mountPath({ completedIds: [p.catalog[0].id] });
      if (variant === "title") window.mountPath({ catalog: p.catalog.map((row, i) => i ? row : { ...row, title: "Changed" }) });
      if (variant === "metadata") window.mountPath({ catalog: p.catalog.map((row, i) => i ? row : { ...row, metadata: { version: 1, topic: "testing", audience: "both", difficulty: "advanced", outcomes: ["Test"], prerequisites: [] } }) });
      if (variant === "preferences") window.mountPath({ initialPreferences: { ...p.initialPreferences, goal: "delivery" } });
      if (variant === "eligibility") window.mountPath({ aiAvailable: false });
      if (variant === "owner") window.mountPath({ ownerId: "owner-b" });
    }, variant);
    if (variant === "selection") await page.locator('[name="goal"]').selectOption("build");
    await heading.waitFor({ state: "detached" });
    await ai.getByText(/changed|outdated|new path/i).last().waitFor();
  }
  await reset(); await generate();
  await page.evaluate(() => {
    const response = window.goodPath();
    window.mountPath({ completedIds: [window.pathProps.catalog[0].id] });
    window.pendingResponse = response;
  });
  await page.getByRole("status").filter({ hasText: "Generating" }).waitFor();
  await page.evaluate(() => window.finishPath(window.pendingResponse));
  await ai.getByText(/context changed/i).waitFor();
  assert.equal(await heading.count(), 0, "Late response after completions change must not populate a path");
  await reset(); await generate();
  h.state.user = { ...h.state.user, id: "owner-b" };
  const other = await h.clientElement();
  await page.evaluate(({ props, key }) => window.mountPath(props, key), { props: other.props, key: other.key });
  await page.evaluate(() => window.finishPath(window.goodPath()));
  assert.equal(await heading.count(), 0);
  const calls = await page.evaluate(() => window.pathCalls);
  await page.evaluate(() => window.mountPath({ aiAvailable: false }));
  assert.equal(await submit.isDisabled(), true);
  assert.equal(await consent.isDisabled(), true);
  assert.equal(await page.getByRole("link", { name: /Synthetic private/ }).count() > 0, true);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({ path: join(images, "local-320.png"), fullPage: true });
  await page.evaluate(() => window.mountPath({}, "reload"));
  assert.equal(await page.evaluate(() => window.pathCalls), calls);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.reload();
  await page.evaluate(mountBundle, { sources, props, key: first.key });
  await submit.waitFor();
  assert.equal(await heading.count(), 0);
  assert.equal(await page.evaluate(() => window.pathCalls), 0, "Fresh reload/mount must not generate automatically");
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
});
