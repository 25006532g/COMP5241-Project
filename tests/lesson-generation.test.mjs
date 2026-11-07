import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { harness, generation, selection, canonical, outline, slide, batch } from "./lesson-generation-harness.mjs";

test("real actions/helpers + all migrations: saved parts, atomic start/finalize and lost acknowledgements", async t => {
  const h = await harness(); t.after(h.close);
  t.mock.method(globalThis, "fetch", () => { throw new Error("Network forbidden"); });
  const form = h.form();
  h.state.lose = "forge_generation_start";
  assert.equal((await h.learningActions.createLesson({}, form)).saveUncertain, true);
  const id = form.get("generationId");
  let draft = (await h.actions.loadLessonGeneration(id)).draft;
  assert.ok(draft); assert.equal(draft.parts.length, 0); assert.equal(h.state.completions.length, 0);
  const listing = (await h.actions.listLessonGenerations()).drafts;
  assert.equal(listing[0].part_count, 0);
  assert.equal("parts" in listing[0], false);
  assert.equal("source_text" in listing[0], false);
  const replay = await h.learningActions.createLesson({}, form);
  assert.equal(replay.generationId, id);
  assert.equal((await h.db.query("select count from forge_requests where user_id=$1", [h.owner])).rows[0].count, 1);
  assert.ok((await h.actions.finalizeLessonGeneration(id, draft.revision)).error);
  const req = randomUUID(), rev = draft.revision;
  h.state.lose = "forge_generation_settle";
  const lost = await h.actions.advanceLessonGeneration(id, rev, req);
  assert.ok(lost.error); assert.equal(lost.uncertain, true);
  draft = (await h.actions.loadLessonGeneration(id)).draft;
  assert.deepEqual(draft.parts, [outline]);
  const count = h.state.completions.length;
  assert.equal((await h.actions.advanceLessonGeneration(id, rev, req)).replay, true);
  assert.equal(h.state.completions.length, count);
  while (!generation.readyToFinalize(draft)) {
    const result = await h.advance(draft); assert.equal(result.error, undefined);
    draft = result.draft;
    assert.deepEqual((await h.actions.loadLessonGeneration(id)).draft.parts, draft.parts);
  }
  assert.deepEqual(generation.assembleLesson(draft), canonical);
  assert.equal(h.state.completions.length, 8, "outline + four slides + activity + two batches");
  for (const [index, call] of h.state.completions.entries()) {
    assert.equal(call.options.timeoutMs, 60000);
    if (index >= 6) {
      const context = JSON.parse(call.messages[1].content);
      assert.equal(context.slides.length, 4);
      assert.equal("sourceText" in context, false); assert.equal("objective" in context, false);
      assert.equal(JSON.stringify(context).includes('"correct"'), false, "saved answer keys are never sent");
      assert.deepEqual(context.slides, canonical.slides);
    }
  }
  h.state.lose = "forge_generation_finalize";
  assert.equal((await h.actions.finalizeLessonGeneration(id, draft.revision)).uncertain, true);
  const completed = await h.actions.finalizeLessonGeneration(id, draft.revision);
  assert.equal(completed.draft.lesson_id, id);
  const rows = (await h.db.query("select * from forge_lessons")).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].visibility, "private"); assert.deepEqual(rows[0].content, canonical);
  assert.equal((await h.db.query("select count from forge_requests")).rows[0].count, 1);
});

