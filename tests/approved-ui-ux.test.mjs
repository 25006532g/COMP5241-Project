import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mkdir} from "node:fs/promises";
import {createRequire} from "node:module";
import {dirname,join} from "node:path";
import {tmpdir} from "node:os";
import ts from "typescript";
import {chromium,expect} from "@playwright/test";
import {sources as base,mountPresentation} from "./presentation-browser-harness.mjs";
import {harness,presentation as model} from "./slide-authoring-harness.mjs";

// Real UI/routes/Fabric, synthetic action boundaries and disposable PGlite.
// Run through offline-run.mjs: no Next/env loader, server or connected services.
const require=createRequire(import.meta.url),sources={...base};
for(const [name,file] of [
  ["shell","components/learner-shell.tsx"],["coach","components/lesson-coach.tsx"],
  ["controls","components/learning-controls.tsx"],["catalog","app/catalog/page.tsx"],
  ["dashboard","app/dashboard/page.tsx"],["teaching","app/teaching/page.tsx"],
  ["@/components/catalog-search","components/catalog-search.tsx"],
  ["@/components/lesson-metadata","components/lesson-metadata.tsx"],
  ["permissions","lib/permissions.ts"],["@/lib/curriculum","lib/curriculum.ts"],
  ["@/lib/learning","lib/learning.ts"],
])sources[name]=ts.transpileModule(readFileSync(`src/${file}`,"utf8"),{
  compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
}).outputText;
sources["lucide-react"]=readFileSync(require.resolve("lucide-react"),"utf8");
const preflight=readFileSync(join(dirname(require.resolve("tailwindcss/package.json")),"preflight.css"),"utf8");
const css=`@layer base {${preflight}}\n${readFileSync("src/app/globals.css","utf8").replace('@import "tailwindcss";',"")}\n${readFileSync("src/components/lesson-metadata.module.css","utf8")}`;
const artifacts=join(process.env.TEMP??tmpdir(),"forge-approved-ui-ux");
const owner="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002";
const metadata={version:1,topic:"testing",audience:"both",difficulty:"foundation",outcomes:["Compare testing techniques"],prerequisites:[]};
const lesson=(id,patch={})=>({id,owner_id:owner,title:`Synthetic lesson ${id}`,summary:"Practice testing techniques.",subject:"Software Development Life Cycle",visibility:"public",version:3,metadata,...patch});
const records={enrollments:[],attempts:[],bookmarks:[]};

async function fixture(t,width=1440){
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width,height:1000}});
  console.log("Offline installed Chromium:",browser.version());
  const page=await context.newPage(),errors=[],requests=[];
  page.setDefaultTimeout(5000);
  page.on("pageerror",error=>errors.push(error.message));
  await context.route("**/*",route=>{
    if(route.request().url().startsWith("https://forge.test/"))return route.fulfill({contentType:"text/html",body:`<style>${css}</style><div id="root"></div>`});
    requests.push(route.request().url());return route.abort();
  });
  t.after(async()=>{await context.close();await browser.close();assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);});
  return page;
}
async function screenshot(page,name){
  await mkdir(artifacts,{recursive:true});
  const path=join(artifacts,`${name}.png`);await page.screenshot({path,fullPage:true});console.log("UI screenshot:",path);
}
async function mount(page,kind,config={}){
  await page.goto("https://forge.test/");
  await page.evaluate(async({sources,kind,config,owner,records})=>{
    const modules={},React=()=>load("react");
    const user={id:owner,app_metadata:{role:config.role??"instructor"}},rows=config.rows??[],saved=config.records??records;
    const server={
      ...load("permissions"),requireUser:async()=>user,displayName:async()=>"Synthetic learner",
      visibleLessons:async()=>rows,userRecords:async()=>saved,
      accessibleLesson:async id=>rows.find(row=>row.id===id&&(row.owner_id===owner||row.visibility==="public"))??null,
      database:()=>({from(){
        // Match the real roster's projection; full LessonRow fixtures must not
        // hide a false-empty regression involving the id,title query shape.
        let columns="*";
        const filters=[],query={select(value){columns=value;return query;},eq(key,value){filters.push([key,value]);return query;},order(){return query;},
          range:async(start,end)=>({data:rows.filter(row=>filters.every(([key,value])=>row[key]===value)).slice(start,end+1)
            .map(row=>columns==="*"?row:Object.fromEntries(columns.split(",").map(key=>[key,row[key]]))),error:null})};
        return query;
      }}),
    };
    function load(name){
      if(name==="./presentation.ts")return load("@/lib/presentation");
      if(name==="@/components/learner-shell")return load("shell");
      if(name==="next/link")return {__esModule:true,default:({children,...props})=>React().createElement("a",props,children)};
      if(name==="next/navigation")return {notFound(){throw new Error("NOT_FOUND");},redirect(url){throw new Error(`REDIRECT ${url}`);}};
      if(name==="@/lib/learning-server")return server;
      if(name==="@/lib/onboarding-server")return {loadSetup:async()=>({code:"ok",user,profile:{onboarding_completed_at:"2026-11-06"}})};
      if(name==="@/app/auth/actions")return {logOut:async()=>{}};
      if(name==="@/app/learning/actions")return new Proxy({},{get:(_,action)=>(...args)=>window.uiAction(action,args)});
      if(name==="@/components/learner-import")return {LearnerImport:({lessonId})=>React().createElement("p",null,`Roster for ${lessonId}`)};
      if(name==="@/components/lesson-generation")return {LessonGeneration:()=>React().createElement("p",null,"Synthetic teaching materials")};
      if(name==="./lesson-preview")return {};
      if(name==="./lesson-metadata")return load("@/components/lesson-metadata");
      if(name.endsWith(".module.css"))return {__esModule:true,default:new Proxy({},{get:(_,key)=>key})};
      if(!modules[name]){
        if(!sources[name])throw new Error(`Unexpected dependency ${name}`);
        const mod={exports:{}};modules[name]=mod;
        new Function("require","module","exports","process",sources[name])(load,mod,mod.exports,{env:{NODE_ENV:"development"}});
      }
      return modules[name].exports;
    }
    let element;
    if(["dashboard","teaching","catalog"].includes(kind))element=await load(kind).default({searchParams:Promise.resolve(config.filters??{})});
    else element=React().createElement(load("shell").LearnerShell,{active:"/dashboard",name:"Synthetic learner"},
      React().createElement("div",{className:"portal-page"},React().createElement("h1",null,"Synthetic learning"),
        kind==="coach"?React().createElement(load("coach").LessonCoach,{id:"synthetic"}):
          kind==="bookmark"?React().createElement(load("controls").BookmarkButton,{id:"synthetic",initial:config.initial??false}):
            React().createElement("a",{href:"/catalog"},"Find a lesson")));
    load("react-dom/client").createRoot(document.getElementById("root")).render(element);
  },{sources,kind,config,owner,records});
  await page.locator("#page-content").waitFor();
}
async function tabTo(page,locator){
  for(let i=0;i<30;i++){
    await page.keyboard.press("Tab");
    if(await locator.evaluate(el=>el===document.activeElement))return;
  }
  throw new Error(`Native Tab never reached ${await locator.innerText()}`);
}
async function noOverflow(page){
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"page must fit viewport");
  assert.deepEqual(await page.locator("#page-content button").evaluateAll(buttons=>buttons.filter(b=>b.clientWidth&&b.scrollWidth>b.clientWidth).map(b=>b.textContent)),[],"button labels must fit");
}
function draft(){
  const value=model.blankPresentation();value.title="Synthetic formatting";
  const first=model.newText("Lead 中文 tail");first.w=500;first.h=100;
  first.paragraphs=[{runs:[{...model.defaultRun,text:"Lead "},{...model.defaultRun,text:"中文",bold:true},{...model.defaultRun,text:" tail",italic:true}]}];
  value.document.slides[0].elements=[first,{...model.newText("Second textbox"),y:250,w:500,h:100}];
  return value;
}
const mark=(page,name)=>page.getByRole("button",{name,exact:true});
async function outline(page){
  await page.waitForFunction(()=>editCanvas.getObjects().length===2);
  await page.locator(".presentation-outline > summary").click();
  await page.getByRole("checkbox",{name:/Object 1:/}).check();
}

