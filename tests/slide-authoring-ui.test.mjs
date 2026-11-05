import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "@playwright/test";
import { harness, draft, transpile } from "./slide-authoring-harness.mjs";
import {sources as presentationSources} from "./presentation-browser-harness.mjs";

const require = createRequire(import.meta.url);
const sources = Object.fromEntries([
  ["react","react","react.development.js"],["react/jsx-runtime","react","react-jsx-runtime.development.js"],
  ["react-dom","react-dom","react-dom.development.js"],["react-dom/client","react-dom","react-dom-client.development.js"],
  ["scheduler","scheduler","scheduler.development.js"],
].map(([name,pkg,file]) => [name,readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)),"cjs",file),"utf8")]));
for (const [name,path] of [
  ["author","../src/components/create-lesson.tsx"],["player","../src/components/learning-controls.tsx"],
  ["studio","../src/app/studio/page.tsx"],["permissions","../src/lib/permissions.ts"],
  ["./lesson-preview","../src/components/lesson-preview.tsx"],["./lesson-metadata","../src/components/lesson-metadata.tsx"],
  ["@/lib/slide-lesson","../src/lib/slide-lesson.ts"],["./learning","../src/lib/learning.ts"],["./curriculum","../src/lib/curriculum.ts"],
]) sources[name] = transpile(path);
function bundle(path) {
  if (sources[path]) return path;
  sources[path] = "loading";
  const local = createRequire(path);
  sources[path] = readFileSync(path,"utf8").replace(/require\(["']([^"']+)["']\)/g,(_,name) => `require(${JSON.stringify(bundle(local.resolve(name)))})`);
  return path;
}
sources.zod = `module.exports = require(${JSON.stringify(bundle(require.resolve("zod")))});`;
sources["@/lib/curriculum"] = sources["./curriculum"];
Object.assign(sources,presentationSources);
sources["./presentation.ts"]=sources["./presentation"]=sources["@/lib/presentation"];
const css = readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8").replace('@import "tailwindcss";',"");

