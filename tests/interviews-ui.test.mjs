import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import ts from "typescript";
import { interviewDisclosure, interviewLimits, interviewNotices, interviewTopics } from "../src/lib/interviews.ts";

const require = createRequire(import.meta.url);
const sources = Object.fromEntries([
  ["react", "react", "react.development.js"],
  ["react/jsx-runtime", "react", "react-jsx-runtime.development.js"],
  ["react-dom", "react-dom", "react-dom.development.js"],
  ["react-dom/client", "react-dom", "react-dom-client.development.js"],
  ["scheduler", "scheduler", "scheduler.development.js"],
].map(([name, pkg, file]) => [name, readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)), "cjs", file), "utf8")]));
sources["lucide-react"] = readFileSync(require.resolve("lucide-react"), "utf8");
for (const name of ["interview-history", "interview-practice", "learner-shell"]) {
  sources[name] = ts.transpileModule(readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}
const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").replace('@import "tailwindcss";', "") +
  readFileSync(new URL("../src/components/interviews.module.css", import.meta.url), "utf8");
const constants = { interviewDisclosure, interviewLimits, interviewNotices, interviewTopics };

test("network-blocked mounted interview UI and mobile keyboard flows", async context => {
  const browser = await chromium.launch();
  const browserContext = await browser.newContext({ offline: true, serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  context.after(async () => { await browserContext.close(); await browser.close(); });
  const requests = [], errors = [];
  await browserContext.route("**/*", route => { requests.push(route.request().url()); return route.abort(); });
  const page = await browserContext.newPage();
  const screenshots = await mkdtemp(join(tmpdir(), "forge-task25-qa-"));
  context.diagnostic(`Synthetic Task25 screenshots retained: ${screenshots}; Chromium ${browser.version()}`);
  page.setDefaultTimeout(5000);
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent(`<style>${css}</style><div id="root"></div>`);
  await page.evaluate(async ({ sources, constants }) => {
    // about:blank is not a secure application origin; supply UUIDs only for this offline mount.
    let uuid = 0;
    if (!crypto.randomUUID) Object.defineProperty(crypto, "randomUUID", { value: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, "0")}` });
    const modules = {}, rows = new Map(), calls = [], pending = [];
    const copy = x => JSON.parse(JSON.stringify(x));
    let rejectBeforeReserve = false, mount = 0;
    let nextHistoryOutcome = null, nextCreateOutcome = null;
    const pendingHistory = [];
    function historyPage(cursor = null) {
      const ordered = [...rows.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const selected = ordered.filter(row => !cursor || row.created_at < cursor.created_at ||
        (row.created_at === cursor.created_at && row.id < cursor.id)).slice(0, 20);
      const metadata = selected.map(({ id, topic, level, state, revision, created_at, updated_at, completed_at }) =>
        ({ id, topic, level, state, revision, created_at, updated_at, completed_at }));
      const last = metadata.at(-1);
      return { rows: metadata, cursor: metadata.length === 20 ? { id: last.id, created_at: last.created_at } : null };
    }
    let navigate;
    const actions = {
      async createInterview(input) {
        calls.push(["create", input]);
        const row = { ...input, owner_id: crypto.randomUUID(), schema_version: 1, state: "ready", turns: [], revision: 1,
          created_at: "2026-10-15T00:00:00Z", updated_at: "2026-10-15T00:00:00Z", completed_at: null };
        rows.set(row.id, row);
        const outcome = nextCreateOutcome; nextCreateOutcome = null;
        if (outcome === "throw") throw new Error("synthetic lost create acknowledgement");
        if (outcome) return { code: outcome };
        return { code: "ok", interview: copy(row) };
      },
      async listInterviews(cursor) {
        calls.push(["list", cursor]);
        const outcome = nextHistoryOutcome; nextHistoryOutcome = null;
        if (outcome === "throw") throw new Error("synthetic history connection loss");
        if (outcome === "unavailable") return { code: outcome };
        const result = { code: "ok", ...historyPage(cursor) };
        if (outcome === "defer") return new Promise(resolve => pendingHistory.push({ resolve, result }));
        return result;
      },
      async readInterview({ id }) { calls.push(["read", id]); return rows.has(id) ? { code: "ok", interview: copy(rows.get(id)) } : { code: "missing" }; },
      requestInterviewTurn(input) {
        calls.push(["request", input]);
        if (rejectBeforeReserve) { rejectBeforeReserve = false; return Promise.reject(new Error("synthetic lost connection")); }
        const row = rows.get(input.id);
        let turn = row.turns.at(-1);
        if (input.mode !== "retry") {
          turn = { id: input.turnId, kind: input.mode === "start" ? "opening" : "answer", learner: input.text?.trim() ?? null,
            assistant: null, status: "pending", attempts: [] };
          row.turns.push(turn);
        }
        turn.status = "pending";
        turn.attempts.push({ request_id: input.requestId, token: crypto.randomUUID(), outcome: "pending" });
        row.state = "active"; row.revision++;
        return new Promise((resolve, reject) => { pending.push({ resolve, reject, row, turn }); });
      },
      async finishInterview({ id }) {
        calls.push(["finish", id]);
        const row = rows.get(id); row.state = "completed"; row.revision++;
        if (row.turns.at(-1)?.status === "pending") row.turns.at(-1).status = "cancelled";
        return { code: "ok", interview: copy(row) };
      },
      async deleteInterview({ id }) { calls.push(["delete", id]); rows.delete(id); return { code: "deleted" }; },
    };
    function load(name) {
      if (name === "@/lib/interviews") return constants;
      if (name === "@/app/interviews/actions") return actions;
      if (name === "@/app/auth/actions") return { logOut: async () => {} };
      if (name === "./interviews.module.css") return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
      // Dictation is exercised with the real library/native-event mock in interview-dictation.test.mjs.
      if (name === "next/dynamic") return { __esModule: true, default: () => () => null };
      if (name === "next/link") return { __esModule: true, default: ({ children, onClick, href, ...props }) =>
        load("react").createElement("a", { ...props, href, onClick(event) { event.preventDefault(); onClick?.(event); navigate(href); } }, children) };
      if (!modules[name]) {
        if (!sources[name]) throw new Error(`Unexpected offline dependency ${name}`);
        const mod = { exports: {} }; modules[name] = mod;
        new Function("require", "module", "exports", "process", sources[name])(load, mod, mod.exports, { env: { NODE_ENV: "development" } });
      }
      return modules[name].exports;
    }
    const React = load("react");
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    function App() {
      const [path, setPath] = React.useState("/interviews");
      navigate = setPath;
      const row = rows.get(path.split("/")[2]);
      return React.createElement(load("learner-shell").LearnerShell, { active: "/interviews" },
        React.createElement("div", { className: "portal-page" }, row ?
          React.createElement(load("interview-practice").InterviewPractice, { key: row.id, initial: copy(row), aiAvailable: true }) :
          React.createElement(load("interview-history").InterviewHistory, { initialRows: historyPage().rows, initialCursor: historyPage().cursor, aiAvailable: true })));
    }
    const root = load("react-dom/client").createRoot(document.getElementById("root"));
    globalThis.interviewTest = {
      calls, rows, pending, act: React.act,
      rejectNextBeforeReserve() { rejectBeforeReserve = true; },
      historyOutcome(outcome) { nextHistoryOutcome = outcome; },
      createOutcome(outcome) { nextCreateOutcome = outcome; },
      settleHistory() { const item = pendingHistory.shift(); item.resolve(item.result); },
      async seedHistory(count) {
        rows.clear();
        for (let i = 1; i <= count; i++) {
          const id = `10000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
          rows.set(id, { id, topic: "testing", level: "new", state: "ready", revision: 1, turns: [],
            created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z", completed_at: null });
        }
        await React.act(async () => root.render(React.createElement(App, { key: ++mount })));
      },
      async settle(outcome = "ok", text = "How would you verify the change?") {
        const item = pending.shift();
        if (outcome === "throw") { item.reject(new Error("lost connection")); return; }
        if (outcome === "saved_failed") { item.turn.status = "failed"; item.turn.assistant = null; }
        else { item.turn.status = "complete"; item.turn.assistant = text; }
        item.row.revision++;
        item.resolve(outcome === "save_unknown" ? { code: outcome } : { code: outcome, interview: copy(item.row) });
      },
    };
    await React.act(async () => root.render(React.createElement(App)));
  }, { sources, constants });
  async function click(name) {
    await page.getByRole("button", { name, exact: true }).evaluate(button => interviewTest.act(async () => button.click()));
  }
  async function link(name) {
    await page.getByRole("link", { name, exact: true }).evaluate(a => interviewTest.act(async () => a.click()));
  }
  async function settle(outcome, text) {
    await page.evaluate(({ outcome, text }) => interviewTest.act(async () => interviewTest.settle(outcome, text)), { outcome, text });
  }
  async function keyboardButton(name) {
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Space");
    await page.evaluate(() => interviewTest.act(async () => {}));
  }
  async function settleLayout() {
    await page.evaluate(async () => {
      window.scrollTo(0, 0);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})));
    });
  }
  async function capture(state) {
    for (const [width, height] of [[1440, 900], [390, 844], [320, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await settleLayout();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${state}: overflow at ${width}`);
      await page.screenshot({ path: join(screenshots, `${state}-${width}x${height}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await context.test("create empty private history, mobile navigation focus and open saved interview", async () => {
    await page.getByLabel("Focus", { exact: true }).selectOption("verification");
    await click("Create private interview");
    assert.match(await page.getByRole("status").innerText(), /Saved privately/);
    assert.equal(await page.getByRole("status").evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByRole("link", { name: /AI coding agents: output verification.*foundation/ }).count(), 1);
    await capture("history");
    await click("Open navigation");
    assert.equal(await page.getByRole("button", { name: "Close navigation", exact: true }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button", { name: "Open navigation" }).evaluate(el => el === document.activeElement), true);
    await link("Open new interview");
    assert.equal(await page.getByRole("button", { name: "Ask first question" }).count(), 1);
    assert.equal(await page.evaluate(() => interviewTest.calls.filter(c => c[0] === "request").length), 0);
  });
  await context.test("pending is not called saved; plain text reply; keyboard newline and explicit submit", async () => {
    await click("Ask first question");
    assert.match(await page.getByRole("status").innerText(), /not yet confirmed saved/);
    assert.equal(await page.getByRole("button", { name: "Ask first question" }).isDisabled(), true);
    await capture("pending");
    await settle("ok", "<img src=https://forbidden.invalid onerror=alert(1)> Question?");
    assert.equal(await page.locator("img").count(), 0);
    assert.match(await page.getByLabel("Saved interview transcript").innerText(), /<img src=/);
    const input = page.getByRole("textbox");
    await input.fill("Verify the requirements");
    await input.press("Enter");
    await input.pressSequentially("Then inspect tests");
    assert.match(await input.inputValue(), /\n/);
    assert.equal(await page.evaluate(() => interviewTest.calls.filter(c => c[0] === "request").length), 1);
    assert.equal(await input.evaluate(el => getComputedStyle(el).fontSize), "16px");
    await click("Send answer");
    assert.match(await page.getByRole("status").innerText(), /not yet confirmed saved/);
    await settle("saved_failed");
    assert.match(await page.getByLabel("Saved interview transcript").innerText(), /You · saved/);
    assert.match(await page.getByRole("status").innerText(), /No interviewer reply was saved/);
    assert.equal(await page.getByRole("status").evaluate(el => el === document.activeElement), true);
    await capture("failed-retry");
  });
  await context.test("explicit retry sends no replacement text; uncertain save requires reload and confirmed state", async () => {
    await keyboardButton("Retry saved turn");
    const request = await page.evaluate(() => interviewTest.calls.filter(c => c[0] === "request").at(-1)[1]);
    assert.equal(request.mode, "retry"); assert.equal("text" in request, false);
    await settle("save_unknown", "Confirmed only after reload");
    assert.match(await page.getByRole("status").innerText(), /could not confirm/);
    assert.equal(await page.getByText("Confirmed only after reload", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Retry saved turn" }).isDisabled(), true);
    await click("Reload saved interview");
    assert.equal(await page.getByText("Confirmed only after reload", { exact: true }).count(), 1);
    await link("← Private interview history");
    await link("AI coding agents: output verification and code review — foundation");
    assert.equal(await page.getByText("Confirmed only after reload", { exact: true }).count(), 1);
    assert.equal(await page.getByRole("textbox").isEnabled(), true);
  });
  await context.test("keyboard recovery after lost transport preserves an unreserved answer at desktop and narrow widths", async () => {
    for (const [width, height] of [[1440, 900], [390, 844], [320, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await settleLayout();
      const draft = `Unsaved synthetic answer at ${width}`;
      await page.getByRole("textbox").fill(draft);
      await page.getByRole("textbox").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.getByRole("button", { name: "Send answer", exact: true }).evaluate(el => el === document.activeElement), true);
      await page.evaluate(() => interviewTest.rejectNextBeforeReserve());
      await page.keyboard.press("Enter");
      await page.evaluate(() => interviewTest.act(async () => {}));
      assert.match(await page.getByRole("status").innerText(), /Connection lost/);
      assert.equal(await page.getByRole("textbox").inputValue(), draft);
      assert.equal(await page.getByRole("textbox").isDisabled(), true);
      assert.equal(await page.getByRole("status").evaluate(el => el === document.activeElement), true);
      await settleLayout();
      await page.screenshot({ path: join(screenshots, `connection-${width}x${height}.png`), fullPage: true });
      await keyboardButton("Reload saved interview");
      assert.equal(await page.getByRole("textbox").inputValue(), draft);
      assert.equal(await page.getByRole("textbox").isEnabled(), true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
  });
  await context.test("continue, finish during inference, ignore late response, read-only reopen", async () => {
    await page.getByRole("textbox").fill("A second saved answer");
    await click("Send answer");
    await keyboardButton("Finish interview");
    assert.match(await page.locator("body").innerText(), /Interview simulator finished/);
    await settle("ok", "Late text must not appear");
    assert.equal(await page.getByText("Late text must not appear", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("textbox").count(), 0);
    await capture("finished");
    // The synthetic provider does not bypass the real DB tested in interviews.test.mjs.
    await page.evaluate(() => {
      const row = [...interviewTest.rows.values()][0];
      row.turns.at(-1).assistant = null; row.turns.at(-1).status = "cancelled";
    });
    await link("← Private interview history");
    await link("AI coding agents: output verification and code review — foundation");
    assert.equal(await page.getByRole("textbox").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const shot = await page.screenshot();
    assert.ok(shot.length > 1000);
    context.diagnostic(`Mobile finished-state screenshot captured in memory (${shot.length} bytes); no file or network output.`);
  });
  await context.test("individual delete confirmation focus, cancel focus and clear saved text", async () => {
    await keyboardButton("Delete interview");
    assert.equal(await page.getByRole("button", { name: "Delete permanently" }).evaluate(el => el === document.activeElement), true);
    await capture("delete-confirmation");
    await keyboardButton("Keep interview");
    assert.equal(await page.getByRole("button", { name: "Delete interview", exact: true }).evaluate(el => el === document.activeElement), true);
    await keyboardButton("Delete interview");
    await keyboardButton("Delete permanently");
    assert.match(await page.getByRole("status").innerText(), /Interview deleted/);
    assert.equal(await page.getByLabel("Saved interview transcript").count(), 0);
    await link("← Private interview history");
    assert.match(await page.locator("body").innerText(), /No saved interviews/);
  });
  await context.test("delete while inference is pending ignores a late client response", async () => {
    await click("Create private interview"); await link("Open new interview");
    await click("Ask first question");
    await click("Delete interview"); await click("Delete permanently");
    await settle("ok", "Never resurrect deleted conversation");
    assert.equal(await page.getByText("Never resurrect deleted conversation", { exact: true }).count(), 0);
    assert.match(await page.getByRole("status").innerText(), /Interview deleted/);
  });
  await context.test("creating on a full history page must not skip the displaced interview when paging older", async () => {
    await page.evaluate(() => interviewTest.seedHistory(21));
    const ids = () => page.locator("ul.history a").evaluateAll(links => links.map(link => link.getAttribute("href").split("/").at(-1)));
    assert.equal((await ids()).length, 20);
    await keyboardButton("Create private interview");
    const displayed = await ids();
    assert.equal(displayed.length, 20);
    await keyboardButton("Older interviews");
    const seen = [...displayed, ...await ids()];
    const expected = await page.evaluate(() => [...interviewTest.rows.keys()].sort());
    await keyboardButton("Reload latest history");
    const reloaded = await ids();
    await keyboardButton("Older interviews");
    assert.deepEqual([...reloaded, ...await ids()].sort(), expected, "Explicit reload recovers reachability; this is not storage deletion");
    assert.deepEqual(seen.sort(), expected, "Every retained interview must remain reachable after create + Older interviews, without a reload workaround");
  });
  const historyIds = () => page.locator("ul.history a").evaluateAll(links => links.map(link => link.getAttribute("href").split("/").at(-1)));
  async function assertReachable() {
    const seen = [];
    let pages = 0;
    for (;;) {
      const ids = await historyIds();
      assert.ok(ids.length <= 20, "The page cap remains 20");
      seen.push(...ids);
      assert.ok(++pages <= 6, "History continuation must terminate within the retained cap");
      if (!await page.getByRole("button", { name: "Older interviews", exact: true }).count()) break;
      assert.equal(ids.length, 20, "Do not invent continuation for a short canonical page");
      await keyboardButton("Older interviews");
    }
    const expected = await page.evaluate(() => [...interviewTest.rows.keys()].sort());
    assert.deepEqual(seen.sort(), expected, "Every saved ID is reachable exactly once, without reloading");
  }
  for (const count of [18, 20, 41]) {
    await context.test(`create from latest history with ${count} retained rows preserves canonical pagination`, async () => {
      await page.evaluate(count => interviewTest.seedHistory(count), count);
      const callsBefore = await page.evaluate(() => interviewTest.calls.length);
      await keyboardButton("Create private interview");
      const calls = await page.evaluate(start => interviewTest.calls.slice(start), callsBefore);
      assert.deepEqual(calls.map(call => call[0]), ["create", "list"]);
      assert.equal(calls[1][1], null, "Confirmed creation refreshes the canonical latest page");
      assert.match(await page.getByRole("status").innerText(), /Saved privately.*Showing latest history/);
      const createdId = (await page.getByRole("link", { name: "Open new interview" }).getAttribute("href")).split("/").at(-1);
      assert.equal((await historyIds())[0], createdId);
      await assertReachable();
      await link("Open new interview");
      assert.equal(await page.getByRole("button", { name: "Ask first question" }).count(), 1);
    });
  }
  for (const count of [21, 40, 41]) {
    await context.test(`create while browsing older history with ${count} retained rows returns to latest`, async () => {
      await page.evaluate(count => interviewTest.seedHistory(count), count);
      await keyboardButton("Older interviews");
      assert.equal((await historyIds()).length, Math.min(count - 20, 20));
      assert.equal(await page.getByText(/Showing older interviews/).count(), 1);
      await keyboardButton("Create private interview");
      assert.equal(await page.getByText(/Showing latest interviews/).count(), 1);
      assert.match(await page.getByRole("status").innerText(), /Showing latest history/);
      assert.equal(await page.getByRole("status").evaluate(el => el === document.activeElement), true);
      await assertReachable();
    });
  }
  for (const outcome of ["unavailable", "throw"]) {
    await context.test(`confirmed create with ${outcome} refresh keeps the old page and new interview openable`, async () => {
      await page.evaluate(() => interviewTest.seedHistory(41));
      await keyboardButton("Older interviews");
      const previous = await historyIds();
      const boundary = await page.evaluate(id => {
        const row = interviewTest.rows.get(id);
        return { id, created_at: row.created_at };
      }, previous.at(-1));
      const createsBefore = await page.evaluate(() => interviewTest.calls.filter(call => call[0] === "create").length);
      await page.evaluate(outcome => interviewTest.historyOutcome(outcome), outcome);
      await keyboardButton("Create private interview");
      assert.deepEqual(await historyIds(), previous, "Failed refresh must not partially change the selected page");
      assert.equal(await page.getByText(/Showing older interviews/).count(), 1);
      assert.match(await page.getByRole("status").innerText(), /Saved privately.*could not be refreshed.*previous page is unchanged/);
      assert.doesNotMatch(await page.getByRole("status").innerText(), /could not confirm|Connection lost/);
      assert.equal(await page.getByRole("status").evaluate(el => el === document.activeElement), true);
      assert.equal(await page.getByRole("link", { name: "Open new interview" }).count(), 1);
      assert.equal(await page.getByRole("button", { name: "Create private interview" }).isEnabled(), true);
      if (outcome === "unavailable") await capture("history-refresh-failed");
      await keyboardButton("Older interviews");
      assert.deepEqual(await page.evaluate(() => interviewTest.calls.at(-1)), ["list", boundary], "Keep the matching old cursor, not a guessed boundary");
      assert.equal((await historyIds()).length, 1);
      await keyboardButton("Reload latest history");
      await assertReachable();
      assert.equal(await page.evaluate(() => interviewTest.calls.filter(call => call[0] === "create").length), createsBefore + 1, "Refresh/recovery never replays creation");
      await link("Open new interview");
      assert.equal(await page.getByRole("button", { name: "Ask first question" }).count(), 1);
    });
  }
  await context.test("in-flight create/refresh and older-page load exclude overlapping history requests and duplicate submits", async () => {
    for (const first of ["create", "older"]) {
      await page.evaluate(() => interviewTest.seedHistory(41));
      const callsBefore = await page.evaluate(() => interviewTest.calls.length);
      await page.evaluate(first => interviewTest.act(async () => {
        interviewTest.historyOutcome("defer");
        const form = document.getElementById("interview-topic").form;
        const button = name => [...document.querySelectorAll("button")].find(button => button.textContent === name);
        const submit = () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        if (first === "older") button("Older interviews").click();
        else submit();
        // All dispatched before React can commit disabled controls.
        submit(); submit();
        button("Reload latest history").click(); button("Older interviews").click();
      }), first);
      const calls = await page.evaluate(start => interviewTest.calls.slice(start), callsBefore);
      assert.deepEqual(calls.map(call => call[0]), first === "create" ? ["create", "list"] : ["list"]);
      for (const name of ["Create private interview", "Reload latest history", "Older interviews"]) {
        assert.equal(await page.getByRole("button", { name, exact: true }).isDisabled(), true);
      }
      if (first === "create") {
        assert.match(await page.getByRole("status").innerText(), /Saved privately.*Refreshing latest history/);
        assert.equal(await page.getByRole("link", { name: "Open new interview" }).count(), 1);
      }
      await page.evaluate(() => interviewTest.act(async () => interviewTest.settleHistory()));
      if (first === "older") await keyboardButton("Create private interview");
      assert.match(await page.getByRole("status").innerText(), /Showing latest history/);
      await assertReachable();
    }
  });
  await context.test("lost creation acknowledgement stays uncertain until explicit reload and never auto-refreshes or replays", async () => {
    for (const outcome of ["create_unknown", "throw"]) {
      await page.evaluate(() => interviewTest.seedHistory(21));
      const previous = await historyIds();
      const callsBefore = await page.evaluate(() => interviewTest.calls.length);
      await page.evaluate(outcome => interviewTest.createOutcome(outcome), outcome);
      await keyboardButton("Create private interview");
      assert.deepEqual(await historyIds(), previous);
      assert.match(await page.getByRole("status").innerText(), outcome === "throw" ? /Connection lost/ : /could not confirm whether.*created/);
      assert.equal(await page.getByRole("link", { name: "Open new interview" }).count(), 0);
      assert.equal(await page.getByRole("button", { name: "Create private interview" }).isDisabled(), true);
      assert.deepEqual(await page.evaluate(start => interviewTest.calls.slice(start).map(call => call[0]), callsBefore), ["create"]);
      await keyboardButton("Reload latest history");
      assert.equal(await page.getByRole("button", { name: "Create private interview" }).isEnabled(), true);
      await assertReachable();
      assert.equal(await page.evaluate(start => interviewTest.calls.slice(start).filter(call => call[0] === "create").length, callsBefore), 1);
    }
  });
  context.diagnostic(`Network attempts: ${requests.length}; page errors: ${errors.length}; contexts close in test cleanup.`);
  assert.deepEqual(requests, []);
  assert.deepEqual(errors, []);
});