test("approved 1: request wording, pending, private save/version, failures and independent publication",async t=>{
  const h=await harness();t.after(()=>h.db.close());
  const page=await fixture(t),calls=[];let mode="error",release;
  await page.exposeFunction("images",()=>({error:"Unused"}));
  await page.exposeFunction("persist",async(name,entries)=>{
    calls.push({name,entries});
    if(mode==="error")return {error:"Synthetic save rejected. Nothing was saved."};
    if(mode==="reject")throw new Error("Synthetic transport lost");
    if(mode==="gate")await new Promise(resolve=>{release=resolve;});
    const form=new FormData();for(const [k,v]of entries)form.set(k,v);return h.actions[name]({},form);
  });
  await mountPresentation(page,{initial:draft()});
  const request=mark(page,"Save & request approval");
  await expect(page.locator("#presentation-approval-note")).toBeVisible();
  await expect(request).toHaveAccessibleDescription(/Save is private.*only after an administrator publishes/);
  assert.match(await page.locator("#presentation-approval-note").innerText(),/only after an administrator publishes/);
  await request.click();await expect(page.getByRole("alert")).toContainText("Nothing was saved");
  await expect(page.getByRole("alert")).toBeFocused();assert.equal(await page.getByRole("status").count(),0);
  await expect(page.getByLabel("Lesson title")).toHaveValue("Synthetic formatting");
  mode="gate";await request.focus();await page.keyboard.press("Enter");
  await expect(request).toBeDisabled();await expect(request).toHaveText("Saving & requesting approval…");
  await expect(page.locator(".presentation-save-state")).toContainText("Saving privately & requesting approval");
  await screenshot(page,"request-pending-1440");
  await page.keyboard.press("Enter");assert.equal(calls.length,2);assert.equal(await page.getByRole("alert").count(),0);
  release();mode="save";
  await expect(page.getByRole("status")).toContainText("Saved privately and requested administrator approval");
  await expect(page.getByRole("status")).toContainText("Not published; learners cannot see this draft");
  await expect(request).toBeEnabled();
  let row=(await h.db.query("select * from forge_lessons")).rows[0];
  assert.equal(row.visibility,"private");assert.equal(row.review_requested,true);assert.equal(row.version,1);assert.equal(row.published_at,null);
  assert.equal(h.state.writes.filter(w=>w.table==="forge_lessons").length,1);
  await mark(page,"Save").click();await expect(page.getByRole("status")).toContainText("Version 2");
  row=(await h.db.query("select * from forge_lessons")).rows[0];assert.equal(row.review_requested,false);assert.equal(row.visibility,"private");
  await request.click();await expect(page.getByRole("status")).toContainText("Version 3");
  assert.equal(h.state.writes.filter(w=>w.table==="forge_lessons").length,3);
  const approval=new FormData();approval.set("lessonId",row.id);approval.set("version","3");
  assert.equal((await h.actions.approveSlideLesson({},approval)).error,"Administrator approval required.");
  assert.equal(h.state.writes.filter(w=>w.table==="forge_lessons").length,3);
  h.state.user.app_metadata.role="admin";
  assert.equal((await h.actions.approveSlideLesson({},approval)).error,undefined);
  row=(await h.db.query("select * from forge_lessons")).rows[0];assert.equal(row.visibility,"public");assert.equal(row.version,3);
  mode="reject";await request.click();await expect(page.getByRole("alert")).toContainText("Save outcome is unknown");
  await expect(request).toBeDisabled();await expect(mark(page,"Save")).toBeDisabled();
  assert.equal(await page.getByRole("status").count(),0);assert.equal(calls.length,5);
});

