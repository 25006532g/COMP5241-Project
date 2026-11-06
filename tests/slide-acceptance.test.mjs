// Bounded independent acceptance: actual validators/actions, disposable PGlite only.
import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { harness, draft, slides, learning, curriculum, resume, migration, load } from "./slide-authoring-harness.mjs";

test("independent SQL matrix: slide 0/3, standard 10, malformed JSON, attempt totals and retained snapshots", async () => {
  const h = await harness();
  try {
    const stored = slides.toStoredLesson(draft());
    const insert = content => h.db.query(
      "insert into forge_lessons(owner_id,title,subject,summary,content) values($1,'SQL probe','Testing','Synthetic only',$2) returning id",
      [h.owner, content === undefined ? null : JSON.stringify(content)],
    );
    for (const count of [0, 3]) {
      assert.equal((await insert(slides.toStoredLesson(draft(count)))).rows.length, 1);
    }
    for (const count of [1, 2]) {
      await assert.rejects(insert({ ...stored, questions: Array(count).fill({}) }),
        e => e.code === "23514" && e.constraint === "forge_lessons_content_check");
    }
    const standard = { ...slides.toStoredLesson(draft(10)), template: "standard",
      slides: Array(4).fill(stored.slides[0]) };
    const id = (await insert(standard)).rows[0].id;
    assert.equal(learning.lessonSchema.safeParse(standard).success, true);
    await assert.rejects(insert({ ...standard, questions: standard.questions.slice(0, 9) }), e => e.code === "23514");
    for (const bad of [null, [], {}, { questions: null }, { questions: {} }, { questions: "ten" },
      { ...stored, questions: [null, {}, {}] }, { ...stored, slides: null },
      { ...stored, slides: {} }, { ...stored, slides: [null, {}, {}] },
      { ...stored, slides: [] }, { ...stored, template: null }]) {
      await assert.rejects(insert(bad), e => e.code === "23514", JSON.stringify(bad));
    }
    await assert.rejects(insert(undefined), e => ["23502", "23514"].includes(e.code), "SQL NULL must be rejected");
    await h.db.query(`insert into forge_enrollments(user_id,lesson_id,progress_evidence)
      values($1,$2,'{"1":{"attended_at":"2026-11-05T00:00:00Z"}}')`, [h.owner, id]);
    for (const score of [5, 6]) {
      const result = await h.actions.submitQuiz(id, 1, Array.from({ length: 10 }, (_, i) => i < score ? 0 : 1));
      assert.ok(result.attemptId, result.error);
      const attempt = (await h.db.query("select * from forge_attempts where id=$1", [result.attemptId])).rows[0];
      assert.equal(attempt.score, score);
      assert.equal(attempt.lesson_template, "standard");
      assert.deepEqual(learning.attemptOutcome(attempt), { total: 10, passed: score === 6 });
    }
    assert.equal((await h.actions.saveResume(id, 1, 0,
      { stage: "quiz", slide: 3, ordering: [2, 1, 0], answers: Array(10).fill(-1) })).revision, 1);
    for (const patch of ["score=11", "answers='[0,0,0]'", "questions='[{}, {}, {}]'"]) {
      await assert.rejects(h.db.exec(`update forge_attempts set ${patch}`), e => e.code === "23514");
    }
    const before = await Promise.all(["forge_lessons", "forge_attempts", "forge_resume"]
      .map(table => h.db.query(`select * from ${table} order by ${table === "forge_resume" ? "lesson_id" : "id"}`)));
    await h.db.exec(migration);
    const after = await Promise.all(["forge_lessons", "forge_attempts", "forge_resume"]
      .map(table => h.db.query(`select * from ${table} order by ${table === "forge_resume" ? "lesson_id" : "id"}`)));
    assert.deepEqual(after.map(r => r.rows), before.map(r => r.rows));
  } finally { await h.db.close(); }
});