test("DB leases/revisions/request replay guard parallel tabs, owners, deletion and late results", async t => {
  const h = await harness(); t.after(h.close);
  let draft = (await h.start()).draft;
  let release; h.state.gate = new Promise(resolve => { release = resolve; });
  const req = randomUUID();
  const first = h.actions.advanceLessonGeneration(draft.id, draft.revision, req);
  for (let i = 0; i < 100 && h.state.completions.length === 0; i++) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(h.state.completions.length, 1, "first reservation must reach exactly one completion");
  const reserved = (await h.actions.loadLessonGeneration(draft.id)).draft;
  const attempt = reserved.attempts.at(-1);
  const remaining = Date.parse(attempt.lease) - Date.now();
  assert.ok(remaining > 85000 && remaining <= 91000);
  assert.equal((await h.actions.advanceLessonGeneration(draft.id, draft.revision, req)).replay, true);
  assert.match((await h.advance(reserved)).error, /in flight/);
  const second = (await h.start()).draft;
  assert.match((await h.advance(second)).error, /in flight/);
  assert.match((await h.advance(draft)).error, /changed/);
  assert.equal(h.state.completions.length, 1);
  const deleted = await h.actions.deleteLessonGeneration(draft.id);
  assert.equal(deleted.deleted, true);
  release(); h.state.gate = null;
  assert.ok((await first).error);
  assert.ok((await h.actions.loadLessonGeneration(draft.id)).error);
  const tombstone = (await h.db.query("select * from forge_lesson_generations where id=$1", [draft.id])).rows[0];
  assert.equal(tombstone.objective, null); assert.equal(tombstone.selection, null); assert.deepEqual(tombstone.parts, []);
  assert.ok((await h.start({ id: draft.id })).error);
  const third = (await h.start()).draft;
  const token = randomUUID();
  await h.rpc("forge_generation_reserve", { p_owner: h.owner, p_id: third.id, p_revision: third.revision, p_request: randomUUID(), p_token: token });
  await h.db.query(`update forge_lesson_generations set attempts=jsonb_set(attempts,'{0,lease}',to_jsonb((clock_timestamp()-interval '1 second')::text)) where id=$1`, [third.id]);
  assert.equal((await h.rpc("forge_generation_settle", { p_owner: h.owner, p_id: third.id, p_token: token, p_part: outline })).data.code, "conflict");
  const expired = (await h.actions.loadLessonGeneration(third.id)).draft;
  const recovered = await h.advance(expired);
  assert.deepEqual(recovered.draft.parts, [outline]);
  assert.equal(recovered.draft.attempts[0].outcome, "expired");
  assert.equal((await h.rpc("forge_generation_settle", { p_owner: h.owner, p_id: third.id, p_token: token, p_part: outline })).data.code, "conflict");
  h.state.user = { id: h.other, app_metadata: { role: "admin", ai_access: true } };
  assert.ok((await h.actions.loadLessonGeneration(third.id)).error);
  assert.deepEqual((await h.actions.listLessonGenerations()).drafts, []);
  assert.ok((await h.advance(recovered.draft)).error);
  await h.actions.deleteLessonGeneration(third.id);
  assert.equal((await h.db.query("select deleted_at from forge_lesson_generations where id=$1", [third.id])).rows[0].deleted_at, null);
});

test("approved minor/unknown age works before and after inference without profile authorization", async t => {
  const h = await harness(); t.after(h.close);
  for (const age of [13, 17]) {
    await h.db.query("update profiles set age=$2,age_range=case when $2::integer < 18 then '13-17' else '18-24' end where id=$1", [h.owner, age]);
    const approved=(await h.start()).draft;assert.ok(approved);
    assert.ok((await h.advance(approved)).draft.parts.length);
    await h.actions.deleteLessonGeneration(approved.id);
  }
  await h.db.query("delete from profiles where id=$1", [h.owner]);
  const unknown=(await h.start()).draft;assert.ok(unknown,"missing profile age is not an AI authorization prerequisite");
  assert.ok((await h.advance(unknown)).draft.parts.length);
  await h.actions.deleteLessonGeneration(unknown.id);
});

test("current auth/trusted approval/import role checked before and after every inference", async t => {
  const h=await harness();t.after(h.close);
  const draft = (await h.start()).draft;
  h.state.user.app_metadata.ai_access = false;
  assert.ok((await h.advance(draft)).error);
  assert.ok((await h.actions.loadLessonGeneration(draft.id)).draft);
  assert.ok((await h.actions.listLessonGenerations()).drafts.length);
  h.state.user.app_metadata.ai_access = true;
  h.state.afterAI = () => { h.state.user = { id: h.other, app_metadata: { role: "admin", ai_access: true } }; };
  assert.match((await h.advance(draft)).error, /session changed/);
  h.state.afterAI = null; h.state.user = { id: h.owner, app_metadata: { ai_access: true, role: "instructor" } };
  assert.deepEqual((await h.actions.loadLessonGeneration(draft.id)).draft.parts, []);
  await h.actions.deleteLessonGeneration(draft.id);
  for (const revoke of [
    () => { h.state.user.app_metadata.ai_access = false; },
    () => { h.state.user.app_metadata.role = "learner"; },
    () => { h.state.user = null; },
  ]) {
    const imported = (await h.start({ kind: "import", source: h.state.source })).draft;
    h.state.afterAI = revoke;
    assert.ok((await h.advance(imported)).error);
    h.state.afterAI = null;
    h.state.user = { id: h.owner, app_metadata: { role: "learner", ai_access: false } };
    const saved = (await h.actions.loadLessonGeneration(imported.id)).draft;
    assert.deepEqual(saved.parts, []); assert.equal(saved.source_text, h.state.source);
    assert.ok((await h.advance(saved)).error);
    assert.equal((await h.actions.deleteLessonGeneration(imported.id)).deleted, true);
    h.state.user.app_metadata = { role: "instructor", ai_access: true };
    await h.db.query("update profiles set age=22,age_range='18-24' where id=$1", [h.owner]);
  }
});