test("approved 2: coach rejection/returned denial retain exact draft/history and require explicit retry",async t=>{
  const page=await fixture(t,320),calls=[];let mode="ok",release;
  await page.exposeFunction("uiAction",async(name,args)=>{
    assert.equal(name,"askCoach");calls.push(args);
    if(mode==="gate")await new Promise(resolve=>{release=resolve;});
    if(mode==="reject"||mode==="gate")throw new Error("Synthetic connection lost");
    return mode==="denied"?{error:"Administrator approval is required."}:{reply:"Synthetic coach explanation"};
  });
  await mount(page,"coach");const input=page.getByLabel("Ask about this lesson"),ask=mark(page,"Ask coach");
  await input.fill("First question");await input.press("Tab");await page.keyboard.press("Enter");
  await expect(input).toHaveValue("");await expect(page.locator(".coach-message")).toHaveCount(2);
  const history=await page.locator(".coach-message").allTextContents(),text="  Draft 中文\nwith spacing  ";
  await input.fill(text);mode="gate";await ask.click();await expect(input).toBeDisabled();
  await screenshot(page,"coach-pending-320");
  await page.keyboard.press("Enter");assert.equal(calls.length,2);release();
  await expect(page.getByRole("alert")).toContainText("Connection lost");
  await expect(page.getByRole("alert")).toContainText("previous request may already have been processed");
  await expect(page.getByRole("alert")).toBeFocused();await expect(input).toBeEnabled();await expect(input).toHaveValue(text);
  assert.deepEqual(await page.locator(".coach-message").allTextContents(),history);
  await noOverflow(page);await screenshot(page,"coach-connection-error-320");
  await page.waitForTimeout(100);assert.equal(calls.length,2);
  mode="denied";await ask.click();await expect(page.getByRole("alert")).toHaveText("Administrator approval is required.");
  await expect(input).toHaveValue(text);assert.deepEqual(await page.locator(".coach-message").allTextContents(),history);
  mode="ok";await ask.focus();await page.keyboard.press("Enter");
  await expect(input).toHaveValue("");await expect(page.locator(".coach-message")).toHaveCount(4);
  assert.equal(calls.length,4);assert.deepEqual(calls[1],calls[2]);assert.deepEqual(calls[2],calls[3]);
  assert.equal(await page.getByRole("alert").count(),0);
  await mark(page,"Clear conversation").click();await expect(page.locator(".coach-message")).toHaveCount(0);
  await noOverflow(page);await screenshot(page,"coach-320");
});

test("approved 3: first native Tab/Enter moves into main; avatar name and mobile Escape/close restore focus",async t=>{
  const page=await fixture(t,320);
  for(const width of [1440,768,320]){
    await page.setViewportSize({width,height:1000});await mount(page,"shell");
    await page.keyboard.press("Tab");await expect(page.getByRole("link",{name:"Skip to page content"})).toBeFocused();
    await screenshot(page,`skip-focused-${width}`);
    await page.keyboard.press("Enter");await expect(page.locator("#page-content")).toBeFocused();
    assert.equal(await page.getByRole("main").count(),1);
    await page.keyboard.press("Tab");await expect(page.getByRole("main").getByRole("link",{name:"Find a lesson"})).toBeFocused();
  }
  await expect(page.locator(".portal-avatar")).toHaveAccessibleName("Profile & settings");
  const menu=mark(page,"Open navigation"),close=mark(page,"Close navigation");
  await menu.click();await expect(close).toBeFocused();await page.keyboard.press("Escape");await expect(menu).toBeFocused();
  await menu.click();await close.click();await expect(menu).toBeFocused();
  await menu.click();await expect(page.getByRole("navigation",{name:"Learner navigation"}).getByRole("link",{name:"Dashboard"})).toHaveAttribute("aria-current","page");
  await page.keyboard.press("Escape");await noOverflow(page);
});

