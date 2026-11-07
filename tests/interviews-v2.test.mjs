import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import { z } from "zod";
import * as v2 from "../src/lib/interviews-v2.ts";
import * as eligibility from "../src/lib/eligibility.ts";
import * as permissions from "../src/lib/permissions.ts";

const sources = {};
for (const path of ["lib/learning-server", "lib/ai-eligibility-server", "lib/interviews-v2-ai", "lib/interviews-v2-server", "app/interviews-v2/actions"]) {
  sources[`@/${path}`] = ts.transpileModule(await readFile(new URL(`../src/${path}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

test("v2 question routing, word count and bank schema", () => {
  assert.equal(v2.wordCount("  hello   world "), 2);
  assert.equal(v2.wordCount(" \n"), 0);
  assert.equal(v2.keywordHit("Use an index here", ["index"]), true);
  assert.equal(v2.keywordHit("indexes only", ["index"]), false);
  assert.equal(v2.keywordHit("Binary Search works", ["binary search"]), true);
  const ids = Array.from({ length: 12 }, (_, index) => `q${index}`);
  const drawn = v2.drawPrimary(ids, () => 0.2);
  assert.ok(drawn);
  assert.equal(drawn.length, 7);
  assert.equal(new Set(drawn).size, drawn.length);
  const follow = "follow";
  assert.deepEqual(v2.chooseNext({ presentedAfter: 2, relatedIds: [follow], askedIds: ["current"], plannedRemaining: ["next"], keywordMatched: true }), { type: "ask", id: follow, reason: "keyword" });
  const ai = v2.chooseNext({ presentedAfter: 2, relatedIds: [follow], askedIds: ["current"], plannedRemaining: ["next"], keywordMatched: false });
  assert.equal(ai.type, "ai");
  assert.deepEqual(v2.chooseNext({
    presentedAfter: 2, relatedIds: ["rate", "tree"], askedIds: ["current"], plannedRemaining: ["planned"], keywordMatched: false,
    answer: "I would use a token bucket so bursts stay within the limit.",
    related: [
      { id: "rate", prompt: "How would you design a rate limiter for an API?", keywords: ["bucket", "limiter"] },
      { id: "tree", prompt: "When is a balanced tree better than a plain one?", keywords: ["avl", "rotation"] },
    ],
  }), { type: "ask", id: "rate", reason: "keyword" });
  const tokenLead = v2.bridgeLead("I would use a token bucket so bursts stay small.", ["bucket"], () => 0);
  const otherLead = v2.bridgeLead("I would use a token bucket so bursts stay small.", ["bucket"], () => 0.9);
  assert.match(tokenLead ?? "", /token bucket/i);
  assert.doesNotMatch(tokenLead ?? "", /^Since you mentioned/i);
  assert.notEqual(tokenLead, otherLead);
  assert.match(otherLead ?? "", /token bucket/i);
  const partial = v2.chooseNext({
    presentedAfter: 2, relatedIds: ["cache", "tree"], askedIds: ["current"], plannedRemaining: ["planned"], keywordMatched: false,
    answer: "The read path used a cache.",
    related: [
      { id: "cache", prompt: "How does a cache change a read path?", keywords: ["invalidation"] },
      { id: "tree", prompt: "When is a balanced tree better?", keywords: ["rotation"] },
    ],
  });
  assert.equal(partial.type, "ai");
  assert.deepEqual(partial.candidates, ["cache"]);
  const missed = v2.chooseNext({
    presentedAfter: 2, relatedIds: ["cache"], askedIds: ["current"], plannedRemaining: ["planned"], keywordMatched: false,
    answer: "I enjoyed the team lunch and the office.",
    related: [{ id: "cache", prompt: "How does a cache change a read path?", keywords: ["invalidation"] }],
  });
  assert.equal(missed.type, "ai");
  assert.deepEqual(missed.candidates, ["cache"]);
  assert.deepEqual(v2.chooseNext({
    presentedAfter: 2, relatedIds: ["graph-b", "graph-a"], askedIds: ["current"], plannedRemaining: ["planned"], keywordMatched: true,
    answer: "I mentioned an index on the table.",
    related: [
      { id: "graph-a", prompt: "When is a query language better?", keywords: ["graphql"] },
      { id: "graph-b", prompt: "How do bundlers split code?", keywords: ["webpack"] },
    ],
  }), { type: "ask", id: "graph-b", reason: "keyword" });
  assert.deepEqual(v2.chooseNext({
    presentedAfter: 2, relatedIds: ["second", "first"], askedIds: ["current"], plannedRemaining: ["planned"], keywordMatched: true,
    answer: "I would use a cache for repeated reads.",
    related: [
      { id: "first", prompt: "How does caching work there?", keywords: ["cache"] },
      { id: "second", prompt: "How does caching work here?", keywords: ["cache"] },
    ],
  }), { type: "ask", id: "second", reason: "keyword" });
  assert.deepEqual(v2.chooseAfterSkip({ presentedAfter: 2, askedIds: ["current"], plannedRemaining: ["next"] }), { type: "ask", id: "next", reason: "planned" });
  assert.equal(v2.chooseReplacement({ currentId: "current", relatedIds: ["rel", "asked"], askedIds: ["current", "asked"], poolIds: ["current", "rel", "asked", "other"], random: () => 0 }), "rel");
  assert.equal(v2.chooseReplacement({ currentId: "current", relatedIds: [], askedIds: ["current"], poolIds: ["current", "a", "b"], random: () => 0 }), "a");
  assert.equal(v2.chooseReplacement({ currentId: "only", relatedIds: [], askedIds: ["only"], poolIds: ["only"], random: () => 0 }), null);
  assert.equal(v2.localFeedback("Short", "Use an index", ["index"]).band, "missed");
  assert.match(v2.localFeedback("Short", "Use an index on foreign keys for joins", ["index"]).comment, /index|suggested answer/i);
  const feedbackPartial = v2.localFeedback(
    "I talk about API performance with users when systems grow larger over time across several teams and services during busy product launches where latency problems appear under heavy traffic patterns",
    "Prefer an index for join lookups; caching helps reads but can stale writes",
    ["index", "cache"],
  );
  assert.equal(feedbackPartial.band, "partial");
  assert.match(feedbackPartial.comment, /index|cache|suggested/i);
  assert.notEqual(feedbackPartial.comment, v2.localFeedback("Short", "Use an index", ["index"]).comment);
  assert.equal(v2.introBubble, "First, please introduce yourself in about one minute.");
  assert.match(v2.v2IntroStrategies.software_engineer, /Present → Past → Future/);
  assert.match(v2.v2IntroStrategies.software_engineer, /Greeting & name/);
  assert.ok(v2.v2IntroStrategies.software_engineer.length <= 2000);
  assert.equal(v2.chooseNext({ presentedAfter: v2.sessionItemCap - 1, relatedIds: [follow], askedIds: [], plannedRemaining: ["next"], keywordMatched: true }).type, "ask");
  assert.equal(v2.chooseNext({ presentedAfter: v2.sessionItemCap, relatedIds: [follow], askedIds: [], plannedRemaining: ["next"], keywordMatched: true }).type, "rate");
  assert.equal(v2.importFileSchema.safeParse({ profile: "frontend_engineer", questions: [{ key: "a", kind: "primary", prompt: "Q", sampleAnswer: "A", keywords: [], relatedKeys: ["missing"] }] }).success, false);
});

async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as 'select null::uuid';`);
  await db.exec(await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter(name => name.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }
  return db;
}

function harness(db, owner) {
  const payloads = [];
  const state = { user: { id: owner, app_metadata: { role: "learner", ai_access: true } }, age: 22, provider: async () => "{\"questionId\":\"none\"}" };
  const client = {
    auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
    from(table) {
      const filters = [];
      const orders = [];
      let limit = null;
      const query = {
        select() { return this; },
        eq(key, value) { filters.push(["eq", key, value]); return this; },
        in(key, value) { filters.push(["in", key, value]); return this; },
        order(key, options) { orders.push(`${key} ${options?.ascending === false ? "desc" : "asc"}`); return this; },
        limit(value) { limit = value; return this; },
        async run(single) {
          if (table === "profiles") {
            const row = { id: owner, age: state.age, display_name: "Learner" };
            return { data: single ? row : [row], error: null };
          }
          const params = [];
          const where = filters.map(([op, key, value]) => {
            params.push(value);
            return op === "in" ? `${key} = any($${params.length}::uuid[])` : `${key} = $${params.length}`;
          }).join(" and ");
          const result = await db.query(`select * from ${table}${where ? ` where ${where}` : ""}${orders.length ? ` order by ${orders.join(",")}` : ""}${limit ? ` limit ${limit}` : ""}`, params);
          return { data: single ? result.rows[0] ?? null : result.rows, error: null };
        },
        maybeSingle() { return this.run(true); },
        then(resolve, reject) { return this.run(false).then(resolve, reject); },
      };
      return query;
    },
    async rpc(name, args) {
      const entries = Object.entries(args);
      const result = await db.query(`select ${name}(${entries.map(([key], index) => `${key} => $${index + 1}`).join(",")}) as result`, entries.map(([, value]) => value));
      return { data: result.rows[0].result, error: null };
    },
  };
  const cache = {};
  const mocks = {
    "server-only": {}, "node:crypto": { randomUUID }, zod: { z },
    "@/lib/interviews-v2": v2, "@/lib/eligibility": eligibility, "@/lib/permissions": permissions,
    "@/lib/learning": {}, "next/navigation": { redirect() { throw new Error("redirect"); } },
    "@/lib/supabase/server": { createClient: async () => client },
    "@supabase/supabase-js": { createClient: () => client },
    "@/lib/openrouter-client": { completion: async (...args) => { payloads.push(args); return state.provider(...args); } },
  };
  function load(name) {
    if (name in mocks) return mocks[name];
    if (!sources[name]) throw new Error(`Unexpected dependency ${name}`);
    if (!cache[name]) {
      const exports = {};
      cache[name] = exports;
      runInNewContext(sources[name], { exports, require: load, TextEncoder, process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic" } }, fetch() { throw new Error("Network forbidden"); } });
    }
    return cache[name];
  }
  return { actions: load("@/app/interviews-v2/actions"), state, payloads };
}

const bank = {
  profile: "frontend_engineer",
  questions: [
    ...Array.from({ length: 7 }, (_, index) => ({
      key: `fe-${index + 1}`, kind: "primary", prompt: `Primary question ${index + 1}`, sampleAnswer: `Sample ${index + 1}`,
      keywords: ["index"], relatedKeys: ["fe-follow"],
    })),
    { key: "fe-follow", kind: "followup", prompt: "How does the index change the lookup?", sampleAnswer: "It narrows the scanned rows.", keywords: [], relatedKeys: ["fe-other"] },
    { key: "fe-other", kind: "followup", prompt: "When would you skip an index?", sampleAnswer: "When the table is tiny.", keywords: [], relatedKeys: [] },
  ],
};

test("v2 migration, bank, session and rating stay off the original interview table", async context => {
  const db = await database();
  context.after(() => db.close());
  assert.equal((await db.query("select count(*)::int as n from forge_v2_profiles")).rows[0].n, 6);
  const owner = randomUUID();
  await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"age\":22,\"age_range\":\"18-24\",\"display_name\":\"Learner\"}')", [owner]);
  await db.exec("set role authenticated");
  await assert.rejects(db.query("select * from forge_v2_questions"), /permission denied/);
  await db.exec("reset role");
  const h = harness(db, owner);
  h.state.user.app_metadata.role = "learner";
  assert.equal((await h.actions.importQuestions(bank)).code, "denied");
  h.state.user.app_metadata.role = "instructor";
  assert.equal((await h.actions.importQuestions(bank)).code, "ok");
  const filler = Array.from({ length: 40 }, (_, index) => ({ key: `da-${index}`, kind: "primary", prompt: `Pad ${index}`, sampleAnswer: "Pad answer", keywords: [], relatedKeys: [] }));
  assert.equal((await h.actions.importQuestions({ profile: "data_analyst", questions: filler })).code, "ok");
  assert.equal((await h.actions.importQuestions({ profile: "data_analyst", questions: [{ key: "da-extra", kind: "primary", prompt: "Extra", sampleAnswer: "Extra answer", keywords: [], relatedKeys: [] }] })).code, "limit");
  const pad = (await db.query("select id from forge_v2_questions where prompt = 'Pad 0'")).rows[0];
  assert.equal((await h.actions.saveQuestion({
    id: pad.id, profileId: "data_analyst", prompt: "Pad 0 edited", sampleAnswer: "Pad answer",
    keywords: [], relatedIds: [], kind: "primary", active: true, sortOrder: 1,
  })).code, "ok");
  assert.equal((await db.query("select prompt from forge_v2_questions where id = $1", [pad.id])).rows[0].prompt, "Pad 0 edited");
  h.state.user.app_metadata.role = "learner";
  assert.equal((await h.actions.deleteQuestion({ id: pad.id })).code, "denied");
  h.state.user.app_metadata.role = "instructor";
  assert.equal((await h.actions.deleteQuestion({ id: pad.id })).code, "ok");
  assert.equal((await db.query("select count(*)::int as n from forge_v2_questions where id = $1", [pad.id])).rows[0].n, 0);
  h.state.user.app_metadata.role = "learner";
  const started = await h.actions.startSession({ profileId: "frontend_engineer" });
  assert.equal(started.code, "ok");
  assert.equal(started.view.session.state, "intro");
  const ended = await h.actions.endSession({ id: started.view.session.id, revision: started.view.session.revision });
  assert.equal(ended.code, "ok");
  assert.equal(ended.view.ratingState, "empty");
  assert.equal((await db.query("select count(*)::int as n from forge_v2_turns where session_id=$1", [started.view.session.id])).rows[0].n, 0);

  const skippedStart = await h.actions.startSession({ profileId: "frontend_engineer" });
  const skippedIntro = await h.actions.skipIntro({ id: skippedStart.view.session.id, revision: skippedStart.view.session.revision });
  assert.equal(skippedIntro.code, "ok");
  assert.equal(skippedIntro.view.session.state, "asking");
  assert.equal(skippedIntro.view.turns[0].skipped, true);
  assert.equal(skippedIntro.view.turns[0].prompt, v2.introBubble);
  assert.match(skippedIntro.view.bubble, /Primary question/);

  const again = await h.actions.startSession({ profileId: "frontend_engineer" });
  const intro = await h.actions.submitIntro({ id: again.view.session.id, revision: again.view.session.revision, text: "I enjoy building interfaces and explaining trade-offs." });
  assert.equal(intro.code, "ok");
  assert.equal(intro.view.turns[0].prompt, v2.introBubble);
  assert.match(intro.view.bubble, /Primary question/);
  const before = h.payloads.length;
  h.state.provider = async () => JSON.stringify({ lead: "Adding an index is why I want to know how the lookup changes." });
  const keyword = await h.actions.submitAnswer({ id: intro.view.session.id, revision: intro.view.session.revision, text: "I would add an index." });
  assert.equal(keyword.code, "ok");
  assert.equal(h.payloads.length, before + 1);
  assert.equal(keyword.view.bubble, "Adding an index is why I want to know how the lookup changes. How does the index change the lookup?");
  assert.equal(keyword.view.followUp, "keyword");
  h.state.provider = async () => JSON.stringify({ questionId: (await db.query("select id from forge_v2_questions where prompt=$1", ["When would you skip an index?"])).rows[0].id });
  const related = await h.actions.submitAnswer({ id: keyword.view.session.id, revision: keyword.view.session.revision, text: "It avoids scanning every row." });
  assert.equal(related.code, "ok");
  assert.match(related.view.bubble, /When would you skip an index\?$/);
  assert.doesNotMatch(related.view.bubble, /^Since you mentioned/i);
  assert.equal(related.view.followUp, "ai");
  assert.equal(h.payloads.length, before + 3);
  const turnsBefore = related.view.turns.length;
  const changed = await h.actions.changeQuestion({ id: related.view.session.id, revision: related.view.session.revision });
  assert.equal(changed.code, "ok");
  assert.notEqual(changed.view.bubble, related.view.bubble);
  assert.equal(changed.view.turns.length, turnsBefore);
  assert.equal(h.payloads.length, before + 3);
  h.state.provider = async messages => JSON.stringify({
    summary: "Keep the examples concrete.",
    items: JSON.parse(messages.at(-1).content).items.map(item => ({ turnId: item.turnId, band: "partial", comment: "Name the trade-off." })),
  });
  const finished = await h.actions.endSession({ id: changed.view.session.id, revision: changed.view.session.revision });
  assert.equal(finished.code, "ok");
  assert.equal(finished.view.ratingState, "ready");
  assert.equal(finished.view.summary, "Keep the examples concrete.");
  assert.ok(finished.view.turns.some(turn => turn.band === "partial"));
  assert.equal((await db.query("select count(*)::int as n from forge_interviews where owner_id=$1", [owner])).rows[0].n, 0);
  const removed = await h.actions.deleteSession({ id: finished.view.session.id });
  assert.equal(removed.code, "ok");
  assert.equal((await db.query("select count(*)::int as n from forge_v2_sessions where id=$1", [finished.view.session.id])).rows[0].n, 0);
  assert.equal((await h.actions.deleteSession({ id: finished.view.session.id })).code, "missing");
  await db.query("delete from auth.users where id=$1", [owner]);
  assert.equal((await db.query("select count(*)::int as n from forge_v2_sessions")).rows[0].n, 0);
});
