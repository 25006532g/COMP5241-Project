import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import ts from "typescript";
import { chromium } from "@playwright/test";
import * as constants from "../src/lib/interviews.ts";

const require = createRequire(import.meta.url);
const sources = {};
for (const [name, pkg, file] of [
  ["react", "react", "react.development.js"], ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"], ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
]) sources[name] = readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "cjs", file), "utf8");
const speechEntry = require.resolve("react-speech-recognition");
sources["react-speech-recognition"] = readFileSync(speechEntry, "utf8");
const helperName = /require\('(\.\/cc-[^']+\.cjs)'\)/.exec(sources["react-speech-recognition"])[1];
sources[helperName] = readFileSync(join(dirname(speechEntry), helperName), "utf8");
sources["lodash.debounce"] = readFileSync(require.resolve("lodash.debounce"), "utf8");
for (const name of ["interview-practice", "interview-dictation"]) sources[name] = ts.transpileModule(
  readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
const css = readFileSync(new URL("../src/components/interviews.module.css", import.meta.url), "utf8");

test("optional dictation: actual React 19 UI + speech library, mocked native API, network blocked", async context => {
  const browser = await chromium.launch();
  const bc = await browser.newContext({ offline: true, serviceWorkers: "block" });
  context.after(async () => { await bc.close(); await browser.close(); });
  const requests = [], errors = [];
  await bc.route("**/*", route => { requests.push(route.request().url()); return route.abort(); });
  const screenshots = await mkdtemp(join(tmpdir(), "forge-interview-simulator-"));
  context.diagnostic(`Screenshots: ${screenshots}; Chromium ${browser.version()}`);

  async function mount({ supported = true, eligible = true } = {}) {
    const page = await bc.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.setContent(`<style>body{margin:12px;font-family:Arial}*{box-sizing:border-box} .learning-form{display:grid;gap:12px}${css}</style><div id="root"></div>`);
    await page.evaluate(async ({ sources, constants, supported, eligible }) => {
      const modules = {}, nativeCalls = [], actionCalls = [];
      let native, autoEnd = true, serial = 0, generation = 0, lateResult, hidden = false;
      if (!crypto.randomUUID) Object.defineProperty(crypto, "randomUUID", { value: () => `00000000-0000-4000-8000-${String(++serial).padStart(12, "0")}` });
      class MockRecognition extends EventTarget {
        constructor() {
          super();
          // Keep the native fixture reachable for explicit browser event injection.
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          native = this;
        }
        start() { nativeCalls.push(["start", this.lang, this.continuous]); }
        stop() { nativeCalls.push(["stop"]); if (autoEnd) queueMicrotask(() => this.emit("end")); }
        abort() { nativeCalls.push(["abort"]); if (autoEnd) queueMicrotask(() => this.emit("end")); }
        emit(type, payload = {}) {
          const event = Object.assign(new Event(type), payload);
          this[`on${type}`]?.(event);
          this.dispatchEvent(event);
        }
        addEventListener(type, fn, ...args) {
          if (type === "result") lateResult = fn;
          super.addEventListener(type, fn, ...args);
        }
      }
      for (const key of ["SpeechRecognition", "webkitSpeechRecognition", "mozSpeechRecognition", "msSpeechRecognition", "oSpeechRecognition"]) {
        Object.defineProperty(window, key, { configurable: true, value: supported ? MockRecognition : undefined });
      }
      const copy = value => JSON.parse(JSON.stringify(value));
      const fresh = () => ({ id: crypto.randomUUID(), owner_id: crypto.randomUUID(), topic: "technical", level: "foundation",
        state: "active", revision: 2, turns: [{ id: crypto.randomUUID(), kind: "opening", learner: null,
          assistant: "How would you locate a duplicate value?", status: "complete", attempts: [] }] });
      let row = fresh(), denied = false;
      const actions = {
        async requestInterviewTurn(input) {
          actionCalls.push(["request", input]);
          if (denied) return { code: "denied" };
          row.turns.push({ id: input.turnId, kind: "answer", learner: input.text, assistant: "What changes if memory is constrained?", status: "complete", attempts: [] });
          row.revision++; return { code: "ok", interview: copy(row) };
        },
        async readInterview() { actionCalls.push(["read"]); row.revision++; return { code: "ok", interview: copy(row) }; },
        async finishInterview() { actionCalls.push(["finish"]); row.state = "completed"; row.revision++; return { code: "ok", interview: copy(row) }; },
        async deleteInterview() { actionCalls.push(["delete"]); return { code: "deleted" }; },
      };
      function load(name) {
        if (name === "@/lib/interviews") return constants;
        if (name === "@/app/interviews/actions") return actions;
        if (name === "./interviews.module.css") return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
        if (name === "next/dynamic") return { __esModule: true, default: () => load("interview-dictation").InterviewDictation };
        if (name === "next/link") return { __esModule: true, default: ({ children, ...props }) => load("react").createElement("a", {
          ...props, onClick: event => { event.preventDefault(); root.unmount(); },
        }, children) };
        if (!modules[name]) {
          if (!sources[name]) throw new Error(`Unexpected dependency ${name}`);
          const mod = { exports: {} }; modules[name] = mod;
          new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
        }
        return modules[name].exports;
      }
      const React = load("react"), root = load("react-dom/client").createRoot(document.getElementById("root"));
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const render = () => root.render(React.createElement(load("interview-practice").InterviewPractice,
        { key: ++generation, initial: copy(row), aiAvailable: eligible }));
      Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
      globalThis.voiceTest = {
        nativeCalls, actionCalls, act: React.act,
        result(parts) { native.emit("result", { resultIndex: 0, results: parts.map(([text, final]) => Object.assign([{ transcript: text, confidence: 1 }], { isFinal: final })) }); },
        error(error) { native.emit("error", { error }); },
        end() { native.emit("end"); },
        holdEnd(value) { autoEnd = !value; },
        revoke() { denied = true; },
        late() { lateResult?.({ results: [[{ transcript: "STALE TEXT" }]] }); },
        hide() { hidden = true; document.dispatchEvent(new Event("visibilitychange")); },
        async newInterview(allowed = true) { eligible = allowed; row = fresh(); await React.act(async () => render()); },
      };
      await React.act(async () => render());
    }, { sources, constants: Object.fromEntries(["interviewDisclosure", "interviewLimits", "interviewNotices", "interviewTopics"].map(k => [k, constants[k]])), supported, eligible });
    page.setDefaultTimeout(5000);
    return page;
  }
  const answer = page => page.getByRole("textbox", { name: /^Your answer \(saved only after server confirmation\)/ });
  const preview = page => page.getByRole("textbox", { name: /^Dictation preview \(not saved\)/ });
  const calls = page => page.evaluate(() => voiceTest.nativeCalls);
  async function click(page, name) {
    await page.getByRole("button", { name, exact: true }).evaluate(button => voiceTest.act(async () => button.click()));
  }
  async function optIn(page) { await page.getByRole("checkbox").check(); }
  async function result(page, parts) { await page.evaluate(parts => voiceTest.act(async () => voiceTest.result(parts)), parts); }

  await context.test("unsupported and ineligible accounts have text/history management but never start a microphone", async () => {
    for (const options of [{ supported: false }, { eligible: false }]) {
      const page = await mount(options);
      if (options.supported === false) assert.match(await page.getByLabel("Optional answer dictation").innerText(), /unsupported.*Type your answer/);
      else {
        assert.equal(await page.getByLabel("Optional answer dictation").count(), 0);
        assert.equal(await answer(page).isDisabled(), true);
      }
      assert.deepEqual(await calls(page), []);
      assert.equal(await page.getByRole("button", { name: "Finish interview", exact: true }).isEnabled(), true);
      assert.equal(await page.getByRole("button", { name: "Delete interview", exact: true }).isEnabled(), true);
      await page.close();
    }
  });
  await context.test("opt-in, interim/final replacement, review/edit, insertion preserves typing and never auto-sends", async () => {
    const page = await mount();
    await answer(page).fill("Typed draft");
    assert.equal(await page.getByRole("button", { name: "Start dictation", exact: true }).isDisabled(), true);
    assert.match(await page.getByText(/Your browser may send audio/).innerText(), /not guaranteed offline or accurate/);
    assert.deepEqual(await calls(page), []);
    await optIn(page); await click(page, "Start dictation");
    assert.deepEqual((await calls(page))[0], ["start", "en-US", false]);
    await result(page, [["I would", false]]);
    await result(page, [["I would inspect", false]]);
    await result(page, [["I would inspect", true]]);
    await result(page, [["I would inspect", true], ["the inputs", false]]);
    await result(page, [["I would inspect", true], ["the inputs", true]]);
    await result(page, [["I would inspect", true], ["the inputs", true]]);
    assert.equal(await preview(page).inputValue(), "I would inspect the inputs");
    assert.equal(await answer(page).inputValue(), "Typed draft");
    assert.equal(await page.getByRole("button", { name: "Insert into answer", exact: true }).isDisabled(), true);
    await click(page, "Stop dictation");
    assert.equal(await preview(page).evaluate(el => el === document.activeElement), true);
    await preview(page).fill("Reviewed dictation");
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: join(screenshots, `dictation-review-${width}.png`), fullPage: true });
    }
    await click(page, "Insert into answer");
    assert.equal(await answer(page).inputValue(), "Typed draft\nReviewed dictation");
    assert.equal(await answer(page).evaluate(el => el === document.activeElement), true);
    assert.equal(await page.evaluate(() => voiceTest.actionCalls.length), 0);
    await click(page, "Start dictation");
    await result(page, [["discard this", true]]);
    await click(page, "Stop dictation"); await click(page, "Discard dictation");
    assert.equal(await answer(page).inputValue(), "Typed draft\nReviewed dictation");
    await click(page, "Send answer");
    assert.deepEqual(await page.evaluate(() => voiceTest.actionCalls.map(c => c[0])), ["request"]);
    assert.equal(await answer(page).inputValue(), "");
    assert.equal(await preview(page).inputValue(), "");
    assert.equal(await page.getByRole("checkbox").isChecked(), false);
    await page.evaluate(() => voiceTest.act(async () => voiceTest.late()));
    assert.equal(await preview(page).inputValue(), "");
    await page.close();
  });
  await context.test("overflow is editable and not truncated, preserving a 1,200-character typed draft", async () => {
    const page = await mount();
    await answer(page).fill("T".repeat(1200));
    await optIn(page); await click(page, "Start dictation");
    await result(page, [["X".repeat(1300), true]]); await click(page, "Stop dictation");
    assert.equal((await preview(page).inputValue()).length, 1300);
    assert.match(await page.getByText(/characters after insertion/).innerText(), /Too long.*Nothing will be truncated/);
    assert.equal(await page.getByRole("button", { name: "Insert into answer", exact: true }).isDisabled(), true);
    await preview(page).fill("Shortened");
    await answer(page).fill("Typed");
    assert.equal(await page.getByRole("button", { name: "Insert into answer", exact: true }).isEnabled(), true);
    await click(page, "Discard dictation");
    assert.equal(await answer(page).inputValue(), "Typed");
    assert.equal(await page.evaluate(() => voiceTest.actionCalls.length), 0);
    await page.close();
  });
  await context.test("permission denial and other native errors expose fallback without sending or losing typing", async () => {
    for (const error of ["not-allowed", "audio-capture", "network", "no-speech"]) {
      const page = await mount();
      await answer(page).fill("Keep me");
      await optIn(page); await click(page, "Start dictation");
      await page.evaluate(error => voiceTest.act(async () => voiceTest.error(error)), error);
      assert.match(await page.getByLabel("Optional answer dictation").innerText(), /Type instead/);
      if (error === "not-allowed") assert.match(await page.getByLabel("Optional answer dictation").innerText(), /permission denied/);
      await page.evaluate(() => voiceTest.act(async () => voiceTest.late()));
      assert.equal(await preview(page).inputValue(), "");
      assert.equal(await answer(page).inputValue(), "Keep me");
      assert.equal(await page.evaluate(() => voiceTest.actionCalls.length), 0);
      await page.close();
    }
  });
  await context.test("hidden/unmount/turn changes abort, quarantine ownership until end, and reject stale callbacks", async () => {
    const page = await mount();
    await optIn(page); await click(page, "Start dictation");
    await result(page, [["Unsaved preview", false]]);
    await page.evaluate(() => voiceTest.act(async () => { voiceTest.holdEnd(true); voiceTest.hide(); }));
    assert.ok((await calls(page)).some(c => c[0] === "abort"));
    await page.evaluate(() => voiceTest.act(async () => voiceTest.late()));
    assert.equal(await preview(page).inputValue(), "Unsaved preview");
    await page.evaluate(() => voiceTest.newInterview());
    assert.equal(await preview(page).inputValue(), "");
    await optIn(page); await click(page, "Start dictation");
    assert.equal((await calls(page)).filter(c => c[0] === "start").length, 1, "Cannot take ownership until old native end");
    await page.evaluate(() => voiceTest.act(async () => { voiceTest.end(); voiceTest.holdEnd(false); }));
    await click(page, "Start dictation");
    await result(page, [["New interview only", true]]); await click(page, "Stop dictation");
    assert.equal(await preview(page).inputValue(), "New interview only");
    await click(page, "Discard dictation"); await click(page, "Start dictation");
    await click(page, "Reload saved interview");
    await page.evaluate(() => voiceTest.act(async () => voiceTest.late()));
    assert.equal(await preview(page).inputValue(), "");
    await optIn(page); await click(page, "Start dictation");
    await page.getByRole("link", { name: "← Private interview history", exact: true }).evaluate(a => voiceTest.act(async () => a.click()));
    assert.ok((await calls(page)).filter(c => c[0] === "abort").length >= 3);
    await page.close();
  });
  await context.test("send, finish and delete stop capture; early finish creates no AI feedback", async () => {
    for (const operation of ["Send answer", "Finish interview", "Delete interview"]) {
      const page = await mount();
      await answer(page).fill("Typed, not dictated");
      await optIn(page); await click(page, "Start dictation");
      await result(page, [["Uninserted text", false]]);
      await click(page, operation);
      if (operation === "Delete interview") await click(page, "Delete permanently");
      assert.ok((await calls(page)).some(c => c[0] === "abort"));
      await page.evaluate(() => voiceTest.act(async () => voiceTest.late()));
      const actionCalls = await page.evaluate(() => voiceTest.actionCalls);
      if (operation === "Send answer") {
        assert.equal(actionCalls[0][1].text, "Typed, not dictated");
        assert.equal(await preview(page).inputValue(), "");
      } else {
        assert.equal(actionCalls.filter(c => c[0] === "request").length, 0);
        assert.equal(await page.getByLabel("Optional answer dictation").count(), 0);
      }
      await page.close();
    }
  });
  await context.test("server-denied AI removes dictation and preserves the unsaved typed draft", async () => {
    const page = await mount();
    await answer(page).fill("Do not lose this");
    await optIn(page); await click(page, "Start dictation");
    await page.evaluate(() => voiceTest.revoke());
    await click(page, "Send answer");
    assert.equal(await page.getByLabel("Optional answer dictation").count(), 0);
    assert.equal(await answer(page).inputValue(), "Do not lose this");
    assert.equal(await answer(page).isDisabled(), true);
    assert.ok((await calls(page)).some(c => c[0] === "abort"));
    await click(page, "Finish interview");
    assert.equal(await page.getByRole("button", { name: "Delete interview", exact: true }).isEnabled(), true);
    await page.close();
  });
  assert.deepEqual(requests, [], "No speech/provider/browser network requests");
  assert.deepEqual(errors, [], "No uncaught browser errors");
});