test("approved 4: empty/draft/review roster explanation and owned published selection, foreign exclusion",async t=>{
  const page=await fixture(t);
  const privateRows=[lesson("draft",{visibility:"private"}),lesson("review",{visibility:"private",review_requested:true}),lesson("foreign",{owner_id:other})];
  await mount(page,"teaching",{rows:privateRows});
  await expect(page.getByRole("heading",{name:"No published lessons available to manage"})).toBeVisible();
  assert.equal(await page.getByRole("combobox",{name:"Published lesson roster"}).count(),0);
  await expect(page.getByRole("link",{name:"Lesson studio"})).toHaveAttribute("href","/studio");
  const rows=[...privateRows,lesson("owned")];await mount(page,"teaching",{rows});
  const select=page.getByRole("combobox",{name:"Published lesson roster"});
  assert.deepEqual(await select.locator("option").allTextContents(),["Select a lesson","Synthetic lesson owned"]);
  await select.selectOption("owned");await select.press("Tab");await page.keyboard.press("Enter");
  await page.waitForURL("**/?lesson=owned");
  await mount(page,"teaching",{rows,filters:{lesson:"owned"}});await expect(page.getByText("Roster for owned")).toBeVisible();
  await assert.rejects(mount(page,"teaching",{rows,filters:{lesson:"foreign"}}),/NOT_FOUND/);
  await assert.rejects(mount(page,"teaching",{rows,filters:{lesson:"review"}}),/NOT_FOUND/);
});

test("approved 5: learner-first empty dashboard and prominent version-specific Continue, unchanged routes",async t=>{
  const page=await fixture(t);await mount(page,"dashboard",{role:"learner"});
  const find=page.getByRole("main").getByRole("link",{name:"Find a lesson",exact:true});
  await expect(find).toHaveClass("auth-submit");
  const create=page.getByRole("main").getByRole("link",{name:"Create a lesson",exact:true});
  await expect(create).toHaveClass("secondary-button");await expect(create).toHaveAttribute("href","/studio");
  await find.focus();await page.keyboard.press("Enter");await page.waitForURL("**/catalog");
  const rows=[lesson("current"),lesson("passed")],saved={...records,enrollments:rows.map(row=>({lesson_id:row.id,progress_evidence:{[row.id==="current"?"2":"3"]:{reviewed_at:"2026-11-01T00:00:00Z"}}})),
    attempts:[{original_lesson_id:"passed",lesson_version:3,score:3,questions:["A","B","C"],answers:[0,0,0]}]};
  await mount(page,"dashboard",{rows,records:saved,role:"learner"});
  await expect(page.locator(".dashboard-continue")).toHaveCount(2);
  await expect(page.locator(".learning-list")).toContainText("Version 3 · Passed");
  await expect(page.locator(".learning-list")).toContainText("Version 3 · Not yet reviewed");
  const current=page.locator(".learning-list > a").first();await expect(current).toHaveAttribute("href","/courses/current/lessons/1");
  await current.focus();await page.keyboard.press("Enter");await page.waitForURL("**/courses/current/lessons/1");
});

test("approved 6: bookmark native toggles, retrieval hint, returned/transport failures and stored initial state",async t=>{
  const page=await fixture(t,320),calls=[];let mode="fail",release;
  await page.exposeFunction("uiAction",async(name,args)=>{
    assert.equal(name,"saveBookmark");calls.push(args);
    if(mode==="gate")await new Promise(resolve=>{release=resolve;});
    if(mode==="reject")throw new Error("Synthetic transport lost");
    return mode==="fail"?{error:"Synthetic bookmark rejected"}:{success:"Bookmark confirmed"};
  });
  await mount(page,"bookmark");let button=mark(page,"Bookmark lesson");
  await expect(button).toHaveAttribute("aria-pressed","false");await button.click();
  await expect(page.getByRole("alert")).toHaveText("Synthetic bookmark rejected");await expect(button).toHaveAttribute("aria-pressed","false");
  mode="gate";await button.focus();await page.keyboard.press("Enter");
  await expect(mark(page,"Updating bookmark...")).toBeDisabled();await page.keyboard.press("Enter");assert.equal(calls.length,2);release();mode="ok";
  button=mark(page,"Remove bookmark");await expect(button).toHaveAttribute("aria-pressed","true");
  assert.deepEqual(calls,[["synthetic",true],["synthetic",true]]);
  await expect(page.getByRole("link",{name:"Progress > Saved lessons"})).toHaveAttribute("href","/progress");
  mode="reject";await button.click();await expect(page.getByRole("alert")).toContainText("not confirmed");await expect(button).toHaveAttribute("aria-pressed","true");
  await noOverflow(page);await screenshot(page,"bookmark-error-320");
  mode="ok";await button.click();await expect(mark(page,"Bookmark lesson")).toHaveAttribute("aria-pressed","false");assert.deepEqual(calls.at(-1),["synthetic",false]);
  await mount(page,"bookmark",{initial:true});await expect(mark(page,"Remove bookmark")).toHaveAttribute("aria-pressed","true");
});

