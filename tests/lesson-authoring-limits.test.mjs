import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { harness, draft, slides, learning, presentation, resume, migration } from "./slide-authoring-harness.mjs";

const filename = "20261106090000_lesson_authoring_limits_ran.sql";
const directory = new URL("../supabase/migrations/", import.meta.url);
const sql = readFileSync(new URL(filename, directory), "utf8");
const authored = (count, body = " Complete\n\nbody ".repeat(40)) => ({
  ...draft(), slides: Array.from({length:count}, (_,i)=>({...draft().slides[0], title:`Slide ${i+1}`, body:`${body}${i}`})),
});

test("expanded legacy create/update/read/resume retains text and actual bounds; standard remains strict", async () => {
  const h = await harness();
  try {
    // Simulate a target with the presentation prerequisite but old author caps;
    // replace only its renamed legacy function, never the presentation wrapper.
    const historicalDefinition=migration.slice(migration.indexOf("create or replace function"),migration.indexOf("alter table public.forge_lessons"))
      .replace("public.forge_lesson_content_valid","public.forge_legacy_lesson_content_valid");
    await h.db.exec(historicalDefinition);
    const rejected=await h.actions.createManualLesson({},h.form(authored(7)));
    assert.match(rejected.error,/23514.*20261106090000_lesson_authoring_limits\.sql/);
    assert.equal(rejected.saveUncertain,undefined);
    await h.db.exec(sql);
    for (const count of [1,2,7,30]) {
      const value = authored(count);
      assert.equal(slides.authorLessonSchema.safeParse(value).success,true);
      const created = await h.actions.createManualLesson({},h.form(value));
      assert.ok(created.lessonId,created.error);
      const read = await h.server.accessibleLesson(created.lessonId,h.state.user);
      assert.deepEqual(slides.fromStoredLesson(read.content),value);
      assert.equal(read.content.slides.length,count,"no blank-slide padding");
      assert.equal(read.content.activity.steps.length,3,"valid fallback activity even with one or two slides");
      await h.db.query("insert into forge_enrollments(user_id,lesson_id) values($1,$2)",[h.owner,created.lessonId]);
      const position={stage:"slides",slide:count-1,ordering:[2,1,0],answers:[]};
      const saved=await h.actions.saveResume(created.lessonId,1,0,position);
      assert.equal(saved.revision,1,saved.error);
      const record=(await h.db.query("select * from forge_resume where lesson_id=$1",[created.lessonId])).rows[0];
      assert.equal(resume.resumeSchemaForLesson(read.content).parse(record).slide,count-1);
      assert.ok((await h.actions.saveResume(created.lessonId,1,1,{...position,slide:count})).error);
      assert.ok((await h.actions.saveResume(created.lessonId,1,1,{...position,slide:-1})).error);
      const updated={...value,title:`Updated ${count}`,slides:value.slides.map(s=>({...s,body:s.body+"\nKept on update"}))};
      assert.equal((await h.actions.updateLesson({},h.form(updated,{lessonId:created.lessonId,version:"1"}))).version,2);
      assert.deepEqual(slides.fromStoredLesson((await h.server.accessibleLesson(created.lessonId,h.state.user)).content),updated);
      h.state.user={id:h.other,app_metadata:{}};
      assert.ok((await h.actions.updateLesson({},h.form(updated,{lessonId:created.lessonId,version:"2"}))).error);
      assert.ok((await h.actions.saveResume(created.lessonId,2,1,position)).error);
      h.state.user={id:h.owner,app_metadata:{}};
    }
    for (const value of [authored(0),authored(31),authored(1,"x".repeat(10001)),authored(1,"\u0000"),{...authored(1),slides:[{...draft().slides[0],body:" \n "}]}]) {
      const before=h.state.writes.length;
      assert.ok((await h.actions.createManualLesson({},h.form(value))).error);
      assert.equal(h.state.writes.length,before);
    }
    const standard={...slides.toStoredLesson(draft(10)),template:"standard",slides:Array(4).fill(slides.toStoredLesson(draft()).slides[0])};
    assert.ok(learning.lessonSchema.safeParse(standard).success);
    assert.equal(learning.lessonSchema.safeParse({...standard,slides:standard.slides.map(s=>({...s,body:"x".repeat(401)}))}).success,false);
    assert.equal(learning.lessonSchema.safeParse({...standard,slides:standard.slides.slice(0,3)}).success,false);
    assert.equal(learning.lessonSchema.safeParse({...standard,questions:standard.questions.slice(0,9)}).success,false);
    const result=await h.db.query("insert into forge_lessons(owner_id,title,subject,summary,content) values($1,$2,$3,$4,$5) returning id",
      [h.owner,standard.title,standard.subject,standard.summary,JSON.stringify(standard)]);
    await h.db.query("insert into forge_enrollments(user_id,lesson_id) values($1,$2)",[h.owner,result.rows[0].id]);
    assert.ok((await h.actions.saveResume(result.rows[0].id,1,0,{stage:"slides",slide:6,ordering:[2,1,0],answers:Array(10).fill(-1)})).error);
  } finally { await h.db.close(); }
});

