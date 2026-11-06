import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { PGlite } from "@electric-sql/pglite";
import * as schemas from "../src/lib/interviews.ts";
import * as eligibility from "../src/lib/eligibility.ts";
import { z } from "zod";

const sources = {};
for (const path of ["lib/learning-server", "lib/ai-eligibility-server", "lib/interviews-server", "lib/interview-ai", "app/interviews/actions"]) {
  sources[`@/${path}`] = ts.transpileModule(await readFile(new URL(`../src/${path}.ts`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const copy = value => JSON.parse(JSON.stringify(value));
async function setup() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as 'select null::uuid';`);
  await db.exec(await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"));
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(migrations)).filter(n => n.endsWith(".sql")).sort()) {
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }
  return db;
}

function harness(db, owner) {
  const calls = [], payloads = [];
  const state = { user: { id: owner, app_metadata: { ai_access: true } }, age: 22, authError: null, authThrows: false, profileError: null,
    provider: async () => "What would you verify first?", failRpc: null, loseAfter: null, afterRpc: null };
  const client = {
    auth: { getUser: async () => {
      if (state.authThrows) throw new Error("synthetic private auth failure");
      return { data: { user: state.user }, error: state.authError };
    } },
    from(table) {
      calls.push(["from", table]);
      let columns = "*", filters = [], orders = [], limit = null, cursor = null;
      const query = {
        select(value) { columns = value; return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        order(key, options) { orders.push(`${key} ${options?.ascending === false ? "desc" : "asc"}`); return this; },
        limit(value) { limit = value; return this; },
        or(value) { cursor = value; return this; },
        async run(single) {
          calls.push(["query", table, columns, copy(filters), cursor]);
          if (table === "profiles") assert.fail("Interview AI must not read profiles for authorization");
          const values = filters.map(([, value]) => value);
          let where = filters.map(([key], i) => `${key}=$${i + 1}`).join(" and ");
          if (cursor) {
            const match = /^created_at.lt.(.+),and\(created_at.eq.(.+),id.lt.(.+)\)$/.exec(cursor);
            assert.equal(match[1], match[2]);
            values.push(match[1], match[3]);
            where += ` and (created_at,id) < ($${values.length - 1}::timestamptz,$${values.length}::uuid)`;
          }
          const result = await db.query(`select ${columns} from ${table} where ${where}${orders.length ? ` order by ${orders.join(",")}` : ""}${limit ? ` limit ${limit}` : ""}`, values);
          return { data: copy(single ? result.rows[0] ?? null : result.rows), error: null };
        },
        maybeSingle() { return this.run(true); },
        then(resolve, reject) { return this.run(false).then(resolve, reject); },
      };
      return query;
    },
    async rpc(name, args) {
      calls.push(["rpc", name, copy(args)]);
      if (state.failRpc === name) throw new Error("private reservation/transport detail");
      const entries = Object.entries(args);
      const result = await db.query(`select ${name}(${entries.map(([key], i) => `${key} => $${i + 1}`).join(",")}) as result`, entries.map(([, value]) => value));
      if (state.afterRpc) await state.afterRpc(name, args);
      if (state.loseAfter === name) throw new Error("private lost acknowledgement");
      return { data: result.rows[0].result, error: null };
    },
  };
  const cache = {};
  const mocks = {
    "server-only": {}, "node:crypto": { randomUUID }, zod: { z },
    "@/lib/interviews": schemas, "@/lib/eligibility": eligibility, "@/lib/permissions": {},
    "@/lib/learning": {}, "next/navigation": { redirect() { throw new Error("redirect"); } },
    "@/lib/supabase/server": { createClient: async () => client },
    "@supabase/supabase-js": { createClient: () => client },
    "@/lib/openrouter-client": { completion: async (...args) => {
      payloads.push(copy(args));
      return state.provider(...args);
    } },
  };
  function load(name) {
    if (name in mocks) return mocks[name];
    if (!sources[name]) throw new Error(`Unexpected dependency ${name}`);
    if (!cache[name]) {
      const exports = {};
      cache[name] = exports;
      runInNewContext(sources[name], { exports, require: load, TextEncoder,
        process: { env: { NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.invalid", SUPABASE_SERVICE_ROLE_KEY: "synthetic-not-a-secret" } },
        fetch() { throw new Error("Network forbidden"); } });
    }
    return cache[name];
  }
  return { actions: load("@/app/interviews/actions"), ai: load("@/lib/interview-ai"), state, calls, payloads, client };
}
const start = row => ({ id: row.id, revision: row.revision, mode: "start", turnId: randomUUID(), requestId: randomUUID() });
const answer = (row, text = "I would review the requirements.") => ({ ...start(row), mode: "answer", text });
const retry = row => ({ ...start(row), mode: "retry", turnId: row.turns.at(-1).id });
const reserveArgs = (row, req = start(row)) => ({ p_owner: row.owner_id, p_id: row.id, p_revision: req.revision,
  p_request: req.requestId, p_turn: req.turnId, p_mode: req.mode, p_text: req.text ?? null, p_token: randomUUID() });
async function create(h) {
  const result = await h.actions.createInterview({ id: randomUUID(), topic: "verification", level: "foundation" });
  assert.equal(result.code, "ok");
  assert.equal(result.interview.turns.length, 0);
  return result.interview;
}
async function count(db, owner) {
  return (await db.query("select coach_count from forge_requests where user_id=$1", [owner])).rows[0]?.coach_count ?? 0;
}

test("interview post-inference authorization denies revoked approval, lost session and switched approved owner without output release", async context => {
  const db = await setup();
  context.after(() => db.close());
  for (const variant of ["revoked approval", "lost session", "switched approved owner"]) {
    await context.test(variant, async () => {
      const owner = randomUUID(), other = randomUUID();
      await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"age\":17}'),($2,'{\"age\":13}')", [owner, other]);
      const h = harness(db, owner), row = await create(h);
      const providerText = "SYNTHETIC_POST_AUTH_REPLY_MUST_NOT_ESCAPE";
      let release, entered;
      const ready = new Promise(resolve => { entered = resolve; });
      h.state.provider = () => {
        entered();
        return new Promise(resolve => { release = resolve; });
      };
      const request = start(row);
      const pending = h.actions.requestInterviewTurn(request);
      await ready;
      try {
        h.state.user = variant === "lost session" ? null :
          { id: variant === "switched approved owner" ? other : owner,
            app_metadata: { ai_access: variant !== "revoked approval" } };
      } finally {
        release(providerText);
      }
      const result = await pending;
      const stored = (await db.query("select * from forge_interviews where id=$1", [row.id])).rows[0];
      assert.equal(h.payloads.length, 1, "exactly one inference before the authorization change");
      assert.equal(await count(db, owner), 1, "no retry or additional quota claim");
      assert.deepEqual({
        returnedProviderText: JSON.stringify(result).includes(providerText),
        persistedProviderText: JSON.stringify(stored.turns).includes(providerText),
        successfulResult: result.code === "ok",
      }, {
        returnedProviderText: false,
        persistedProviderText: false,
        successfulResult: false,
      }, "fresh authorization must deny finalization and output release after " + variant);
      assert.deepEqual(copy(result), { code: variant === "lost session" ? "auth" : "denied" }, "no captured row is released");
      assert.equal(h.calls.filter(c => c[0] === "rpc" && c[1] === "forge_interview_finalize").length, 0);
      assert.equal(await count(db, other), 0, "changed owner is never charged");
      assert.equal(stored.owner_id, owner);
      assert.equal(stored.revision, row.revision + 1, "only the original reservation was saved");
      assert.equal(stored.turns[0].status, "pending");
      assert.equal(stored.turns[0].assistant, null);
      assert.equal(stored.turns[0].attempts.length, 1);
      const attempt = stored.turns[0].attempts[0];
      assert.equal(attempt.outcome, "pending");
      assert.equal(attempt.request_id, request.requestId);
      assert.equal(attempt.expected_revision, request.revision);
      assert.equal(attempt.token, h.calls.find(c => c[1] === "forge_interview_reserve")[2].p_token);
      assert.match(schemas.interviewNotices[result.code], /original.*account/);
      assert.match(schemas.interviewNotices[result.code], /explicitly retry.*75-second lease/);

      h.state.user = { id: owner, app_metadata: { ai_access: true }, user_metadata: { age: 17 } };
      h.state.profileError = "PRIVATE_PROFILE_UNAVAILABLE";
      const saved = (await h.actions.readInterview({ id: row.id })).interview;
      assert.equal((await h.actions.requestInterviewTurn(request)).code, "replay");
      assert.equal((await h.actions.requestInterviewTurn(retry(saved))).code, "busy");
      assert.equal(h.payloads.length, 1, "reload/replay/busy recovery performs no inference");
      assert.equal(await count(db, owner), 1, "pending recovery does not charge quota");
      // Advance only the existing DB lease; no sleep, cleanup RPC or implicit retry.
      await db.query(`update forge_interviews set turns=jsonb_set(turns,'{0,attempts,0,lease_until}',to_jsonb(clock_timestamp()-interval '1 second')) where id=$1`, [row.id]);
      const expired = (await h.actions.readInterview({ id: row.id })).interview;
      assert.equal(expired.turns[0].status, "pending");
      assert.equal(await count(db, owner), 1, "lease expiry/read costs no additional quota");
      h.state.provider = async () => "Explicit original-owner recovery question?";
      const recoveryRequest = retry(expired);
      const recovered = await h.actions.requestInterviewTurn(recoveryRequest);
      assert.equal(recovered.code, "ok");
      assert.equal(recovered.interview.owner_id, owner);
      assert.equal(recovered.interview.turns[0].id, request.turnId);
      assert.equal(recovered.interview.turns[0].assistant, "Explicit original-owner recovery question?");
      assert.deepEqual(copy(recovered.interview.turns[0].attempts.map(a => a.outcome)), ["expired", "complete"]);
      assert.equal((await h.actions.requestInterviewTurn(recoveryRequest)).code, "replay");
      assert.equal(h.payloads.length, 2, "only the explicit retry starts another inference");
      assert.equal(await count(db, owner), 2, "cleanup claims only the explicit retry's quota");
      assert.ok(!JSON.stringify(recovered).includes(providerText));
      assert.ok(!h.calls.some(c => c[0] === "from" && c[1] === "profiles"));
    });
  }
});

function changeTurnAuth(h, owner, other, variant) {
  h.state.user = variant === "lost session" ? null :
    { id: variant === "switched approved owner" ? other : owner,
      app_metadata: { ai_access: variant !== "revoked approval" }, user_metadata: { age: 17, ai_access: true } };
  h.state.authError = variant === "auth error with user" ? new Error("PRIVATE_AUTH_ERROR") : null;
  h.state.authThrows = variant === "thrown auth failure";
}
const authDenial = variant => ["lost session", "auth error with user", "thrown auth failure"].includes(variant) ? "auth" : "denied";

test("interview post-inference authorization fails closed even when the provider throws", async context => {
  const db = await setup();
  context.after(() => db.close());
  for (const variant of ["revoked approval", "lost session", "switched approved owner", "auth error with user", "thrown auth failure"]) {
    await context.test(variant, async () => {
      const owner = randomUUID(), other = randomUUID();
      await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"age\":17}'),($2,'{\"age\":13}')", [owner, other]);
      const h = harness(db, owner), row = await create(h);
      let reject, entered;
      const ready = new Promise(resolve => { entered = resolve; });
      h.state.provider = () => { entered(); return new Promise((_, fail) => { reject = fail; }); };
      const pending = h.actions.requestInterviewTurn(start(row));
      await ready;
      try { changeTurnAuth(h, owner, other, variant); }
      finally { reject(new Error("PRIVATE_PROVIDER_FAILURE_NO_FALLBACK")); }
      const result = await pending;
      assert.deepEqual(copy(result), { code: authDenial(variant) }, "not ok/saved_failed and no row or private error");
      assert.equal(h.payloads.length, 1);
      assert.equal(await count(db, owner), 1);
      assert.equal(await count(db, other), 0);
      assert.equal(h.calls.filter(c => c[0] === "rpc" && c[1] === "forge_interview_finalize").length, 0);
      const stored = (await db.query("select turns from forge_interviews where id=$1", [row.id])).rows[0].turns[0];
      assert.equal(stored.assistant, null);
      assert.equal(stored.status, "pending");
      assert.equal(stored.attempts[0].outcome, "pending");
      h.state.authError = null; h.state.authThrows = false;
      h.state.user = { id: owner, app_metadata: { ai_access: true } };
      assert.equal((await h.actions.readInterview({ id: row.id })).interview.turns[0].assistant, null);
    });
  }
});

test("interview post-inference authorization rechecks output release after asynchronous finalization", async context => {
  const db = await setup();
  context.after(() => db.close());
  for (const outcome of ["saved reply", "saved provider failure", "lost acknowledgement"]) {
    await context.test(outcome, async scenario => {
      for (const variant of ["revoked approval", "lost session", "switched approved owner"]) {
        await scenario.test(variant, async () => {
          const owner = randomUUID(), other = randomUUID();
          await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"age\":17}'),($2,'{\"age\":13}')", [owner, other]);
          const h = harness(db, owner), row = await create(h);
          const providerText = "SYNTHETIC_LEGITIMATE_PREWRITE_AUTH_REPLY";
          h.state.provider = async () => {
            if (outcome === "saved provider failure") throw new Error("PRIVATE_PROVIDER_FAILURE");
            return providerText;
          };
          if (outcome === "lost acknowledgement") h.state.loseAfter = "forge_interview_finalize";
          let release, entered;
          const ready = new Promise(resolve => { entered = resolve; });
          h.state.afterRpc = async name => {
            if (name === "forge_interview_finalize") {
              entered();
              await new Promise(resolve => { release = resolve; });
            }
          };
          const pending = h.actions.requestInterviewTurn(start(row));
          await ready;
          try { changeTurnAuth(h, owner, other, variant); }
          finally { release(); }
          const result = await pending;
          assert.deepEqual(copy(result), { code: authDenial(variant) }, "post-write auth loss never releases the row, even on failed/uncertain saves");
          const finalizes = h.calls.filter(c => c[0] === "rpc" && c[1] === "forge_interview_finalize");
          assert.equal(finalizes.length, 1, "no cleanup write or retry after finalization");
          assert.equal(finalizes[0][2].p_owner, owner);
          assert.equal(finalizes[0][2].p_text, outcome === "saved provider failure" ? null : providerText);
          assert.equal(h.payloads.length, 1);
          assert.equal(await count(db, owner), 1);
          assert.equal(await count(db, other), 0);
          const stored = (await db.query("select turns from forge_interviews where id=$1", [row.id])).rows[0].turns[0];
          assert.equal(stored.status, outcome === "saved provider failure" ? "failed" : "complete");
          assert.equal(stored.assistant, outcome === "saved provider failure" ? null : providerText, "prewrite authorization was valid; no rollback after auth loss");
          h.state.afterRpc = null; h.state.loseAfter = null;
          h.state.user = { id: owner, app_metadata: { ai_access: true } };
          const confirmed = (await h.actions.readInterview({ id: row.id })).interview;
          assert.equal(confirmed.turns[0].assistant, stored.assistant, "original owner can explicitly reload the confirmed state");
          if (outcome === "saved provider failure") {
            h.state.provider = async () => "Explicit failure recovery?";
            const recovered = await h.actions.requestInterviewTurn(retry(confirmed));
            assert.equal(recovered.code, "ok");
            assert.deepEqual(copy(recovered.interview.turns[0].attempts.map(a => a.outcome)), ["failed", "complete"]);
            assert.equal(h.payloads.length, 2);
            assert.equal(await count(db, owner), 2);
          }
        });
      }
    });
  }
});

test("interviews: actual actions, eligibility, projection and transactional migration (offline)", async context => {
  const db = await setup();
  context.after(() => db.close());
  async function fresh() {
    const owner = randomUUID();
    await db.query("insert into auth.users(id,raw_user_meta_data) values($1,'{\"age\":22,\"age_range\":\"18-24\"}')", [owner]);
    return harness(db, owner);
  }
  await context.test("new focus keys and legacy topics remain aligned with the additive constraint", async () => {
    const h = await fresh();
    for (const topic of Object.keys(schemas.interviewTopics)) {
      const result = await h.actions.createInterview({ id: randomUUID(), topic, level: "foundation" });
      assert.equal(result.code, "ok", topic);
      assert.equal(schemas.interviewSchema.parse(result.interview).topic, topic);
    }
    await assert.rejects(db.query("insert into forge_interviews(id,owner_id,topic,level) values($1,$2,'salary','new')",
      [randomUUID(), h.state.user.id]), /violates check constraint/);
  });
  await context.test("create, opening, answer, exact replay and changed duplicate input", async () => {
    const h = await fresh();
    const ready = await create(h);
    const req = start(ready);
    const opened = await h.actions.requestInterviewTurn(req);
    assert.equal(opened.code, "ok");
    assert.equal(opened.interview.turns[0].status, "complete");
    assert.equal(await count(db, ready.owner_id), 1);
    assert.equal((await h.actions.requestInterviewTurn(req)).code, "replay");
    assert.equal(h.payloads.length, 1);
    const ar = answer(opened.interview);
    const replied = await h.actions.requestInterviewTurn(ar);
    assert.equal(replied.code, "ok");
    assert.equal((await h.actions.requestInterviewTurn({ ...ar, text: "Changed" })).code, "conflict");
    assert.equal((await h.actions.requestInterviewTurn(ar)).code, "replay");
    assert.equal(await count(db, ready.owner_id), 2);
    assert.equal(h.payloads.length, 2);
    const messages = h.payloads[1][0];
    assert.deepEqual(messages.slice(1), [
      { role: "assistant", content: "What would you verify first?" },
      { role: "user", content: ar.text },
    ]);
    assert.equal(h.payloads[1].length, 1, "no structured-output ceiling override");
    const wire = JSON.stringify(messages);
    for (const excluded of [ready.id, ready.owner_id, ar.requestId, ar.turnId, "owner_id", "app_metadata", "profile", "answer_key"]) assert.ok(!wire.includes(excluded));
    assert.match(wire, /permission|verification/);
    assert.match(wire, /not instructions/);
    assert.match(wire, /exactly one next question/);
    assert.match(wire, /Do not coach, correct, grade, evaluate or give feedback/);
    for (const pattern of [/ORIGINAL questions/, /coursework or hypothetical/, /Never request names, salary, school\/employer/,
      /arbitrary tree height needs traversal/, /explicit edge\/node convention/, /overflow handling/,
      /traversal versus update costs/, /stability/, /No numeric scores/]) assert.match(messages[0].content, pattern);
  });
  await context.test("strict client envelope rejects raw history, forged owner, invalid topic, IDs, text and revisions", async () => {
    const h = await fresh();
    const row = await create(h);
    for (const input of [{ ...start(row), owner_id: randomUUID() }, { ...start(row), turns: [] },
      { ...start(row), revision: 0 }, { ...start(row), id: "invalid" }, { ...answer(row), text: " " },
      { ...answer(row), text: "x".repeat(1201) }, { ...start(row), mode: "system" }]) {
      assert.equal((await h.actions.requestInterviewTurn(input)).code, "invalid");
    }
    assert.equal((await h.actions.createInterview({ id: randomUUID(), topic: "hiring", level: "new" })).code, "invalid");
    assert.equal(h.payloads.length, 0);
    assert.equal(await count(db, row.owner_id), 0);
  });
  await context.test("another learner, instructor, reviewer and administrator cannot use direct actions on owner records", async () => {
    const h = await fresh(), other = await fresh();
    const row = await create(h);
    for (const role of ["learner", "instructor", "reviewer", "admin"]) {
      other.state.user.app_metadata.role = role;
      assert.equal((await other.actions.readInterview({ id: row.id })).code, "missing");
      assert.equal((await other.actions.requestInterviewTurn(start(row))).code, "missing");
      assert.equal((await other.actions.finishInterview({ id: row.id, revision: row.revision })).code, "missing");
      assert.equal((await other.actions.deleteInterview({ id: row.id })).code, "missing");
      assert.deepEqual(copy((await other.actions.listInterviews()).rows), []);
    }
    assert.equal(other.payloads.length, 0);
    assert.equal((await h.actions.readInterview({ id: row.id })).code, "ok");
  });
  await context.test("auth error with user fails closed; unapproved/string/spoof grants deny inference only", async () => {
    const h = await fresh(), row = await create(h);
    const authenticated = h.state.user;
    for (const failure of ["error with user", "missing user", "thrown failure"]) {
      h.state.authError = failure === "error with user" ? new Error("private auth error") : null;
      h.state.user = failure === "missing user" ? null : authenticated;
      h.state.authThrows = failure === "thrown failure";
      const before = h.calls.length;
      for (const result of [await h.actions.readInterview({ id: row.id }), await h.actions.listInterviews(),
        await h.actions.createInterview({ id: randomUUID(), topic: "testing", level: "new" }),
        await h.actions.requestInterviewTurn(start(row)),
        await h.actions.finishInterview({ id: row.id, revision: row.revision }),
        await h.actions.deleteInterview({ id: row.id })]) assert.equal(result.code, "auth", failure);
      assert.equal(h.calls.length, before, "no privileged database after auth failure");
    }
    h.state.authError = null; h.state.authThrows = false; h.state.user = authenticated;
    for (const [age, grant, error] of [[17, false, null], [null, false, null], [22, "true", null], [22, undefined, "unavailable"]]) {
      h.state.age = age; h.state.user.app_metadata.ai_access = grant; h.state.profileError = error;
      h.state.user.user_metadata={ai_access:true,age};
      assert.equal((await h.actions.requestInterviewTurn(start(row))).code, "denied");
      assert.equal((await h.actions.readInterview({ id: row.id })).code, "ok");
      assert.equal((await h.actions.listInterviews()).code, "ok");
    }
    assert.equal((await h.actions.finishInterview({ id: row.id, revision: row.revision })).code, "ok");
    assert.equal((await h.actions.deleteInterview({ id: row.id })).code, "deleted");
    assert.equal(h.payloads.length, 0);
  });
  await context.test("trusted approved minors and unknown/profile failure can infer without profile lookup",async()=>{
    for(const age of [13,17,18,120,null,undefined]){
      const h=await fresh();h.state.age=age;h.state.profileError="PRIVATE_SCHEMA";
      h.state.user.user_metadata={age};
      const row=await create(h);
      assert.equal((await h.actions.requestInterviewTurn(start(row))).code,"ok");
      assert.equal(h.payloads.length,1);
      assert.ok(!h.calls.some(c=>c[0]==="from"&&c[1]==="profiles"));
    }
  });
  await context.test("shared quota is claimed before provider and no inference follows failed reserve", async () => {
    const h = await fresh(), row = await create(h);
    h.state.provider = async () => { assert.equal(await count(db, row.owner_id), 1); return "One question?"; };
    assert.equal((await h.actions.requestInterviewTurn(start(row))).code, "ok");
    for (let i = 1; i < 15; i++) await db.query("select forge_claim_coach_request($1)", [row.owner_id]);
    const current = (await h.actions.readInterview({ id: row.id })).interview;
    const result = await h.actions.requestInterviewTurn(answer(current));
    assert.equal(result.code, "quota");
    assert.equal(h.payloads.length, 1);
    assert.equal((await h.actions.readInterview({ id: row.id })).interview.turns.length, 1);
  });
  await context.test("provider failure and invalid output persist no invented reply; explicit retry preserves answer and is bounded", async () => {
    const h = await fresh();
    let row = (await h.actions.requestInterviewTurn(start(await create(h)))).interview;
    for (const output of [" ", "x".repeat(1601), null]) {
      h.state.provider = async () => output;
      const request = row.turns.length === 1 ? answer(row, "Keep this saved answer") : retry(row);
      const result = await h.actions.requestInterviewTurn(request);
      assert.equal(result.code, "saved_failed");
      row = result.interview;
      assert.equal(row.turns.at(-1).learner, "Keep this saved answer");
      assert.equal(row.turns.at(-1).assistant, null);
    }
    assert.equal((await h.actions.requestInterviewTurn(retry(row))).code, "limit");
    assert.equal(await count(db, row.owner_id), 4);
  });
  await context.test("parallel attempts: one reservation wins, replay pending consumes no extra quota", async () => {
    const h = await fresh(), row = await create(h), request = start(row);
    let release, entered;
    const ready = new Promise(resolve => { entered = resolve; });
    h.state.provider = () => { entered(); return new Promise(resolve => { release = resolve; }); };
    const first = h.actions.requestInterviewTurn(request);
    await ready;
    assert.equal((await h.actions.requestInterviewTurn(request)).code, "replay");
    assert.equal((await h.actions.requestInterviewTurn(start(row))).code, "conflict");
    const pending = (await h.actions.readInterview({ id: row.id })).interview;
    assert.equal((await h.actions.requestInterviewTurn(retry(pending))).code, "busy");
    const second = await create(h);
    assert.equal((await h.actions.requestInterviewTurn(start(second))).code, "busy");
    release("Saved first question?");
    assert.equal((await first).code, "ok");
    assert.equal(await count(db, row.owner_id), 1);
  });
  await context.test("DB-time expiry rejects late finalization and explicit retry claims one new attempt", async () => {
    const h = await fresh(), row = await create(h);
    const args = reserveArgs(row);
    const reservation = (await h.client.rpc("forge_interview_reserve", args)).data.interview;
    await db.query(`update forge_interviews set turns=jsonb_set(turns,'{0,attempts,0,lease_until}',to_jsonb(clock_timestamp()-interval '1 second')) where id=$1`, [row.id]);
    const late = await h.client.rpc("forge_interview_finalize", { p_owner: row.owner_id, p_id: row.id,
      p_revision: reservation.revision, p_token: args.p_token, p_text: "Late reply" });
    assert.equal(late.data.code, "stale");
    const result = await h.actions.requestInterviewTurn(retry(reservation));
    assert.equal(result.code, "ok");
    assert.equal(result.interview.turns[0].attempts[0].outcome, "expired");
    assert.equal((await h.client.rpc("forge_interview_finalize", { p_owner: row.owner_id, p_id: row.id,
      p_revision: reservation.revision, p_token: args.p_token, p_text: "Very late" })).data.code, "stale");
    assert.equal(await count(db, row.owner_id), 2);
    const lifecycle = await fresh(), id = randomUUID();
    lifecycle.state.loseAfter = "forge_interview_create";
    assert.equal((await lifecycle.actions.createInterview({ id, topic: "testing", level: "new" })).code, "create_unknown");
    const created = (await lifecycle.actions.readInterview({ id })).interview;
    lifecycle.state.loseAfter = "forge_interview_finish";
    assert.equal((await lifecycle.actions.finishInterview({ id, revision: created.revision })).code, "finish_unknown");
    assert.equal((await lifecycle.actions.readInterview({ id })).interview.state, "completed");
    lifecycle.state.loseAfter = "forge_interview_delete";
    assert.equal((await lifecycle.actions.deleteInterview({ id })).code, "delete_unknown");
    assert.equal((await lifecycle.actions.readInterview({ id })).code, "missing");
    assert.equal(lifecycle.payloads.length, 0);
  });
  await context.test("finish and delete during inference never resurrect a reply", async () => {
    for (const operation of ["finish", "delete"]) {
      const h = await fresh(), row = await create(h);
      let release, entered;
      const enteredPromise = new Promise(resolve => { entered = resolve; });
      h.state.provider = () => { entered(); return new Promise(resolve => { release = resolve; }); };
      const pending = h.actions.requestInterviewTurn(start(row));
      await enteredPromise;
      const canonical = (await h.actions.readInterview({ id: row.id })).interview;
      if (operation === "finish") assert.equal((await h.actions.finishInterview({ id: row.id, revision: canonical.revision })).code, "ok");
      else assert.equal((await h.actions.deleteInterview({ id: row.id })).code, "deleted");
      release("Must never be resurrected");
      assert.equal((await pending).code, "stale");
      const result = await h.actions.readInterview({ id: row.id });
      if (operation === "finish") {
        assert.equal(result.interview.state, "completed");
        assert.equal(result.interview.turns[0].status, "cancelled");
        assert.equal(result.interview.turns[0].assistant, null);
      } else assert.equal(result.code, "missing");
    }
  });
  await context.test("uncertain reserve/save acknowledgements disclose uncertainty and never return unconfirmed text", async () => {
    const h = await fresh(), row = await create(h);
    h.state.failRpc = "forge_interview_reserve";
    assert.equal((await h.actions.requestInterviewTurn(start(row))).code, "reserve_unknown");
    assert.equal(h.payloads.length, 0);
    h.state.failRpc = null; h.state.loseAfter = "forge_interview_reserve";
    const request = start(row);
    assert.equal((await h.actions.requestInterviewTurn(request)).code, "reserve_unknown");
    assert.equal(h.payloads.length, 0);
    h.state.loseAfter = null;
    assert.equal((await h.actions.requestInterviewTurn(request)).code, "replay");
    await h.actions.deleteInterview({ id: row.id });
    const next = await create(h);
    h.state.loseAfter = "forge_interview_finalize";
    const result = await h.actions.requestInterviewTurn(start(next));
    assert.equal(result.code, "save_unknown");
    assert.equal(result.interview, undefined);
    const confirmed = await h.actions.readInterview({ id: next.id });
    assert.equal(confirmed.interview.turns[0].assistant, "What would you verify first?");
    assert.equal(await count(db, row.owner_id), 2);
  });
  await context.test("eight answers end with feedback and capped deterministic context; completed history remains readable", async () => {
    const h = await fresh();
    h.state.provider = async () => "F".repeat(1600);
    let row = (await h.actions.requestInterviewTurn(start(await create(h)))).interview;
    for (let i = 0; i < 8; i++) {
      row = (await h.actions.requestInterviewTurn(answer(row, `Answer ${i} ` + "a".repeat(1190)))).interview;
      assert.ok(row);
      const prompt = h.payloads.at(-1)[0][0].content;
      if (i < 7) {
        assert.match(prompt, /Ask exactly one next question/);
        assert.match(prompt, /defer all formative feedback until answer eight/);
        assert.doesNotMatch(prompt, /Give concise final formative feedback/);
      } else {
        for (const field of ["strengths", "improvement areas", "technical reasoning", "problem solving", "communication", "next practice step"]) assert.ok(prompt.includes(field));
        assert.match(prompt, /Do not ask another question/);
      }
    }
    assert.equal(row.state, "completed");
    assert.equal(row.turns.length, 9);
    const last = h.payloads.at(-1)[0];
    assert.match(last[0].content, /final formative feedback/);
    assert.ok(last.reduce((n, m) => n + m.content.length, 0) <= 12000);
    for (const turn of row.turns.filter(t => t.kind === "answer")) {
      assert.ok(last.some(message => message.content.includes(turn.learner)), "Final feedback includes every complete learner answer");
    }
    assert.deepEqual(copy(h.ai.interviewMessages({ ...row, turns: row.turns.map((t, i) => i === 8 ? { ...t, status: "pending" } : t) })), last);
    assert.equal((await h.actions.requestInterviewTurn(answer(row))).code, "conflict");
  });
  await context.test("metadata-only stable history pages, atomic retention cap and account cascade", async () => {
    const h = await fresh();
    const row = await create(h);
    await db.query(`insert into forge_interviews(id,owner_id,topic,level,created_at)
      select gen_random_uuid(),$1,'testing','new','2026-01-01'::timestamptz from generate_series(1,99)`, [row.owner_id]);
    assert.equal((await h.actions.createInterview({ id: randomUUID(), topic: "testing", level: "new" })).code, "limit");
    let cursor = null; const ids = [];
    do {
      const page = await h.actions.listInterviews(cursor);
      assert.equal(page.code, "ok");
      assert.ok(page.rows.every(r => !("turns" in r) && !("owner_id" in r)));
      ids.push(...page.rows.map(r => r.id));
      cursor = page.cursor;
    } while (cursor);
    assert.equal(ids.length, 100);
    assert.equal(new Set(ids).size, 100);
    await db.query("delete from auth.users where id=$1", [row.owner_id]);
    assert.equal((await db.query("select id from forge_interviews where owner_id=$1", [row.owner_id])).rows.length, 0);
  });
  await context.test("simultaneous reserve and creation cap contenders cannot overwrite or exceed limits", async () => {
    const h = await fresh(), row = await create(h);
    const contenders = await Promise.all([
      h.client.rpc("forge_interview_reserve", reserveArgs(row)),
      h.client.rpc("forge_interview_reserve", reserveArgs(row)),
    ]);
    assert.deepEqual(contenders.map(r => r.data.code).sort(), ["conflict", "reserved"]);
    assert.equal(await count(db, row.owner_id), 1);
    await db.query(`insert into forge_interviews(id,owner_id,topic,level)
      select gen_random_uuid(),$1,'testing','new' from generate_series(1,98)`, [row.owner_id]);
    const creations = await Promise.all([1, 2].map(() => h.actions.createInterview({ id: randomUUID(), topic: "testing", level: "new" })));
    assert.deepEqual(creations.map(r => r.code).sort(), ["limit", "ok"]);
  });
  await context.test("account cascade during pending inference rejects late reply; thrown provider failures keep saved answer", async () => {
    const h = await fresh(), row = await create(h);
    h.state.provider = async () => { throw new Error("private provider failure"); };
    const failed = await h.actions.requestInterviewTurn(start(row));
    assert.equal(failed.code, "saved_failed");
    h.state.provider = async () => {
      await db.query("delete from auth.users where id=$1", [row.owner_id]);
      return "Reply after account deletion";
    };
    const result = await h.actions.requestInterviewTurn(retry(failed.interview));
    assert.equal(result.code, "stale");
    assert.equal(result.interview, undefined);
    assert.equal((await db.query("select * from forge_interviews where id=$1", [row.id])).rows.length, 0);
  });
  await context.test("invalid reservation rolls back quota and expired attempts cannot silently start a replacement answer", async () => {
    const h = await fresh(), row = await create(h), args = reserveArgs(row);
    args.p_token = args.p_turn;
    await assert.rejects(h.client.rpc("forge_interview_reserve", args), /violates check constraint/);
    assert.equal(await count(db, row.owner_id), 0);
    assert.equal((await h.actions.readInterview({ id: row.id })).interview.revision, 1);
    args.p_token = randomUUID();
    const reserved = (await h.client.rpc("forge_interview_reserve", args)).data.interview;
    await db.query(`update forge_interviews set turns=jsonb_set(turns,'{0,attempts,0,lease_until}',to_jsonb(clock_timestamp()-interval '1 second')) where id=$1`, [row.id]);
    assert.equal((await h.actions.requestInterviewTurn(answer(reserved))).code, "conflict");
    assert.equal(h.payloads.length, 0);
  });
  await context.test("RLS, explicit function/table grants, service access and malformed-write constraints", async () => {
    const h = await fresh(), row = await create(h);
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      try {
        await assert.rejects(db.query("select * from forge_interviews"), /permission denied/);
        await assert.rejects(db.query("select forge_interview_delete($1,$2)", [row.owner_id, row.id]), /permission denied/);
        await assert.rejects(db.query("select forge_interview_create($1,$2,'testing','new')", [row.owner_id, randomUUID()]), /permission denied/);
      } finally { await db.exec("reset role"); }
    }
    const funcs = await db.query(`select proname,proconfig,has_function_privilege('anon',oid,'EXECUTE') as anon,
      has_function_privilege('authenticated',oid,'EXECUTE') as authenticated,
      has_function_privilege('service_role',oid,'EXECUTE') as service from pg_proc where proname like 'forge_interview_%'`);
    assert.equal(funcs.rows.length, 6);
    assert.ok(funcs.rows.every(r => !r.anon && !r.authenticated && r.service && r.proconfig.includes("search_path=pg_catalog, public")));
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='forge_interviews'")).rows[0].relrowsecurity, true);
    await db.exec("set role service_role");
    try {
      assert.equal((await db.query("select id from forge_interviews where id=$1", [row.id])).rows.length, 1);
      await assert.rejects(db.query("delete from forge_interviews where id=$1", [row.id]), /permission denied/);
      assert.equal((await h.client.rpc("forge_interview_reserve", reserveArgs(row))).data.code, "reserved");
    } finally { await db.exec("reset role"); }
    for (const patch of ["turns='{}'", "turns='[{\"kind\":\"opening\"}]'", "schema_version=2", "state='completed'",
      "topic='personal secrets'", "revision=0", "level='expert'"]) {
      await assert.rejects(db.query(`update forge_interviews set ${patch} where id=$1`, [row.id]), /violates check constraint/);
    }
    const saved = (await h.actions.readInterview({ id: row.id })).interview;
    assert.equal((await h.client.rpc("forge_interview_finish", { p_owner: row.owner_id, p_id: row.id, p_revision: null })).data.code, "conflict");
    for (const mutate of [
      t => { t[0].kind = null; }, t => { t[0].learner = "opening text"; },
      t => { t[0].assistant = "unsaved"; }, t => { t[0].attempts[0].expected_revision = 1.5; },
      t => { t[0].attempts[0].token = t[0].id; }, t => { t[0].extra = "forbidden"; },
      t => { t[0].attempts[0].lease_until = "infinity"; },
    ]) {
      const turns = copy(saved.turns); mutate(turns);
      await assert.rejects(db.query("update forge_interviews set turns=$2 where id=$1", [row.id, JSON.stringify(turns)]), /violates check constraint/);
      assert.equal(schemas.interviewSchema.safeParse({ ...saved, turns }).success, false);
    }
  });
});