test("approved 7: real Fabric range/mixed/multitext state, native mouse/Tab/Enter, Undo/Redo and rich save/reopen",async t=>{
  const page=await fixture(t),writes=[];await page.exposeFunction("images",()=>({error:"Unused"}));
  await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:owner,version:writes.length,success:"Lesson saved."};});
  const initial=draft();await mountPresentation(page,{initial});await outline(page);
  await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","mixed");await expect(mark(page,"bold")).toHaveText("bold · Mixed");
  await mark(page,"bold").click();await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","true");
  await mark(page,"bold").click();await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","false");
  await mark(page,"Undo").click();await expect(page.getByText("Make it yours")).toBeVisible();
  await page.getByRole("checkbox",{name:/Object 1:/}).check();await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","true");
  await mark(page,"Undo").click();await expect(page.getByText("Make it yours")).toBeVisible();
  await page.getByRole("checkbox",{name:/Object 1:/}).check();await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","mixed");
  // Native canvas double-click and keyboard select ONLY the noninitial CJK run.
  const point=await page.evaluate(()=>{const o=editCanvas.getObjects()[0],zoom=editCanvas.getZoom();return {x:(o.left+15)*zoom,y:(o.top+15)*zoom};});
  await page.locator(".upper-canvas").dblclick({position:point});
  await page.keyboard.press("ControlOrMeta+Home");for(let i=0;i<5;i++)await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");await page.keyboard.press("Shift+ArrowRight");
  await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","true");
  assert.deepEqual(await page.evaluate(()=>{const o=editCanvas.getActiveObject();return [o.selectionStart,o.selectionEnd,o.isEditing];}),[5,7,true]);
  // A collapsed caret formats the whole textbox, so its mark state is mixed.
  await page.keyboard.press("ArrowRight");await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","mixed");
  await page.keyboard.press("Shift+ArrowLeft");await page.keyboard.press("Shift+ArrowLeft");
  await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","true");
  await tabTo(page,mark(page,"bold"));await page.keyboard.press("Enter");await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","false");
  assert.deepEqual(await page.evaluate(()=>{const o=editCanvas.getActiveObject();return [o.selectionStart,o.selectionEnd,o.isEditing];}),[5,7,true]);
  await page.keyboard.press("Tab");await expect(mark(page,"italic")).toBeFocused();await page.keyboard.press("Enter");
  await expect(mark(page,"italic")).toHaveAttribute("aria-pressed","true");
  await mark(page,"underline").click();await expect(mark(page,"underline")).toHaveAttribute("aria-pressed","true");
  const styled=await page.evaluate(slide=>presentationModules("@/lib/presentation-fabric").captureSlide(editCanvas,slide).elements[0].paragraphs,initial.document.slides[0]);
  assert.equal(styled[0].runs.find(run=>run.text==="中文").bold,false);
  assert.equal(styled[0].runs.find(run=>run.text==="中文").italic,true);assert.equal(styled[0].runs.find(run=>run.text==="中文").underline,true);
  assert.equal(styled[0].runs[0].bold,false);assert.equal(styled[0].runs.at(-1).italic,true);
  await mark(page,"Undo").click();await expect(page.getByText("Make it yours")).toBeVisible();
  await page.getByRole("checkbox",{name:/Object 1:/}).check();await expect(mark(page,"underline")).toHaveAttribute("aria-pressed","false");
  await mark(page,"Redo").click();await expect(page.getByText("Make it yours")).toBeVisible();
  await page.getByRole("checkbox",{name:/Object 1:/}).check();await expect(mark(page,"underline")).toHaveAttribute("aria-pressed","mixed");
  await mark(page,"Save").click();await expect(page.getByRole("status")).toContainText("Version 1");
  const stored=JSON.parse(new Map(writes[0]).get("content"));assert.deepEqual(stored.document.slides[0].elements[0].paragraphs,styled);
  await mountPresentation(page,{initial:stored});await outline(page);
  await expect(mark(page,"underline")).toHaveAttribute("aria-pressed","mixed");
  await page.getByRole("checkbox",{name:/Object 2:/}).check();await expect(mark(page,"italic")).toHaveAttribute("aria-pressed","mixed");
  await mark(page,"italic").click();await expect(mark(page,"italic")).toHaveAttribute("aria-pressed","true");
  assert.equal(await page.evaluate(()=>editCanvas.getActiveObjects().every(o=>o.getSelectionStyles(0,o.text.length,true).every(s=>s.fontStyle==="italic"))),true);
  await page.getByRole("checkbox",{name:/Object 1:/}).uncheck();await page.getByRole("checkbox",{name:/Object 2:/}).uncheck();
  await expect(page.getByText("Make it yours")).toBeVisible();assert.equal(await mark(page,"bold").count(),0);
  await page.getByRole("checkbox",{name:/Object 2:/}).check();await expect(mark(page,"bold")).toHaveAttribute("aria-pressed","false");
  await mark(page,"italic").click();await expect(mark(page,"italic")).toHaveAttribute("aria-pressed","false");
  await page.locator(".presentation-text-content > summary").click();
  await page.getByRole("textbox",{name:/^Textbox content/}).fill("Edited textbox");
  await expect(mark(page,"italic")).toHaveAttribute("aria-pressed","false");
  await mark(page,"Undo").click();await expect(page.getByText("Make it yours")).toBeVisible();
  await page.getByRole("checkbox",{name:/Object 2:/}).check();
  assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().text),"Second textbox");
  await expect(mark(page,"italic")).toHaveAttribute("aria-pressed","false");
  // Real formatter validation/recovery must not replace mark state or input.
  const size=page.getByLabel("Font size",{exact:true});await size.fill("121");await size.press("Enter");
  await expect(page.getByRole("alert").filter({hasText:"8 to 120"})).toBeVisible();
  await expect(mark(page,"italic")).toHaveAttribute("aria-pressed","false");
  await size.fill("28");await size.press("Enter");
  assert.equal(await page.getByRole("alert").count(),0);
  await screenshot(page,"formatting-1440");
});