for (const [label, revoke, importing] of [
  ["owner switch", h => { h.state.user = { id: h.other, app_metadata: { role: "admin", ai_access: true } }; }, false],
  ["AI approval revoked", h => { h.state.user.app_metadata.ai_access = false; }, false],
  ["session lost", h => { h.state.user = null; }, false],
  ["import instructor role revoked", h => { h.state.user.app_metadata.role = "learner"; }, true],
]) {
  test(`reservation recheck blocks inference after ${label} and permits explicit pending recovery`, async t => {
    const h = await harness(); t.after(h.close);
    t.mock.method(globalThis, "fetch", () => { throw new Error("Network forbidden"); });
    const draft = (await h.start(importing ? { kind: "import", source: "SYNTHETIC_PRIVATE_REFERENCE" } : {})).draft;
    assert.ok(draft);
    const originalDatabase = h.server.database;
    let changed = false;
    h.server.database = () => {
      const client = originalDatabase();
      return { ...client, async rpc(name, args) {
        const result = await client.rpc(name, args);
        if (name === "forge_generation_reserve" && result.data?.code === "ok" && !changed) {
          changed = true;
          await revoke(h);
        }
        return result;
      } };
    };
    const request = randomUUID();
    const result = await h.actions.advanceLessonGeneration(draft.id, draft.revision, request);
    assert.equal(changed, true, "the authorization change must follow a committed reservation");
    assert.ok(result.error);
    assert.equal(result.draft, undefined);
    assert.equal(JSON.stringify(result).includes("SYNTHETIC_PRIVATE_REFERENCE"), false);
    assert.equal(h.state.completions.length, 0, "no content may be sent after reservation-time revocation");
    const stored = (await h.db.query("select * from forge_lesson_generations where id=$1", [draft.id])).rows[0];
    assert.deepEqual(stored.parts, []);
    assert.equal(stored.revision, draft.revision + 1);
    assert.equal(stored.attempts.length, 1);
    assert.equal(stored.attempts[0].outcome, "pending", "revoked identity cannot settle a reservation");
    assert.equal((await h.db.query("select count(*)::int as n from forge_lessons")).rows[0].n, 0);

    h.state.user = { id: h.owner, app_metadata: { role: "instructor", ai_access: true } };
    await h.db.query("update profiles set age=22,age_range='18-24' where id=$1", [h.owner]);
    const loaded = (await h.actions.loadLessonGeneration(draft.id)).draft;
    assert.ok(loaded);
    assert.equal((await h.actions.advanceLessonGeneration(draft.id, draft.revision, request)).replay, true);
    assert.equal(h.state.completions.length, 0, "replay cannot dispatch the previously denied inference");
    assert.match((await h.advance(loaded)).error, /in flight/);
    await h.db.query(`update forge_lesson_generations set attempts=jsonb_set(attempts,'{0,lease}',to_jsonb((clock_timestamp()-interval '1 second')::text)) where id=$1`, [draft.id]);
    const recovered = await h.advance((await h.actions.loadLessonGeneration(draft.id)).draft);
    assert.ok(recovered.draft, recovered.error);
    assert.deepEqual(recovered.draft.parts, [outline]);
    assert.equal(recovered.draft.attempts[0].outcome, "expired");
    assert.equal(recovered.draft.attempts[1].outcome, "complete");
    assert.equal(h.state.completions.length, 1);
    assert.equal((await h.db.query("select count from forge_requests where user_id=$1", [h.owner])).rows[0].count, 1);
  });
}

