import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createRequire } from "node:module";
import { harness, draft, slides, learning, migration, load } from "./slide-authoring-harness.mjs";
const require = createRequire(import.meta.url);
const React = require("react");
const jsx = require("react/jsx-runtime");
const { renderToStaticMarkup: render } = require("react-dom/server");

test("reproduce the exact legacy slide creation CHECK failure", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);`);
    await db.exec(readFileSync(new URL("../supabase/migrations/20260923_learning_ran.sql", import.meta.url), "utf8"));
    await db.exec(`insert into auth.users values('00000000-0000-4000-8000-000000000001')`);
    await assert.rejects(db.query(`insert into forge_lessons(owner_id,title,subject,summary,content)
      values('00000000-0000-4000-8000-000000000001','Slides','Subject','Summary',$1)`,
    [JSON.stringify({ template: "slides", slides: [{}, {}, {}], questions: [] })]),
    error => error.code === "23514" && error.constraint === "forge_lessons_content_check");
    // Both valid ten-question data and a historical SQL-NULL loophole row survive
    // the additive migration; new malformed writes do not acquire that loophole.
    await db.exec(readFileSync(new URL("../supabase/migrations/20260927_resume_ran.sql",import.meta.url),"utf8"));
    await db.exec(`insert into forge_lessons(owner_id,title,subject,summary,content)
      values('00000000-0000-4000-8000-000000000001','Legacy','Testing','Summary','{}');
      insert into forge_lessons(owner_id,title,subject,summary,content)
      values('00000000-0000-4000-8000-000000000001','Ten','Testing','Summary','{"questions":[{},{},{},{},{},{},{},{},{},{}]}');
      insert into forge_attempts(user_id,lesson_id,lesson_title,lesson_version,certificate_kind,answers,questions,score)
      select owner_id,id,title,1,'private','[0,0,0,0,0,0,0,0,0,0]',content->'questions',6 from forge_lessons where title='Ten';
      insert into forge_resume(user_id,lesson_id,lesson_version,stage,slide,ordering,answers)
      select owner_id,id,1,'slides',0,array[2,1,0],array[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1] from forge_lessons where title='Ten';`);
    const before = (await db.query("select * from forge_lessons order by title")).rows;
    const oldAttempts = (await db.query("select * from forge_attempts order by id")).rows;
    const oldResume = (await db.query("select * from forge_resume order by lesson_id")).rows;
    await db.exec(migration); await db.exec(migration);
    assert.deepEqual((await db.query("select * from forge_lessons order by title")).rows,before);
    assert.equal((await db.query("select count(*)::int as n from forge_resume")).rows[0].n,1);
    assert.equal((await db.query("select count(*)::int as n from forge_attempts")).rows[0].n,1);
    assert.deepEqual((await db.query("select * from forge_attempts order by id")).rows.map(({lesson_template,...row}) => {
      assert.equal(lesson_template,"standard"); return row;
    }),oldAttempts);
    assert.deepEqual((await db.query("select * from forge_resume order by lesson_id")).rows.map(({lesson_template,question_count,...row}) => {
      assert.equal(lesson_template,"standard"); assert.equal(question_count,10); return row;
    }),oldResume);
    await assert.rejects(db.exec("update forge_lessons set content='{}' where title='Ten'"),e => e.code === "23514");
  } finally { await db.close(); }
});

test("new migration and actual actions: private/review/version/variable attempts, NULL denial and idempotency", async () => {
  const h = await harness();
  try {
    const { actions: a, form, state, db } = h;
    for (const count of [1,2]) assert.ok((await a.createManualLesson({}, form(draft(count)))).error);
    assert.ok((await a.createManualLesson({}, form({ ...draft(), slides: draft().slides.slice(0,2) }))).error);
    await db.exec(`alter table forge_lessons drop constraint forge_lessons_content_check;
      alter table forge_lessons add constraint forge_lessons_content_check check(jsonb_array_length(content->'questions')=10);`);
    const rejected = await a.createManualLesson({},form());
    assert.match(rejected.error,/23514.*20261105093000_slide_authoring_ran\.sql/);
    const recommendedMigration = rejected.error.match(/apply (\S+\.sql)/)[1];
    assert.equal(readFileSync(new URL(`../supabase/migrations/${recommendedMigration}`, import.meta.url), "utf8"), migration);
    assert.equal(rejected.saveUncertain,undefined);
    await db.exec(migration);
    const standard = { ...slides.toStoredLesson(draft(10)), template: undefined, slides: Array(4).fill(slides.toStoredLesson(draft()).slides[0]) };
    assert.equal(learning.lessonSchema.safeParse(standard).success, true);
    await db.query("insert into forge_lessons(owner_id,title,subject,summary,content) values($1,'Legacy','Testing','Summary',$2)", [h.owner, JSON.stringify(standard)]);
    const first = await a.createManualLesson({}, form());
    assert.ok(first.lessonId, first.error);
    let id = first.lessonId;
    await db.query("insert into forge_enrollments(user_id,lesson_id) values($1,$2)",[h.owner,id]);
    assert.ok((await a.submitQuiz(id,1,[])).error.includes("no quiz"));
    assert.equal((await a.saveResume(id,1,0,{stage:"slides",slide:0,ordering:[2,1,0],answers:[]})).revision,1);
    assert.ok((await a.saveResume(id,1,1,{stage:"quiz",slide:0,ordering:[2,1,0],answers:[]})).error);
    await db.query("delete from forge_enrollments where lesson_id=$1",[id]);
    await db.query("delete from forge_resume where lesson_id=$1",[id]);
    assert.deepEqual((await db.query("select content from forge_lessons where id=$1", [id])).rows[0].content.slides[0].style, draft().slides[0].style);
    for (const role of ["instructor", "admin", "learner"]) {
      state.user.app_metadata.role = role;
      const created = await a.createManualLesson({}, form(draft(3), { intent: "publish", publish: "on" }));
      assert.ok(created.lessonId, created.error);
      const row = (await db.query("select * from forge_lessons where id=$1", [created.lessonId])).rows[0];
      assert.equal(row.visibility, "private"); assert.equal(row.published_at, null); assert.equal(row.review_requested, true);
    }
    state.user = { id: h.other, app_metadata: {} };
    assert.ok((await a.updateLesson({}, form(draft(), { lessonId: id, version: "1" }))).error);
    state.user = { id: h.owner, app_metadata: { role: "admin" } };
    assert.ok((await a.approveSlideLesson({}, form(draft(), { lessonId: id, version: "1" }))).error);
    assert.equal((await a.updateLesson({}, form(draft(3), { lessonId: id, version: "1", intent: "publish", publish: "on" }))).version, 2);
    assert.ok((await a.approveSlideLesson({}, form(draft(), { lessonId: id, version: "1" }))).error);
    assert.ok((await a.approveSlideLesson({}, form(draft(), { lessonId: id, version: "2" }))).success);
    const saved = await a.updateLesson({}, form(draft(3), { lessonId: id, version: "2" }));
    assert.equal(saved.version, 3);
    const row = (await db.query("select * from forge_lessons where id=$1", [id])).rows[0];
    assert.equal(row.visibility, "private"); assert.equal(row.review_requested, false); assert.equal(row.published_at, null);
    assert.ok((await a.updateLesson({}, form(standard, { template: "", lessonId: id, version: "3", publish: "on" }))).error);
    await db.query(`insert into forge_enrollments(user_id,lesson_id,progress_evidence) values($1,$2,'{"3":{"attended_at":"2026-11-05T00:00:00Z"}}')`, [h.owner,id]);
    for (const [answers,passed] of [[[0,0,1],true],[[0,1,1],false]]) {
      const result = await a.submitQuiz(id, 3, answers);
      assert.ok(result.attemptId, result.error);
      const attempt = (await db.query("select * from forge_attempts where id=$1", [result.attemptId])).rows[0];
      assert.equal(learning.attemptOutcome(attempt).passed, passed);
      assert.equal(learning.lessonProgress(undefined, [attempt], id, 3).passed, passed);
    }
    assert.equal((await a.saveResume(id,3,0,{ stage:"quiz",slide:2,ordering:[2,1,0],answers:[0,-1,1] })).revision,1);
    assert.ok((await a.saveResume(id,3,1,{ stage:"quiz",slide:2,ordering:[2,1,0],answers:Array(10).fill(0) })).error);
    for (const [column,values] of [
      ["answers",[null,{},[],[0,0],[null,0,0],["0",0,0],[4,0,0]]],
      ["questions",[null,{},[],[{},{}],[null,{},{}]]],
    ]) for (const value of values) await assert.rejects(db.query(`update forge_attempts set ${column}=$2 where lesson_id=$1`,[id,JSON.stringify(value)]),e=>e.code==="23514");
    for (const patch of ["score=4","lesson_template='standard'"]) await assert.rejects(db.query(`update forge_attempts set ${patch} where lesson_id=$1`,[id]),e=>e.code==="23514");
    for (const patch of ["answers=array[0,0]","answers=array[null,0,0]","answers=array[4,0,0]","stage='activity'","question_count=0","lesson_template='standard'"]) {
      await assert.rejects(db.query(`update forge_resume set ${patch} where lesson_id=$1`,[id]),e=>e.code==="23514");
    }
    for (const value of [{},null,[],{questions:null},{questions:{}},{questions:[]},{template:null,questions:Array(10).fill({})},
      {template:"slides",questions:[],slides:null}, {template:"slides",questions:[{},{}],slides:draft().slides}]) {
      await assert.rejects(db.query("update forge_lessons set content=$2 where id=$1", [id, JSON.stringify(value)]), e => e.code === "23514");
    }
    await db.exec(migration); await db.exec(migration);
    assert.ok((await db.query("select * from forge_lessons where title='Legacy'")).rows.length);
    assert.equal((await db.query("select count(*)::int as n from forge_attempts")).rows[0].n,2);
    for (const role of ["anon","authenticated"]) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.exec("select * from forge_lessons"), /permission denied/);
      await db.exec("reset role");
    }
    state.lose = true;
    const unknown = await a.createManualLesson({}, form());
    assert.equal(unknown.saveUncertain,true);
    const before = state.writes.length;
    assert.equal((await a.createManualLesson(unknown, form())).saveUncertain,true);
    assert.equal(state.writes.length,before);
    assert.ok(state.paths.includes("/studio") && state.paths.includes("/admin"));
  } finally { await h.db.close(); }
});

test("actual route renderers: owner-only Create history, separate blank/upload, roster, variable reporting and certificates",async () => {
  const h = await harness();
  try {
    const made = await h.actions.createManualLesson({},h.form(draft(3)));
    const id = made.lessonId;
    await h.db.query(`update forge_lessons set visibility='public' where id=$1`,[id]);
    await h.db.query(`insert into forge_enrollments(user_id,lesson_id,enrollment_kind,progress_evidence)
      values($1,$2,'public','{"1":{"attended_at":"2026-11-05T00:00:00Z"}}')`,[h.owner,id]);
    const pass = await h.actions.submitQuiz(id,1,[0,0,1]);
    const fail = await h.actions.submitQuiz(id,1,[0,1,1]);
    const attempts = JSON.parse(JSON.stringify((await h.db.query("select * from forge_attempts")).rows));
    const reporting = load("../src/lib/reporting.ts",{zod:require("zod"),"@/lib/learning":learning});
    const rows = reporting.reportRows.attempts.parse(attempts);
    assert.equal(rows.length,2);
    const enrollments = (await h.db.query("select * from forge_enrollments")).rows;
    assert.equal(reporting.buildLessonReport({id,title:"Lesson",version:1},enrollments,rows).passed,1);
    const privateLesson = await h.actions.createManualLesson({},h.form({...draft(),title:"Only owner sees"}));
    h.state.user.id = h.other;
    await h.actions.createManualLesson({},h.form({...draft(),title:"FOREIGN PRIVATE"}));
    h.state.user.id = h.owner;
    const lessons = (await h.db.query("select * from forge_lessons where owner_id=$1 or visibility='public'",[h.owner])).rows;
    const server = {
      ...h.server, requireUser:async () => h.state.user,displayName:async () => "Synthetic author",
      visibleLessons:async () => lessons,userRecords:async () => ({attempts,enrollments,bookmarks:[]}),
    };
    const controls = load("../src/components/learning-controls.tsx",{
      react:React,"react/jsx-runtime":jsx,"next/link":{default:({children,...props})=>React.createElement("a",props,children),__esModule:true},
      "lucide-react":{}, "@/app/learning/actions":h.actions,"./lesson-preview":{},"./lesson-metadata":{},
      "./presentation-view":load("../src/components/presentation-view.tsx",{react:React,"react/jsx-runtime":jsx}),
    });
    const deps = {
      "react/jsx-runtime":jsx, "next/link":{default:({children,...props})=>React.createElement("a",props,children),__esModule:true},
      "next/navigation":{notFound(){throw new Error("Not found");},redirect(){throw new Error("Redirect");}},
      "lucide-react":{BookOpen:()=>null,Plus:()=>null},
      "@/components/learner-shell":{LearnerShell:({children})=>React.createElement("main",{},children)},
      "@/components/learning-controls":{...controls,ActionForm:({children})=>React.createElement("form",{},children),LessonEditor:()=>React.createElement("p",{},"Legacy editor")},
      "@/components/create-lesson":{SlideLessonEditor:({initial})=>React.createElement("p",{},initial ? "Slide editor" : "Blank manual"),UploadLessonPage:()=>React.createElement("p",{},"Separate upload")},
      "@/components/presentation-editor":{PresentationLessonEditor:({initial,initialLegacy})=>React.createElement("p",{},initial||initialLegacy?"Slide editor":"Blank manual")},
      "@/lib/slide-lesson":slides, "@/lib/learning":learning,"@/lib/learning-server":server,"@/app/learning/actions":h.actions,
      "@/lib/onboarding-server":{loadSetup:async()=>({code:"ok",user:h.state.user,profile:{onboarding_completed_at:"2026-11-05"}})},
      "@/components/learner-import":{LearnerImport:()=>React.createElement("p",{},"Roster management")},
      "@/components/lesson-generation":{LessonGeneration:()=>null},
    };
    const studio = load("../src/app/studio/page.tsx",deps).default;
    const home = render(await studio({searchParams:Promise.resolve({})}));
    assert.match(home,/Only owner sees/); assert.doesNotMatch(home,/FOREIGN PRIVATE/);
    assert.ok(home.indexOf("Your lessons") < home.indexOf("How to create a lesson"));
    for (const [route,text] of [[{manual:"1",starter:"sdlc-small-change"},"Blank manual"],[{upload:"1"},"Separate upload"]]) {
      const html = render(await studio({searchParams:Promise.resolve(route)}));
      assert.match(html,new RegExp(text)); assert.doesNotMatch(html,/Your lessons|Only owner sees|starter/i);
    }
    const dashboard = render(await load("../src/app/dashboard/page.tsx",deps).default());
    assert.match(dashboard,/1 passed/); assert.doesNotMatch(dashboard,/Your private creations|Only owner sees/);
    const progress = render(await load("../src/app/progress/page.tsx",deps).default());
    assert.match(progress,/2\/3.*PASSED/); assert.match(progress,/1\/3.*Not passed/);
    assert.match(progress,/50%/); assert.equal((progress.match(/Certificate \(HTML\)/g)??[]).length,1);
    h.state.user.app_metadata.role="instructor";
    const teaching = render(await load("../src/app/teaching/page.tsx",deps).default({searchParams:Promise.resolve({lesson:id})}));
    assert.match(teaching,/Published lesson roster|Roster management/);
    assert.doesNotMatch(teaching,/Only owner sees|Your lessons|Lesson library/);
    const route = load("../src/app/api/certificates/[id]/route.ts",{
      "next/server":{NextResponse:class extends Response{static json(...args){return Response.json(...args);}}},
      zod:require("zod"),"@/lib/learning-server":server,"@/lib/learning":learning,
    });
    const cert = async id => route.GET(new Request("https://offline.invalid"),{params:Promise.resolve({id})});
    const passing = await cert(pass.attemptId);
    assert.equal(passing.status,200); assert.match(await passing.text(),/2\/3 \(67%\)/);
    assert.equal((await cert(fail.attemptId)).status,404);
    h.state.user.id=h.other;
    assert.equal((await cert(pass.attemptId)).status,404);
    assert.equal(await h.server.accessibleLesson(privateLesson.lessonId,h.state.user),null);
  } finally {await h.db.close();}
});