test("approved 8: filtered catalog counts/headers/links, native combined filters/clear and 320/768/1440 layouts",async t=>{
  const page=await fixture(t);
  const rows=[lesson("public"),lesson("private",{visibility:"private"}),lesson("advanced",{metadata:{...metadata,difficulty:"advanced"}})];
  for(const width of [320,768,1440]){
    await page.setViewportSize({width,height:1000});
    for(const state of ["empty","enrolled"]){
      await mount(page,"dashboard",{role:"learner",rows:state==="empty"?[]:rows,records:state==="empty"?records:{...records,enrollments:[{lesson_id:"public"}]}});
      await expect(page.getByRole("main").getByRole("link",{name:"Find a lesson",exact:true})).toBeVisible();await noOverflow(page);
      await screenshot(page,`dashboard-${state}-${width}`);
    }
    await mount(page,"teaching",{rows:[]});await noOverflow(page);await screenshot(page,`teaching-empty-${width}`);
    await mount(page,"catalog",{rows,records:{...records,enrollments:[{lesson_id:"public"}]}});
    await expect(page.getByRole("status")).toHaveText("3 matching lessons");await expect(page.getByRole("status")).toBeVisible();await expect(page.locator(".catalog-card")).toHaveCount(3);
    assert.equal(await page.locator(".catalog-card img").count(),0);
    await expect(page.locator(".catalog-subject").first()).toContainText("Software Development Life Cycle");
    await expect(page.locator(".catalog-subject").first()).toContainText("Published");await expect(page.locator(".catalog-subject").nth(1)).toContainText("Private");
    await expect(page.getByRole("link",{name:"Continue lesson"})).toHaveAttribute("href","/courses/public/lessons/1");
    await noOverflow(page);await screenshot(page,`catalog-${width}`);
  }
  await page.getByRole("textbox",{name:"Search",exact:true}).fill("testing");
  await page.getByRole("combobox",{name:"Subject",exact:true}).selectOption("Software Development Life Cycle");
  await page.getByRole("combobox",{name:"Audience",exact:true}).selectOption("learners");await page.getByRole("combobox",{name:"Difficulty",exact:true}).selectOption("foundation");
  await page.getByRole("combobox",{name:"Visibility",exact:true}).selectOption("private");await mark(page,"Search").click();
  await page.waitForURL("**/catalog?*");const filters=Object.fromEntries(new URL(page.url()).searchParams);
  assert.deepEqual(filters,{q:"testing",subject:"Software Development Life Cycle",audience:"learners",difficulty:"foundation",visibility:"private"});
  await mount(page,"catalog",{rows,filters});await expect(page.getByRole("status")).toHaveText("1 matching lesson");await expect(page.getByRole("status")).toBeVisible();await expect(page.locator(".catalog-card")).toHaveCount(1);
  await expect(page.getByRole("link",{name:"View and enroll"})).toHaveAttribute("href","/courses/private");
  await screenshot(page,"catalog-single-1440");
  await mount(page,"catalog",{rows,filters:{...filters,q:"no such synthetic lesson"}});await expect(page.getByRole("status")).toHaveText("0 matching lessons");
  await expect(page.getByRole("status")).toBeVisible();await screenshot(page,"catalog-zero-1440");
  await expect(page.locator(".catalog-card")).toHaveCount(0);await page.getByRole("link",{name:"Clear all filters"}).focus();await page.keyboard.press("Enter");
  await page.waitForURL("**/catalog");await mount(page,"catalog",{rows});await expect(page.getByRole("status")).toHaveText("3 matching lessons");
});

test("QA independent 2: returned quota error stays verbatim, focused, retryable and retains exact input",async t=>{
  const page=await fixture(t,320),calls=[],quota="Your daily AI coach quota has been reached.";
  await page.exposeFunction("uiAction",async(name,args)=>{assert.equal(name,"askCoach");calls.push(args);return {error:quota};});
  await mount(page,"coach");
  const input=page.getByLabel("Ask about this lesson"),text="  quota draft 中文\n  retained  ";
  await input.fill(text);await input.press("Tab");await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toHaveText(quota);await expect(page.getByRole("alert")).toBeFocused();
  await expect(input).toHaveValue(text);await expect(input).toBeEnabled();await expect(mark(page,"Ask coach")).toBeEnabled();
  await expect(page.locator(".coach-message")).toHaveCount(0);
  await page.waitForTimeout(150);assert.equal(calls.length,1);
  await tabTo(page,mark(page,"Ask coach"));await page.keyboard.press("Enter");
  await expect.poll(()=>calls.length).toBe(2);await expect(mark(page,"Ask coach")).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveText(quota);assert.deepEqual(calls[0],calls[1]);await expect(input).toHaveValue(text);
  await page.waitForTimeout(150);assert.equal(calls.length,2);
  console.log("Repeated quota focus:",await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent})));
  await screenshot(page,"coach-repeat-quota-focus-320");
  await expect(page.getByRole("alert")).toBeFocused();assert.equal(calls.length,2);
});

test("QA independent 2 transport repeat: each genuinely rejected Promise must focus recovery after explicit native retry",async t=>{
  const page=await fixture(t,320),calls=[];
  await page.exposeFunction("uiAction",async(name,args)=>{
    assert.equal(name,"askCoach");calls.push(args);throw new Error("Synthetic rejected server-action Promise");
  });
  await mount(page,"coach");const input=page.getByLabel("Ask about this lesson"),text="  repeated transport 中文\n draft  ";
  await input.fill(text);await input.press("Tab");await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toBeFocused();await expect(input).toHaveValue(text);
  await tabTo(page,mark(page,"Ask coach"));await page.keyboard.press("Enter");
  await expect.poll(()=>calls.length).toBe(2);await expect(mark(page,"Ask coach")).toBeEnabled();
  await expect(page.getByRole("alert")).toContainText("Connection lost");
  await expect(input).toHaveValue(text);await expect(page.locator(".coach-message")).toHaveCount(0);
  await page.waitForTimeout(150);assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);
  console.log("Repeated rejection focus:",await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent})));
  await screenshot(page,"coach-repeat-transport-focus-320");
  await expect(page.getByRole("alert")).toBeFocused();
});