test("bounded attempts/payloads/start quotas and missing migrations fail visibly without placeholders", async t => {
  const h = await harness(); t.after(h.close);
  h.state.missing = true;
  assert.match((await h.start()).error, /migration/);
  h.state.missing = false;
  assert.ok((await h.start({ source: "x" })).error);
  assert.ok((await h.start({ kind: "import", source: "x".repeat(20001) })).error);
  assert.ok((await h.start({ selection: { ...selection, subject: "Biology" } })).error);
  let draft = (await h.start()).draft;
  h.state.malformed = true;
  for (let i = 0; i < 3; i++) {
    assert.ok((await h.advance(draft)).error);
    draft = (await h.actions.loadLessonGeneration(draft.id)).draft;
    assert.deepEqual(draft.parts, []);
    assert.equal(draft.attempts.length, i + 1);
  }
  assert.match((await h.advance(draft)).error, /three explicit attempts/);
  assert.equal(h.state.completions.length, 3);
  for (let i = 0; i < 4; i++) assert.ok((await h.start()).draft);
  assert.match((await h.start()).error, /five daily/);
  assert.equal((await h.db.query("select count from forge_requests")).rows[0].count, 5);
  assert.equal((await h.db.query("select count(*)::int as n from forge_lessons")).rows[0].n, 0);
  assert.throws(() => generation.questionBatchSchema.parse({ questions: batch.questions.map(q => ({ ...q, options: ["A", " a ", "C", "D"] })) }));
  assert.throws(() => generation.slideSchema.parse({ ...slide, body: Array(61).fill("a").join(" ") }));
});

test("import extraction/start is consented, bounded, role-protected and contains zero inference", async t => {
  const h = await harness(); t.after(h.close);
  await h.db.query("update profiles set age=17,age_range='13-17' where id=$1",[h.owner]);
  const form = h.form({ material: new File(["synthetic"], "teaching.pdf") });
  assert.match((await h.teachingActions.importTeachingMaterial({}, form)).error, /Confirm/);
  assert.equal(h.state.extractionCalls, 0);
  form.set("consent", "on");
  h.state.user.app_metadata.role = "learner";
  assert.match((await h.teachingActions.importTeachingMaterial({}, form)).error, /Instructor/);
  h.state.user.app_metadata.role = "instructor";
  h.state.source = "x".repeat(20001);
  assert.match((await h.teachingActions.importTeachingMaterial({}, form)).error, /20,000/);
  h.state.source = "PRIVATE_REFERENCE requirements";
  // Approved imports also work when a legacy profile/age is absent.
  await h.db.query("delete from profiles where id=$1",[h.owner]);
  const started = await h.teachingActions.importTeachingMaterial({}, form);
  assert.ok(started.generationId); assert.equal(h.state.completions.length, 0);
  let draft = (await h.actions.loadLessonGeneration(started.generationId)).draft;
  assert.equal(draft.source_text, h.state.source);
  while (!generation.readyToFinalize(draft)) draft = (await h.advance(draft)).draft;
  h.state.user.app_metadata.role = "learner";
  assert.match((await h.actions.finalizeLessonGeneration(draft.id, draft.revision)).error, /Instructor/);
  h.state.user.app_metadata.role = "instructor";
  assert.equal((await h.actions.finalizeLessonGeneration(draft.id, draft.revision)).draft.source_text, null);
  assert.equal(h.state.completions.length, 8);
});

