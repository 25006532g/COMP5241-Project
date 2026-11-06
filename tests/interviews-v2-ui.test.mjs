import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { introBubble, v2Notices, v2Profiles } from "../src/lib/interviews-v2.ts";

const require = createRequire(import.meta.url);
const sources = Object.fromEntries([
  ["react", "react", "react.development.js"],
  ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"],
  ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
].map(([name, pkg, file]) => [name, readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
for (const name of ["interview-v2-room", "interview-v2-dictation"]) {
  sources[name] = ts.transpileModule(readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const css = readFileSync(new URL("../src/components/interview-v2.module.css", import.meta.url), "utf8");
const view = {
  session: { id: "00000000-0000-4000-8000-000000000091", ownerId: "00000000-0000-4000-8000-000000000092", profileId: "frontend_engineer", label: v2Profiles.frontend_engineer.label, interviewer: "senior", state: "intro", revision: 1, presented: 0 },
  bubble: introBubble, wordTarget: 130, turns: [], summary: null, ratingState: "pending", canAnswer: true,
};

test("simulator v2 room keeps the side bubble, word count and end control", async context => {
  const browser = await chromium.launch();
  const browserContext = await browser.newContext({ offline: true, viewport: { width: 1280, height: 800 } });
  context.after(async () => { await browserContext.close(); await browser.close(); });
  const page = await browserContext.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent(`<style>${css}</style><div id="root"></div>`);
  await page.evaluate(async ({ sources, view, notices }) => {
    const calls = [];
    window.__v2Calls = calls;
    const modules = {};
    const finished = { ...view, session: { ...view.session, state: "complete", revision: 2 }, bubble: null, wordTarget: null, ratingState: "empty", canAnswer: false };
    function load(name) {
      if (name === "@/lib/interviews-v2") return { wordCount: text => text.trim() ? text.trim().split(/\s+/).length : 0, v2Notices: notices };
      if (name === "@/app/interviews-v2/actions") return new Proxy({}, { get: (_, key) => async payload => { calls.push([key, payload]); return { code: "ok", view: finished }; } });
      if (name === "next/link") return { __esModule: true, default: ({ children, href }) => load("react").createElement("a", { href }, children) };
      if (name === "./interview-v2.module.css") return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
      if (name === "./interview-v2-dictation" || name === "@/components/interview-v2-dictation") return load("interview-v2-dictation");
      if (name === "react-speech-recognition") return {
        __esModule: true,
        default: { startListening: async () => {}, stopListening: async () => {}, abortListening: async () => {}, getRecognition: () => null },
        useSpeechRecognition: () => ({ browserSupportsSpeechRecognition: false, isMicrophoneAvailable: false }),
      };
      if (!modules[name]) {
        if (!sources[name]) throw new Error(`Unexpected offline dependency ${name}`);
        const mod = { exports: {} };
        modules[name] = mod;
        new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
      }
      return modules[name].exports;
    }
    const React = load("react");
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    await React.act(async () => load("react-dom/client").createRoot(document.getElementById("root")).render(
      React.createElement(load("interview-v2-room").InterviewV2Room, { initial: view })));
  }, { sources, view, notices: { ok: v2Notices.ok, empty: v2Notices.empty, unrated: v2Notices.unrated } });
  assert.deepEqual(errors, []);
  await page.getByText(introBubble).waitFor();
  await page.getByRole("img", { name: "Cartoon senior interviewer" }).waitFor();
  const layers = await page.locator("[data-layer]").evaluateAll(nodes => nodes.map(node => ({
    layer: node.getAttribute("data-layer"),
    z: getComputedStyle(node).zIndex,
    src: node.getAttribute("src") || "",
  })));
  assert.deepEqual(layers.map(layer => layer.layer), ["office", "interviewer", "table", "interviewee", "question"]);
  assert.deepEqual(layers.map(layer => layer.z), ["1", "2", "3", "4", "5"]);
  assert.equal(layers[1].src, "/interviews-v2/room/01-interviewer-male.png");
  assert.equal(layers[3].src, "/interviews-v2/room/03-interviewee-male-back.png");
  await page.getByRole("button", { name: "Record" }).waitFor();
  await page.getByRole("button", { name: "Send answer" }).waitFor();
  await page.getByRole("button", { name: "Stop" }).waitFor();
  await page.getByRole("button", { name: "Insert" }).waitFor();
  assert.equal(await page.locator("#intro-word-count").innerText(), "0/130");
  await page.locator("#v2-answer").fill("one two three");
  assert.equal(await page.locator("#intro-word-count").innerText(), "3/130");
  await page.getByRole("button", { name: "End interview" }).click();
  await page.getByText(v2Notices.empty).waitFor();
  const calls = await page.evaluate(() => window.__v2Calls);
  assert.equal(calls[0][0], "endSession");
  assert.equal(calls[0][1].text, undefined);
  assert.deepEqual(errors, []);
});

test("simulator v2 room art is present for both presentations", () => {
  for (const file of [
    "01-interviewer-male.png",
    "02-interviewer-female.png",
    "03-interviewee-male-back.png",
    "04-interviewee-female-back.png",
    "05-office-background.png",
    "06-table.png",
  ]) assert.equal(existsSync(new URL(`../public/interviews-v2/room/${file}`, import.meta.url)), true, file);
});