test("QA independent 4/5: projected roster, learner denial, admin access and long-label native links at 320/768/1440",async t=>{
  const page=await fixture(t),title="Requirements and acceptance criteria for a long synthetic software development lesson with meaningful outcomes";
  const rows=[lesson("owned",{title}),lesson("foreign",{owner_id:other})];
  await assert.rejects(mount(page,"teaching",{role:"learner",rows}),/NOT_FOUND/);
  await mount(page,"teaching",{role:"admin",rows});
  assert.deepEqual(await page.getByRole("combobox",{name:"Published lesson roster"}).locator("option").allTextContents(),
    ["Select a lesson",title,"Synthetic lesson foreign"]);
  await mount(page,"teaching",{role:"admin",rows,filters:{lesson:"foreign"}});
  await expect(page.getByText("Roster for foreign")).toBeVisible();
  for(const width of [320,768,1440]){
    await page.setViewportSize({width,height:1000});
    await mount(page,"dashboard",{role:"learner",rows,records:{...records,enrollments:[{lesson_id:"owned"}]}});
    await noOverflow(page);
    const geometry=await page.locator(".learning-list > a").evaluate(el=>{
      const card=el.getBoundingClientRect(),title=el.querySelector("h2").getBoundingClientRect(),cta=el.querySelector(".dashboard-continue").getBoundingClientRect();
      const actions=[...document.querySelectorAll(".dashboard-actions a")].map(a=>a.getBoundingClientRect());
      const overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
      return {within:title.right<=card.right+1&&cta.right<=card.right+1,overlap:overlap(title,cta)||overlap(actions[0],actions[1])};
    });
    assert.deepEqual(geometry,{within:true,overlap:false},`${width}: title/Continue and primary/secondary controls must fit without overlap`);
    await screenshot(page,`dashboard-long-title-${width}`);
    const continued=page.locator(".learning-list > a");
    await tabTo(page,continued);await page.keyboard.press("Enter");await page.waitForURL("**/courses/owned/lessons/1");
    await mount(page,"teaching",{rows});
    const select=page.getByRole("combobox",{name:"Published lesson roster"});
    await tabTo(page,select);await page.keyboard.press("ArrowDown");await page.keyboard.press("Tab");
    await expect(mark(page,"Manage learners")).toBeFocused();await page.keyboard.press("Enter");await page.waitForURL("**/?lesson=owned");
  }
});

test("QA independent 6: bookmark returned and genuinely thrown failures preserve BOTH prior states, no automatic retry",async t=>{
  const page=await fixture(t,320),calls=[];let thrown=false,release;
  await page.exposeFunction("uiAction",async(name,args)=>{
    assert.equal(name,"saveBookmark");calls.push(args);await new Promise(resolve=>{release=resolve;});
    if(thrown)throw new Error("Synthetic transport rejection");
    return {error:"Synthetic returned bookmark failure"};
  });
  for(const initial of [false,true])for(const failure of ["returned","thrown"]){
    thrown=failure==="thrown";await mount(page,"bookmark",{initial});
    const name=initial?"Remove bookmark":"Bookmark lesson",button=mark(page,name),before=calls.length;
    await expect(button).toHaveAccessibleDescription("Find bookmarks in Progress > Saved lessons.");
    await tabTo(page,button);await page.keyboard.press("Enter");
    const pending=mark(page,"Updating bookmark...");await expect(pending).toBeDisabled();
    await expect(pending).toHaveAttribute("aria-pressed",String(initial));
    await page.keyboard.press("Enter");assert.equal(calls.length,before+1);
    release();await expect(button).toBeEnabled();
    await expect(page.getByRole("alert")).toContainText(thrown?"not confirmed":"Synthetic returned bookmark failure");
    await expect(button).toHaveAttribute("aria-pressed",String(initial));
    await page.waitForTimeout(150);assert.equal(calls.length,before+1);
    assert.deepEqual(calls.at(-1),["synthetic",!initial]);
    await noOverflow(page);await screenshot(page,`bookmark-${initial}-${failure}-320`);
  }
});