test("SQL independently validates ordering/final content, private grants, cap and account cascade", async t => {
  const h = await harness(); t.after(h.close);
  const draft = (await h.start()).draft;
  const token = randomUUID();
  const reserve = await h.rpc("forge_generation_reserve", { p_owner: h.owner, p_id: draft.id, p_revision: 1, p_request: randomUUID(), p_token: token });
  assert.equal(reserve.data.code, "ok");
  for (const part of [slide, { ...outline, plan: ["short"] }, { ...outline, title: "x".repeat(121) }, { title: outline.title, summary: outline.summary, injected: [] }]) {
    assert.equal((await h.rpc("forge_generation_settle", { p_owner: h.owner, p_id: draft.id, p_token: token, p_part: part })).data.code, "invalid");
  }
  assert.equal((await h.rpc("forge_generation_settle", { p_owner: h.owner, p_id: draft.id, p_token: null, p_part: outline })).data.code, "conflict");
  for (const role of ["anon", "authenticated"]) {
    await h.db.exec(`set role ${role}`);
    await assert.rejects(h.db.query("select * from forge_lesson_generations"), /permission denied/);
    await assert.rejects(h.db.query("select forge_generation_delete($1,$2)", [h.owner, draft.id]), /permission denied/);
    await h.db.exec("reset role");
  }
  await h.db.exec("set role service_role");
  await assert.rejects(h.db.query("update forge_lesson_generations set parts='[]'"), /permission denied/);
  await h.db.exec("reset role");
  // Populate 10 unfinished drafts without spending real/provider quota.
  for (let i = 0; i < 9; i++) await h.db.query("insert into forge_lesson_generations(id,owner_id,kind,objective,selection) values($1,$2,'studio','Software requirements',$3)", [randomUUID(), h.owner, JSON.stringify(selection)]);
  assert.match((await h.start()).error, /limit/);
  await h.db.query("delete from auth.users where id=$1", [h.owner]);
  assert.equal((await h.db.query("select count(*)::int as n from forge_lesson_generations")).rows[0].n, 0);
});

test("identity boundary 99/100/101 counts tombstones and preserves replay without another quota claim", async t => {
  const h = await harness(); t.after(h.close);
  // Historical identities are synthetic local fixtures, not 99 inference/quota calls.
  const tombstones = (await h.db.query(`insert into forge_lesson_generations(id,owner_id,deleted_at)
    select gen_random_uuid(),$1,clock_timestamp() from generate_series(1,99) returning id`, [h.owner])).rows;
  const counts = async () => (await h.db.query(`select count(*)::int as total,
    count(*) filter (where deleted_at is not null)::int as deleted,
    count(*) filter (where deleted_at is null and lesson_id is null)::int as unfinished
    from forge_lesson_generations where owner_id=$1`, [h.owner])).rows[0];
  assert.deepEqual(await counts(), { total: 99, deleted: 99, unfinished: 0 });
  const id = randomUUID();
  const hundredth = await h.start({ id });
  assert.equal(hundredth.draft?.id, id, hundredth.error);
  assert.deepEqual(await counts(), { total: 100, deleted: 99, unfinished: 1 });
  assert.equal((await h.actions.listLessonGenerations()).drafts.length, 1);

  const forbidden = randomUUID();
  assert.match((await h.start({ id: forbidden })).error, /100 retained start identities/);
  assert.equal((await h.db.query("select id from forge_lesson_generations where id=$1", [forbidden])).rows.length, 0);
  assert.equal((await h.start({ id })).replay, true, "existing starts still reconcile at the identity limit");
  assert.match((await h.start({ id: tombstones[0].id })).error, /deleted/);
  assert.equal((await h.db.query("select count from forge_requests where user_id=$1", [h.owner])).rows[0].count, 1);

  assert.equal((await h.actions.deleteLessonGeneration(id)).deleted, true);
  assert.deepEqual(await counts(), { total: 100, deleted: 100, unfinished: 0 });
  assert.deepEqual((await h.actions.listLessonGenerations()).drafts, []);
  assert.match((await h.start({ id })).error, /deleted/, "deletion cannot reset an existing start");
  assert.match((await h.start({ id: forbidden })).error, /100 retained start identities/, "deletion cannot free an identity for a 101st start");
  assert.equal((await h.db.query("select count from forge_requests where user_id=$1", [h.owner])).rows[0].count, 1);
  assert.equal(h.state.completions.length, 0);
  await h.db.query("delete from auth.users where id=$1", [h.owner]);
  assert.deepEqual(await counts(), { total: 0, deleted: 0, unfinished: 0 });
});