test("mounted author/upload/player: same-tick guard, versions, uncertainty, styles and stale-file recovery (offline Chromium)", async context => {
  const h = await harness();
  const browser = await chromium.launch();
  const bc = await browser.newContext({ offline:true,serviceWorkers:"block",viewport:{width:1440,height:900} });
  const requests = [], errors = [];
  await bc.route("**/*",route => { requests.push(route.request().url()); return route.abort(); });
  const artifacts = await mkdtemp(join(tmpdir(),"forge-slide-authoring-"));
  let gate = null, uploadFailure = false, uploads = 0;
  try {
    async function mount(component,props = {}) {
      const page = await bc.newPage();
      page.on("pageerror",error => errors.push(error.message));
      await page.exposeFunction("action",async (name, args) => {
        if (gate) await gate;
        if (["createManualLesson","updateLesson"].includes(name)) {
          const form = new FormData();
          for (const [k,v] of args[1]) form.set(k,v);
          return h.actions[name](args[0],form);
        }
        return h.actions[name](...args);
      });
      await page.exposeFunction("extract",async () => {
        uploads++;
        if (uploadFailure) throw new Error("PRIVATE_TRANSPORT");
        return { name:"Imported lesson",slides:draft().slides };
      });
      await page.exposeFunction("studioUser",() => h.state.user);
      await page.exposeFunction("studioLesson",(id,user,review) => h.server.accessibleLesson(id,user,review));
      await page.route("https://forge-slide.test/",route=>route.fulfill({contentType:"text/html",body:"<div></div>"}));
      await page.goto("https://forge-slide.test/");
      await page.setContent(`<style>${css}</style><main class="portal-page studio-editor"><div id="root"></div></main>`);
      await page.addScriptTag({path:join(process.cwd(),"node_modules/fabric/dist/index.min.js")});
      await page.evaluate(async ({sources,component,props}) => {
        const modules = {};
        function load(name) {
          if (name === "@/lib/learning") return load("./learning");
          if (name === "fabric") return fabric;
          if (name === "./presentation-editor"||name === "@/components/presentation-editor") return load("editor");
          if (name === "@/app/presentation/actions") return new Proxy({},{get:()=>async()=>({error:"Image actions are covered by presentation-assets.test.mjs"})});
          if (name === "@/components/create-lesson") return load("author");
          if (name === "@/components/learning-controls") return load("player");
          if (name === "@/components/learner-shell") return {LearnerShell:({children})=>load("react").createElement("main",{},children)};
          if (name === "@/lib/learning-server") return {...load("permissions"),requireUser:()=>studioUser(),accessibleLesson:(...args)=>studioLesson(...args),displayName:async()=>"Synthetic author"};
          if (name === "@/app/teaching/actions") return { extractLessonUpload: () => extract() };
          if (name === "@/app/learning/actions") return new Proxy({}, { get: (_,name) => (...args) => action(name,["createManualLesson","updateLesson"].includes(name) ? [args[0],[...args[1].entries()]] : args) });
          if (name === "next/navigation") return { notFound(){throw new Error("Not found");},useRouter: () => ({ refresh() { window.refreshes++; if(window.renderStudio) void window.renderStudio(); } }) };
          if (name === "next/link") return { __esModule:true,default:({children,...props}) => load("react").createElement("a",props,children) };
          if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
          if (name.endsWith(".module.css")) return { __esModule:true,default:{} };
          if (!modules[name]) {
            if (!sources[name]) throw new Error(`Unexpected browser module ${name}`);
            const mod = {exports:{}}; modules[name] = mod;
            new Function("require","module","exports","process",sources[name])(load,mod,mod.exports,{env:{NODE_ENV:"development"}});
          }
          return modules[name].exports;
        }
        window.refreshes = 0;
        window.root = load("react-dom/client").createRoot(document.getElementById("root"));
        if(component === "Studio"){
          window.renderStudio = async()=>root.render(await load("studio").default({searchParams:Promise.resolve(props)}));
          await window.renderStudio();
        } else root.render(load("react").createElement(load(component === "LessonPlayer" ? "player" : "author")[component],props));
      },{sources,component,props});
      return page;
    }
    const page = await mount("SlideLessonEditor");
    await page.setViewportSize({width:320,height:900});
    const blankWrites = h.state.writes.length;
    await page.getByRole("button",{name:"Save",exact:true}).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("alert").evaluate(el => el === document.activeElement),true);
    assert.equal(h.state.writes.length,blankWrites,"blank keyboard save must not write");
    await page.getByLabel("Lesson title",{exact:true}).fill("Manual complete lesson");
    await page.getByRole("combobox",{name:/^Audience/}).selectOption("both");
    await page.getByRole("combobox",{name:/^Difficulty/}).selectOption("advanced");
    assert.equal(await page.getByLabel("Title",{exact:true}).inputValue(),"");
    assert.equal(await page.getByLabel("Body",{exact:true}).inputValue(),"");
    await page.getByLabel("Text color",{exact:true}).fill("#123456");
    await page.getByLabel("Font size").selectOption("32");
    await page.getByLabel("Text position").selectOption("right");
    await page.getByLabel("Background color",{exact:true}).fill("#abcdef");
    for (let i=0;i<3;i++) {
      await page.getByLabel("Title",{exact:true}).fill(`Written title ${i}`);
      await page.getByLabel("Body",{exact:true}).fill(`Full written content ${i}`);
      if(i<2) {
        await page.getByRole("button",{name:"Next",exact:true}).focus();
        await page.keyboard.press("Enter");
      }
    }
    await page.getByLabel("Include a quiz",{exact:true}).focus();
    await page.keyboard.press("Space");
    assert.equal(await page.getByLabel("Question",{exact:true}).count(),3);
    await page.getByRole("button",{name:"Save",exact:true}).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("alert").evaluate(el => el === document.activeElement),true);
    assert.equal(h.state.writes.length,blankWrites,"incomplete optional quiz must not write");
    await page.getByLabel("Include a quiz",{exact:true}).focus();
    await page.keyboard.press("Space");
    assert.equal(await page.getByLabel("Question",{exact:true}).count(),0);
    await page.getByRole("button",{name:"Previous",exact:true}).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button",{name:"Previous",exact:true}).focus();
    await page.keyboard.press("Enter");
    const preview = await page.locator(".slide-stage").evaluate(el => ({
      background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el.querySelector("h2")).color,
      size:getComputedStyle(el.querySelector("h2")).fontSize,align:getComputedStyle(el.querySelector("h2")).textAlign,
    }));
    assert.deepEqual(preview,{background:"rgb(171, 205, 239)",color:"rgb(18, 52, 86)",size:"32px",align:"right"});
    assert.match(await page.locator(".slide-stage").innerText(),/Written title 0.*Full written content 0/s);
    await page.getByRole("button",{name:"Next",exact:true}).click();
    await page.getByRole("button",{name:"Next",exact:true}).click();
    let release;
    gate = new Promise(resolve => { release = resolve; });
    const before = h.state.writes.length;
    await page.getByRole("button",{name:"Save",exact:true}).evaluate(button => { button.click(); button.click(); });
    release(); gate = null;
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    assert.equal(h.state.writes.length,before+1);
    const id = (await h.db.query("select id from forge_lessons where title='Manual complete lesson'")).rows[0].id;
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 2"}).waitFor();
    assert.equal((await h.db.query("select count(*)::int as n from forge_lessons")).rows[0].n,1);
    assert.equal(await page.getByRole("textbox",{name:"Body",exact:true}).inputValue(),"Full written content 2");
    await page.getByRole("button",{name:"Save and publish",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 3"}).waitFor();
    const row = (await h.db.query("select * from forge_lessons where id=$1",[id])).rows[0];
    assert.equal(row.visibility,"private"); assert.equal(row.review_requested,true);
    assert.equal(row.content.questions.length,0);
    assert.equal(row.content.metadata.audience,"both"); assert.equal(row.content.metadata.difficulty,"advanced");
    assert.deepEqual(row.content.slides[0].style,draft().slides[0].style);
    await page.setViewportSize({width:320,height:900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),"mobile author must not overflow");
    await page.screenshot({path:join(artifacts,"manual320.png"),fullPage:true});
    await page.setViewportSize({width:1440,height:900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:join(artifacts,"manual1440.png"),fullPage:true});
    const player = await mount("LessonPlayer",{
      id,version:3,ownerId:h.owner,content:{...row.content,questions:[]},saved:null,revision:0,resumeAvailable:false,
    });
    await player.getByRole("button",{name:"Slides",exact:true}).waitFor();
    assert.equal(await player.getByRole("button",{name:"Practice",exact:true}).count(),0);
    assert.equal(await player.getByRole("button",{name:"Final quiz",exact:true}).count(),0);
    const visual = await player.locator(".slide-stage").evaluate(el => ({
      background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el.querySelector("h2")).color,
      size:getComputedStyle(el.querySelector("h2")).fontSize,align:getComputedStyle(el.querySelector("h2")).textAlign,
    }));
    assert.deepEqual(visual,{background:"rgb(171, 205, 239)",color:"rgb(18, 52, 86)",size:"32px",align:"right"});
    assert.equal(await player.evaluate(()=>innerWidth),1440);
    await player.screenshot({path:join(artifacts,"player1440.png"),fullPage:true});
    await player.getByRole("button",{name:"Next",exact:true}).click();
    await player.getByRole("button",{name:"Next",exact:true}).click();
    assert.equal(await player.getByRole("button",{name:"Quiz",exact:true}).count(),0);
    assert.equal(await player.getByRole("link",{name:/certificate/i}).count(),0);
    const editPage = await mount("Studio",{edit:id});
    await editPage.getByRole("button",{name:"Save",exact:true}).focus();
    await editPage.keyboard.press("Enter");
    await editPage.getByRole("status").filter({hasText:"Version 4"}).waitFor();
    await editPage.waitForFunction(()=>window.refreshes === 1);
    await editPage.getByRole("button",{name:"Save",exact:true}).click();
    await editPage.getByRole("status").filter({hasText:"Version 5"}).waitFor();
    assert.equal((await h.db.query("select version from forge_lessons where id=$1",[id])).rows[0].version,5);
    const quizPage = await mount("SlideLessonEditor",{initial:draft(3)});
    await quizPage.getByRole("button",{name:"Save",exact:true}).click();
    await quizPage.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    assert.equal((await h.db.query("select content from forge_lessons where title='Author lesson'")).rows[0].content.questions.length,3);
    const quizRow = (await h.db.query("select * from forge_lessons where title='Author lesson'")).rows[0];
    await h.db.query(`insert into forge_enrollments(user_id,lesson_id,progress_evidence) values($1,$2,'{"1":{"attended_at":"2026-11-05T00:00:00Z"}}')`,[h.owner,quizRow.id]);
    const quizPlayer = await mount("LessonPlayer",{
      id:quizRow.id,version:1,ownerId:h.owner,content:{...quizRow.content,questions:quizRow.content.questions.map(({prompt,options})=>({prompt,options}))},
      saved:{stage:"quiz",slide:2,ordering:[2,1,0],answers:[-1,-1,-1]},revision:0,resumeAvailable:true,
      evidence:{version:1,reviewedAt:null,attendedAt:"2026-11-05T00:00:00Z",passed:false},
    });
    await quizPlayer.getByRole("heading",{name:"Final quiz",exact:true}).waitFor();
    for (let i=0;i<3;i++) await quizPlayer.locator(`input[name="question-${i}"]`).nth(i===2 ? 1 : 0).check();
    await quizPlayer.getByRole("button",{name:"Submit quiz",exact:true}).click();
    await quizPlayer.getByRole("heading",{name:"2 / 3 (67%)"}).waitFor();
    assert.equal(await quizPlayer.getByRole("link",{name:"Download certificate"}).count(),1);
    assert.match(await quizPlayer.locator(".progress-evidence").innerText(),/Saved passing quiz result/);
    const savedResume = (await h.db.query("select answers from forge_resume where lesson_id=$1",[quizRow.id])).rows[0];
    assert.deepEqual(savedResume.answers,[0,0,1]);
    await quizPlayer.getByRole("button",{name:"Retry quiz",exact:true}).click();
    for(let i=0;i<3;i++) await quizPlayer.locator(`input[name="question-${i}"]`).nth(i===0 ? 0 : 1).check();
    await quizPlayer.getByRole("button",{name:"Submit quiz",exact:true}).click();
    await quizPlayer.getByRole("heading",{name:"1 / 3 (33%)"}).waitFor();
    assert.equal(await quizPlayer.getByRole("link",{name:"Download certificate"}).count(),0);
    h.state.lose = true;
    await quizPage.getByRole("button",{name:"Save",exact:true}).click();
    await quizPage.getByRole("alert").waitFor();
    assert.equal(await quizPage.getByRole("button",{name:"Save",exact:true}).isDisabled(),true);
    assert.equal(await quizPage.getByRole("button",{name:"Save and publish",exact:true}).isDisabled(),true);
    assert.equal(await quizPage.getByRole("alert").evaluate(el => el === document.activeElement),true);
    assert.doesNotMatch(await quizPage.locator("body").innerText(),/PRIVATE_/);
    const upload = await mount("UploadLessonPage");
    const file = {name:"synthetic.pptx",mimeType:"application/octet-stream",buffer:Buffer.from("synthetic transport fixture")};
    await upload.getByLabel("File",{exact:true}).setInputFiles(file);
    await upload.getByRole("button",{name:"Preview slides",exact:true}).click();
    await upload.getByRole("textbox",{name:"Lesson title",exact:true}).waitFor();
    await upload.getByRole("button",{name:"Change file",exact:true}).click();
    await upload.getByLabel("File",{exact:true}).setInputFiles({...file,name:"changed.pptx"});
    assert.equal(await upload.getByRole("textbox",{name:"Lesson title",exact:true}).count(),0);
    uploadFailure = true;
    await upload.getByRole("button",{name:"Preview slides",exact:true}).click();
    await upload.getByRole("alert").waitFor();
    assert.equal(await upload.getByRole("textbox",{name:"Lesson title",exact:true}).count(),0);
    uploadFailure = false;
    await upload.getByRole("button",{name:"Preview slides",exact:true}).click();
    await upload.getByRole("textbox",{name:"Lesson title",exact:true}).waitFor();
    assert.equal(uploads,3);
    await upload.setViewportSize({width:320,height:900});
    // Let Fabric's ResizeObserver apply the new viewport before measuring.
    await upload.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.ok(await upload.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),
      await upload.evaluate(()=>JSON.stringify([...document.querySelectorAll("body *")].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right})))));
    await upload.screenshot({path:join(artifacts,"upload320.png"),fullPage:true});
    await upload.getByRole("button",{name:"Change file",exact:true}).click();
    await upload.getByLabel("Import the PowerPoint as slides",{exact:true}).check();
    assert.equal(await upload.getByRole("textbox",{name:"Lesson title",exact:true}).count(),0);
    await upload.getByRole("button",{name:"Preview slides",exact:true}).focus();
    await upload.keyboard.press("Enter");
    await upload.getByRole("textbox",{name:"Lesson title",exact:true}).waitFor();
    await upload.getByLabel("Lesson title",{exact:true}).fill("Uploaded accepted lesson");
    await upload.getByRole("button",{name:"Save and publish",exact:true}).focus();
    await upload.keyboard.press("Enter");
    await upload.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    const imported = (await h.db.query("select * from forge_lessons where title='Uploaded accepted lesson'")).rows[0];
    assert.equal(imported.visibility,"private"); assert.equal(imported.review_requested,true);
    assert.equal(imported.content.format,"presentation");
    assert.deepEqual(imported.content.slides.map(s=>s.elements[1].paragraphs.map(p=>p.runs.map(r=>r.text).join("")).join("\n")),draft().slides.map(s=>s.body));
    await upload.screenshot({path:join(artifacts,"upload-review320.png"),fullPage:true});
    assert.deepEqual(requests,[]); assert.deepEqual(errors,[]);
    context.diagnostic(`Offline Chromium ${browser.version()}; screenshots ${artifacts}`);
  } finally { await bc.close(); await browser.close(); await h.db.close(); }
});