test("QA independent 7: all three real Fabric marks have off/on/mixed whole-text feedback and native toggles at 320/768/1440",async t=>{
  const page=await fixture(t);
  await page.exposeFunction("images",()=>({error:"Unused"}));await page.exposeFunction("persist",()=>({error:"Unused"}));
  for(const width of [320,768,1440]){
    await page.setViewportSize({width,height:1000});
    const initial=draft(),runs=initial.document.slides[0].elements[0].paragraphs[0].runs;
    runs.forEach((run,i)=>Object.assign(run,{bold:i===1,italic:i===1,underline:i===1}));
    await mountPresentation(page,{initial});await outline(page);
    if(width<1200)await page.locator(".presentation-properties > summary").click();
    for(const name of ["bold","italic","underline"]){
      const button=mark(page,name);
      await expect(button).toHaveAttribute("aria-pressed","mixed");await expect(button).toHaveText(`${name} · Mixed`);
    }
    await screenshot(page,`formatting-mixed-${width}`);
    for(const name of ["bold","italic","underline"]){
      const button=mark(page,name);
      await tabTo(page,button);await page.keyboard.press("Enter");
      await expect(button).toHaveAttribute("aria-pressed","true");await expect(button).toHaveText(`${name} · On`);
      assert.equal(await page.evaluate(name=>{
        const o=editCanvas.getActiveObject();
        return o.getSelectionStyles(0,fabric.util.string.graphemeSplit(o.text).length,true).every(s=>
          name==="bold"?s.fontWeight==="bold"||s.fontWeight===700:name==="italic"?s.fontStyle==="italic":s.underline===true);
      },name),true);
      await button.click();await expect(button).toHaveAttribute("aria-pressed","false");await expect(button).toHaveText(`${name} · Off`);
      assert.equal(await page.evaluate(name=>{
        const o=editCanvas.getActiveObject();
        return o.getSelectionStyles(0,fabric.util.string.graphemeSplit(o.text).length,true).every(s=>
          name==="bold"?s.fontWeight!=="bold"&&s.fontWeight!==700:name==="italic"?s.fontStyle!=="italic":!s.underline);
      },name),true);
    }
    await page.getByRole("checkbox",{name:/Object 1:/}).uncheck();
    await expect(page.getByText("Make it yours")).toBeVisible();
    for(const name of ["bold","italic","underline"])assert.equal(await mark(page,name).count(),0);
    await noOverflow(page);
  }
});

test("QA coach follow-up: pending retries never steal focus and success never refocuses a stale error at 320/1440",async t=>{
  for(const width of [320,1440]){
    const page=await fixture(t,width),calls=[];let mode="ok",release;
    await page.exposeFunction("uiAction",async(name,args)=>{
      assert.equal(name,"askCoach");calls.push(args);
      const attempt=mode;
      if(attempt.startsWith("gate"))await new Promise(resolve=>{release=resolve;});
      if(attempt==="reject"||attempt==="gate-reject")throw new Error("Synthetic gated coach failure");
      return {reply:"Synthetic successful retry"};
    });
    await mount(page,"coach");
    const input=page.getByLabel("Ask about this lesson"),ask=mark(page,"Ask coach");
    const elsewhere=page.locator(".portal-topbar").getByRole("link",{name:"Profile & settings"});
    await input.click();await page.keyboard.insertText("First question");
    await input.press("Tab");await page.keyboard.press("Enter");
    await expect(input).toHaveValue("");await expect(page.locator(".coach-message")).toHaveCount(2);
    const history=await page.locator(".coach-message").allTextContents(),text="  Retry draft 中文\n exact spacing  ";
    mode="reject";await input.click();await page.keyboard.insertText(text);
    await input.press("Tab");await page.keyboard.press("Enter");
    const alert=page.getByRole("alert");
    await expect(alert).toContainText("Connection lost");await expect(alert).toBeFocused();
    await expect(input).toHaveValue(text);assert.deepEqual(await page.locator(".coach-message").allTextContents(),history);
    await tabTo(page,input);await page.keyboard.press("End");await page.keyboard.insertText("!");
    const revised=await input.inputValue();
    assert.equal(revised,`${text}!`);
    await expect(input).toBeFocused();await expect(alert).toContainText("Connection lost");
    for(const attempt of ["gate-reject","gate-ok"]){
      mode=attempt;release=undefined;
      await tabTo(page,ask);await page.keyboard.press("Enter");
      await expect(input).toBeDisabled();await expect(mark(page,"Thinking...")).toBeDisabled();
      await expect.poll(()=>typeof release).toBe("function");
      await tabTo(page,elsewhere);
      await expect(elsewhere).toBeFocused();await expect(alert).toContainText("Connection lost");
      await page.waitForTimeout(150);
      await expect(elsewhere).toBeFocused();await expect(alert).not.toBeFocused();
      assert.equal(calls.length,attempt==="gate-reject"?3:4);
      await screenshot(page,`coach-follow-up-${attempt}-pending-${width}`);
      release();
      await expect(input).toBeEnabled();await expect(mark(page,"Thinking...")).toHaveCount(0);
      if(attempt==="gate-reject"){
        await expect(ask).toBeEnabled();
        await expect(alert).toBeFocused();await expect(input).toHaveValue(revised);
        assert.deepEqual(await page.locator(".coach-message").allTextContents(),history);
        await screenshot(page,`coach-follow-up-recovery-${width}`);
      }else{
        await expect(ask).toBeDisabled();
        await expect(alert).toHaveCount(0);await expect(input).toHaveValue("");
        await expect(page.locator(".coach-message")).toHaveCount(4);
        await expect(elsewhere).toBeFocused();
        assert.deepEqual((await page.locator(".coach-message").allTextContents()).slice(0,2),history);
        await expect(page.locator(".coach-message").nth(2)).toHaveText(`You${revised.trim()}`);
        await expect(page.locator(".coach-message").nth(3)).toHaveText("CoachSynthetic successful retry");
        await screenshot(page,`coach-follow-up-success-${width}`);
      }
    }
    await page.waitForTimeout(150);assert.equal(calls.length,4);
    assert.deepEqual(calls[2],calls[3]);
    assert.deepEqual(calls[2],[ "synthetic",[
      {role:"user",content:"First question"},{role:"assistant",content:"Synthetic successful retry"},
      {role:"user",content:revised.trim()},
    ]]);
    await noOverflow(page);
  }
});