test("account deletion during in-flight inference cascades reference/reservation and rejects late recreation", async t => {
  const h = await harness(); t.after(h.close);
  t.mock.method(globalThis, "fetch", () => { throw new Error("Network forbidden"); });
  const draft = (await h.start({ kind: "import", source: "SYNTHETIC_PRIVATE_REFERENCE" })).draft;
  assert.ok(draft);
  let release; h.state.gate = new Promise(resolve => { release = resolve; });
  const pending = h.advance(draft);
  try {
    for (let i = 0; i < 200 && h.state.completions.length === 0; i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(h.state.completions.length, 1, "account deletion must happen during a real suspended completion");
    const reserved = (await h.actions.loadLessonGeneration(draft.id)).draft;
    assert.equal(reserved.attempts.at(-1).outcome, "pending");
    const token = reserved.attempts.at(-1).token;
    await h.db.query("delete from auth.users where id=$1", [h.owner]);
    assert.equal((await h.db.query("select id from forge_lesson_generations where owner_id=$1", [h.owner])).rows.length, 0);
    assert.equal((await h.db.query("select id from profiles where id=$1", [h.owner])).rows.length, 0);

    release(); h.state.gate = null;
    const late = await pending;
    assert.ok(late.error);
    assert.equal(late.draft, undefined);
    assert.equal(JSON.stringify(late).includes("SYNTHETIC_PRIVATE_REFERENCE"), false);
    assert.equal((await h.actions.loadLessonGeneration(draft.id)).missing, true);
    assert.equal((await h.rpc("forge_generation_settle", { p_owner: h.owner, p_id: draft.id, p_token: token, p_part: outline })).data.code, "missing");
    assert.equal((await h.rpc("forge_generation_finalize", { p_owner: h.owner, p_id: draft.id, p_revision: reserved.revision })).data.code, "missing");
    assert.ok((await h.start({ id: draft.id })).error);
    assert.equal((await h.rpc("forge_generation_start", {
      p_owner: h.owner, p_id: draft.id, p_kind: "import", p_objective: draft.objective,
      p_selection: selection, p_source: "SYNTHETIC_PRIVATE_REFERENCE",
    })).data.code, "missing");
    assert.equal((await h.db.query("select id from forge_lesson_generations where owner_id=$1", [h.owner])).rows.length, 0);
    assert.equal((await h.db.query("select id from forge_lessons where owner_id=$1", [h.owner])).rows.length, 0);
    assert.equal((await h.db.query("select user_id from forge_requests where user_id=$1", [h.owner])).rows.length, 0);
    assert.equal(h.state.completions.length, 1, "no automatic retry follows account deletion");
  } finally { release(); h.state.gate = null; await pending; }
});

test("concurrent stable-ID starts/finalizers and four-to-six-slide plans preserve exact immutable selection", async t => {
  const h = await harness(); t.after(h.close);
  const choices = [
    selection,
    { ...selection, subject: "AI Coding-Agent Skills", metadata: { ...selection.metadata, topic: "coding-agents" } },
    { ...selection, subject: "Software Development Soft and Product Skills", metadata: { ...selection.metadata, topic: "soft-product" } },
  ];
  for (const [index, choice] of choices.entries()) {
    const id = randomUUID();
    const starts = await Promise.all([h.start({ id, selection: choice }), h.start({ id, selection: choice })]);
    assert.ok(starts.every(s => s.draft?.id === id));
    assert.equal(starts.filter(s => s.replay).length, 1);
    assert.match((await h.start({ id, selection: choice, objective: "A changed immutable objective" })).error, /changed/);
    h.state.outline = { ...outline, plan: Array.from({ length: 4 + index }, (_, i) => `Software concept ${i + 1}`) };
    let draft = starts[0].draft;
    while (!generation.readyToFinalize(draft)) {
      const result = await h.advance(draft); assert.ok(result.draft, result.error);
      draft = result.draft;
    }
    const before = h.state.completions.length;
    const results = await Promise.all([
      h.actions.finalizeLessonGeneration(id, draft.revision), h.actions.finalizeLessonGeneration(id, draft.revision),
    ]);
    assert.ok(results.every(r => r.draft?.lesson_id === id));
    assert.equal(h.state.completions.length, before);
    const saved = (await h.db.query("select content from forge_lessons where id=$1", [id])).rows[0].content;
    assert.equal(saved.slides.length, 4 + index);
    assert.equal(saved.questions.length, 10);
    assert.equal(saved.subject, choice.subject);
    assert.deepEqual(saved.metadata, choice.metadata);
  }
  assert.equal((await h.db.query("select count from forge_requests")).rows[0].count, 3);
  assert.equal((await h.db.query("select count(*)::int as n from forge_lessons")).rows[0].n, 3);
});