test("new SQL alone after prerequisites: 23514 RED, twice idempotent, rows/wrapper/assets/grants retained", async () => {
  const db=new PGlite();
  const owner="00000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql as 'select null::uuid';`);
    await db.exec(readFileSync(new URL("../supabase/schema.sql",import.meta.url),"utf8"));
    for(const file of readdirSync(directory).filter(n=>n.endsWith(".sql")&&n<filename).sort()) await db.exec(readFileSync(new URL(file,directory),"utf8"));
    await db.query(`insert into auth.users(id,raw_user_meta_data) values($1,'{"age":22}')`,[owner]);
    const insert=content=>db.query("insert into forge_lessons(owner_id,title,subject,summary,content) values($1,$2,$3,$4,$5) returning id",
      [owner,content.title,content.subject,content.summary,JSON.stringify(content)]);
    const existing=slides.toStoredLesson(draft());
    const id=(await insert(existing)).rows[0].id;
    const position=(lessonId,count,slide,template="slides",answers=[])=>db.query(`insert into forge_resume
      (user_id,lesson_id,lesson_version,lesson_template,lesson_format,slide_count,question_count,stage,slide,ordering,answers)
      values($1,$2,1,$3,'legacy',$4,$5,'slides',$6,array[2,1,0],$7)`,
    [owner,lessonId,template,count,answers.length,slide,answers]);
    await position(id,3,2);
    for(const count of [1,2,7,30]) await assert.rejects(insert(slides.toStoredLesson(authored(count))),e=>e.code==="23514");
    await assert.rejects(insert(slides.toStoredLesson(authored(3))),e=>e.code==="23514","old body ceiling");
    await assert.rejects(position(id,7,6),e=>e.code==="23514"&&e.constraint==="forge_resume_position_check");
    const rows=async()=>Promise.all(["forge_lessons","forge_resume","forge_attempts"].map(t=>db.query(`select * from ${t}`)));
    const definitions=async()=>db.query(`select proname,pg_get_functiondef(oid) definition,proacl::text privileges from pg_proc
      where proname in ('forge_lesson_content_valid','forge_presentation_valid','forge_check_presentation_assets','forge_presentation_asset_ids') order by proname`);
    const before=await rows(),functions=await definitions();
    await db.exec(sql); await db.exec(sql);
    assert.deepEqual((await rows()).map(r=>r.rows),before.map(r=>r.rows));
    assert.deepEqual((await definitions()).rows,functions.rows,"do not replace presentation wrapper/geometry/assets/privileges");
    for(const count of [1,2,7,30]) {
      const value=authored(count);
      value.slides=value.slides.map(s=>({...s,body:"x".repeat(10000)}));
      const content=slides.toStoredLesson(value);
      const lesson=(await insert(content)).rows[0].id;
      await position(lesson,count,count-1);
      await assert.rejects(db.query("update forge_resume set slide=$2 where lesson_id=$1",[lesson,count]),e=>e.code==="23514");
      await assert.rejects(db.query("update forge_resume set slide=-1 where lesson_id=$1",[lesson]),e=>e.code==="23514");
    }
    for(const bad of [{...existing,slides:Array(31).fill(existing.slides[0])},{...existing,slides:[]},
      {...existing,slides:[{...existing.slides[0],body:""}]},{...existing,slides:[{...existing.slides[0],body:"x".repeat(10001)}]},
      {...existing,slides:[null]},{...existing,slides:null},{...existing,questions:[{},{}]},{...existing,template:null}]) {
      await assert.rejects(insert(bad),e=>e.code==="23514");
    }
    await assert.rejects(db.exec("update forge_resume set slide_count=31"),e=>e.code==="23514");
    await assert.rejects(position(id,7,6,"standard",Array(10).fill(-1)),e=>e.code==="23514");
    const doc=presentation.blankPresentation();doc.title="Wrapper retained";doc.document.slides[0].elements.push(presentation.newText("Fits"));
    const native=slides.toPresentationLesson(doc);
    await insert(native);
    const badGeometry=structuredClone(native);badGeometry.slides[0].elements[0].x=970;
    await assert.rejects(insert(badGeometry),e=>e.code==="23514");
    const missingAsset=structuredClone(native);
    missingAsset.slides[0].elements.push({id:crypto.randomUUID(),type:"image",assetId:crypto.randomUUID(),alt:"Synthetic",ratio:1,x:0,y:0,w:100,h:100,rotation:0});
    await assert.rejects(insert(missingAsset),e=>e.code==="23514");
    for(const role of ["anon","authenticated","service_role"]) for(const fn of ["forge_legacy_lesson_content_valid","forge_lesson_content_valid","forge_presentation_valid"]) {
      assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,`public.${fn}(jsonb)`])).rows[0].allowed,role==="service_role");
    }
  } finally { await db.close(); }
});

test("full parser text and newline-heavy imports fit presentation safety schema without text loss", () => {
  for(const text of ["x".repeat(60000),"line\n\n".repeat(10000)]) {
    const imported={...draft(),slides:slides.slidesFromMaterial({text},"text")};
    const doc=presentation.legacyPresentation(imported);
    assert.equal(presentation.presentationAuthorSchema.safeParse(doc).success,true);
    assert.equal(doc.document.slides.length,30);
    assert.equal(doc.document.slides.map(s=>presentation.textOf(s.elements[1])).join(""),text);
  }
});