test("independent real access helper/actions: trusted roles, foreign draft denial, review and auth loss", async () => {
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, undefined, "requires OS-only offline runner");
  assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY, undefined, "requires OS-only offline runner");
  const h = await harness();
  // Synthetic configuration only: the client factory below never contacts Supabase.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline.invalid";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-not-a-credential";
  try {
    const permissions = load("../src/lib/permissions.ts", {});
    const real = load("../src/lib/learning-server.ts", {
      "server-only": {}, "@supabase/supabase-js": { createClient: () => h.server.database() },
      "next/navigation": { redirect() { throw new Error("Redirect"); } },
      "@/lib/supabase/server": { createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: h.state.user }, error: h.state.authError ?? null }) },
      }) },
      "@/lib/learning": learning, "@/lib/permissions": permissions, zod: { z },
    });
    const a = load("../src/app/learning/actions.ts", {
      "next/cache": { revalidatePath: p => h.state.paths.push(p) }, zod: { z },
      "@/lib/learning-server": real, "@/lib/learning": learning, "@/lib/curriculum": curriculum,
      "@/lib/slide-lesson": slides, "@/lib/resume": resume, "@/lib/openrouter": {},
      "@/lib/lesson-generation-server": {}, "@/lib/ai-eligibility-server": {},
    });
    const created = await a.createManualLesson({}, h.form());
    assert.ok(created.lessonId, created.error);
    const id = created.lessonId;
    h.state.user = { id: h.other, app_metadata: {}, user_metadata: { role: "admin" } };
    assert.equal(await real.accessibleLesson(id, h.state.user, true), null);
    assert.ok((await a.updateLesson({}, h.form(draft(), { lessonId: id, version: "1" }))).error);
    assert.match((await a.approveSlideLesson({}, h.form(draft(), { lessonId: id, version: "1" }))).error, /Administrator/);
    h.state.user.app_metadata.role = "admin";
    assert.equal(await real.accessibleLesson(id, h.state.user, true), null, "admin cannot read unrequested foreign private draft");
    h.state.user = { id: h.owner, app_metadata: { role: "instructor" } };
    const request = await a.updateLesson({}, h.form(draft(3), { lessonId: id, version: "1", intent: "publish", publish: "on" }));
    assert.equal(request.version, 2, request.error);
    h.state.user = { id: h.other, app_metadata: { role: "instructor" } };
    assert.equal(await real.accessibleLesson(id, h.state.user, true), null);
    assert.match((await a.approveSlideLesson({}, h.form(draft(), { lessonId: id, version: "2" }))).error, /Administrator/);
    h.state.user.app_metadata.role = "admin";
    assert.equal((await real.accessibleLesson(id, h.state.user, true)).visibility, "private");
    assert.equal(await real.accessibleLesson(id, h.state.user), null, "review access must be explicit");
    assert.ok((await a.approveSlideLesson({}, h.form(draft(), { lessonId: id, version: "2" }))).success);
    h.state.user = { id: h.owner, app_metadata: { role: "instructor" } };
    const plain = await a.updateLesson({}, h.form(draft(3), { lessonId: id, version: "2", publish: "on" }));
    assert.equal(plain.version, 3, plain.error);
    const row = (await h.db.query("select * from forge_lessons where id=$1", [id])).rows[0];
    assert.equal(row.visibility, "private"); assert.equal(row.review_requested, false); assert.equal(row.published_at, null);
    h.state.authError = { message: "Synthetic revoked session" };
    const before = h.state.writes.length;
    assert.ok((await a.createManualLesson({}, h.form())).error);
    assert.equal(h.state.writes.length, before, "user plus auth error must not write");
    h.state.user = null;
    assert.ok((await a.updateLesson({}, h.form(draft(), { lessonId: id, version: "3" }))).error);
    assert.equal(h.state.writes.length, before);
  } finally {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await h.db.close();
  }
});
