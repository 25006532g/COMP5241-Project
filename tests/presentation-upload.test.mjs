// Narrow upload follow-up: real uploader/editor/CSS in the existing offline
// portal harness; synthetic extraction/save transport, no server or real parser.
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {chromium} from "@playwright/test";
import {transpile,draft} from "./slide-authoring-harness.mjs";
import {mountPresentation,sources} from "./presentation-browser-harness.mjs";

sources["upload"]=transpile("../src/components/create-lesson.tsx")
  .replaceAll('require("./presentation-editor")','require("editor")');
sources["@/app/teaching/actions"]="exports.extractLessonUpload=form=>window.extractUpload([...form.entries()].filter(([key])=>key==='mode'));";
for(const [name,path] of [
  ["@/lib/slide-lesson","slide-lesson"],["./learning","learning"],["./curriculum","curriculum"],
])sources[name]=transpile(`../src/lib/${path}.ts`);
sources["./presentation.ts"]=sources["@/lib/presentation"];
const file=name=>({name,mimeType:"application/octet-stream",buffer:Buffer.from("Synthetic extraction fixture")});
const result=()=>({name:"Imported lesson",slides:draft().slides});
const title=page=>page.getByLabel("Lesson title",{exact:true});
const button=(page,name)=>page.getByRole("button",{name,exact:true});
async function mountUpload(page){
  await mountPresentation(page);
  await page.evaluate(()=>{
    document.querySelector(".portal-heading h1").textContent="Upload a file.";
    presentationRoot.render(presentationModules("react").createElement(presentationModules("upload").UploadLessonPage));
  });
  await page.getByLabel("File",{exact:true}).waitFor();
}
async function preview(page,name="synthetic.pptx"){
  await page.getByLabel("File",{exact:true}).setInputFiles(file(name));
  await button(page,"Preview slides").click();
  await page.waitForFunction(()=>document.activeElement===document.querySelector(".presentation-document-bar input"));
  await page.waitForFunction(()=>document.querySelector(".canvas-container")&&editCanvas.getObjects().length===2);
  await page.waitForTimeout(100);
}
async function geometry(page){
  return page.evaluate(()=>{
    const r=selector=>{
      const b=document.querySelector(selector).getBoundingClientRect();
      return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom,right:b.right};
    };
    return {editor:r(".presentation-editor"),canvas:r(".canvas-container"),
      importer:r(".presentation-import-bar"),scrollY,overflow:document.documentElement.scrollWidth>innerWidth};
  });
}

test("uploaded workspace fits desktop shell; 320px importer, primary controls and canvas remain reachable",async()=>{
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block"});
  const errors=[],requests=[],artifacts=await mkdtemp(join(tmpdir(),"forge-upload-followup-"));
  try{
    await context.route("**/*",route=>{requests.push(route.request().url());return route.abort();});
    for(const [width,height,minCanvas] of [[1366,768,540],[1440,900,600],[1910,1080,600],[1920,1080,600],[320,900,260]]){
      const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));
      await page.setViewportSize({width,height});
      await page.exposeFunction("extractUpload",result);
      await mountUpload(page);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"Expanded initial importer must fit.");
      await page.getByLabel("Import the PowerPoint as slides",{exact:true}).check();
      await preview(page);
      assert.equal(await title(page).evaluate(el=>el===document.activeElement),true);
      assert.equal(await page.locator("#upload-importer").isVisible(),false);
      assert.equal(await button(page,"Change file").getAttribute("aria-expanded"),"false");
      assert.match(await page.locator(".presentation-import-bar").innerText(),/synthetic\.pptx · PowerPoint slides/);
      const measured=await geometry(page),actions={};
      assert.equal(measured.overflow,false);
      assert.ok(measured.canvas.w>=minCanvas);
      assert.ok(Math.abs(measured.canvas.w/measured.canvas.h-16/9)<.01);
      if(width>=1200){
        assert.equal(measured.scrollY,0,"Do not scroll to obtain passing bounds.");
        assert.ok(measured.editor.bottom<=height,JSON.stringify(measured));
        assert.ok(measured.canvas.y>=0&&measured.canvas.bottom<=height,JSON.stringify(measured));
        for(const name of ["Change file","Save","Save and publish","Undo","Redo","Add text","Add slide","Fullscreen preview","Export editable PPTX","Lesson settings","Quiz","Help"]){
          const control=button(page,name),bounds=await control.boundingBox();actions[name]=bounds;
          assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=height,`${width}: ${name}`);
          assert.equal(await control.evaluate(el=>{
            const r=el.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return at===el||el.contains(at);
          }),true,`${width}: ${name} covered`);
        }
      }
      // Capture the initial layout, without forcing a scroll position.
      await page.screenshot({path:join(artifacts,`upload-${width}.png`),fullPage:true});
      if(width===320){
        await title(page).fill("Retain my uploaded edits");
        await button(page,"Change file").focus();await page.keyboard.press("Enter");
        assert.equal(await page.locator("#upload-importer").isVisible(),true);
        assert.equal(await page.getByLabel("File",{exact:true}).evaluate(el=>el.files[0].name),"synthetic.pptx");
        assert.equal(await page.getByLabel("Import the PowerPoint as slides",{exact:true}).isChecked(),true);
        await page.getByLabel("File",{exact:true}).focus();
        assert.equal(await page.getByLabel("File",{exact:true}).evaluate(el=>el===document.activeElement),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.screenshot({path:join(artifacts,"importer-expanded-320.png"),fullPage:true});
        await button(page,"Close importer").focus();await page.keyboard.press("Enter");
        assert.equal(await title(page).inputValue(),"Retain my uploaded edits");
        for(const name of ["Save","Save and publish","Add text","Fullscreen preview","Export editable PPTX"]){
          const control=button(page,name);await control.focus();await control.scrollIntoViewIfNeeded();
          const bounds=await control.boundingBox();actions[name]=bounds;
          assert.ok(bounds&&bounds.x>=0&&bounds.x+bounds.width<=320);
          assert.ok(bounds.y>=0&&bounds.y+bounds.height<=900);
        }
        await page.locator(".presentation-slides > summary").focus();await page.keyboard.press("Enter");
        await button(page,"Add slide").focus();await button(page,"Add slide").scrollIntoViewIfNeeded();
        const add=await button(page,"Add slide").boundingBox();actions["Add slide"]=add;
        assert.ok(add&&add.x>=0&&add.x+add.width<=320&&add.y>=0&&add.y+add.height<=900);
        assert.equal(await button(page,"Add slide").isVisible(),true);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      console.log(`Upload follow-up ${width}x${height}: ${JSON.stringify({geometry:measured,actions})}`);
      await page.close();
    }
    console.log("Upload follow-up screenshots:",artifacts);
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  }finally{await context.close();await browser.close();}
});

test("upload disclosure retains edits/file/mode; retry, stale extraction and pending/unknown-save locks survive collapse",async()=>{
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width:1366,height:768}});
  const page=await context.newPage(),errors=[],requests=[],modes=[],saves=[];
  let extraction=result,releaseSave,saveGate=null;
  page.on("pageerror",error=>errors.push(error.message));
  try{
    await context.route("**/*",route=>{requests.push(route.request().url());return route.abort();});
    await page.exposeFunction("extractUpload",entries=>{modes.push(entries[0][1]);return extraction();});
    await page.exposeFunction("persist",async(name,entries)=>{
      saves.push({name,entries});if(saveGate)await saveGate;
      return {saveUncertain:true,error:"Save outcome is unknown. Keep this input and check Your lessons."};
    });
    await mountUpload(page);await preview(page);
    await title(page).fill("Keep unsaved work");
    const contents=await page.evaluate(()=>JSON.stringify(editCanvas.getObjects().map(o=>({text:o.text,left:o.left,top:o.top}))));
    await button(page,"Change file").focus();await page.keyboard.press("Enter");
    assert.equal(await button(page,"Close importer").getAttribute("aria-expanded"),"true");
    await button(page,"Close importer").focus();await page.keyboard.press("Enter");
    assert.equal(await title(page).inputValue(),"Keep unsaved work");
    assert.equal(await page.evaluate(()=>JSON.stringify(editCanvas.getObjects().map(o=>({text:o.text,left:o.left,top:o.top})))),contents);
    assert.equal(modes.length,1,"Opening/closing must not reimport or autosave.");assert.equal(saves.length,0);
    await button(page,"Change file").click();
    await page.getByLabel("Import the PowerPoint as slides",{exact:true}).check();
    assert.equal(await title(page).count(),0,"Mode changes still invalidate the old preview.");
    extraction=()=>({error:"Could not read that file."});
    await button(page,"Preview slides").click();await page.getByRole("alert").waitFor();
    assert.equal(await page.locator("#upload-importer").isVisible(),true);
    assert.equal(await page.getByLabel("File",{exact:true}).evaluate(el=>el.files[0].name),"synthetic.pptx");
    extraction=()=>{throw new Error("Synthetic transport failure");};
    await button(page,"Preview slides").click();
    await page.getByRole("alert").filter({hasText:"Upload failed. Try the file again."}).waitFor();
    extraction=result;
    await button(page,"Preview slides").click();
    await page.waitForFunction(()=>document.activeElement===document.querySelector(".presentation-document-bar input"));
    await button(page,"Change file").click();
    await page.getByLabel("File",{exact:true}).setInputFiles(file("changed.pptx"));
    assert.equal(await title(page).count(),0,"File changes still invalidate the old preview.");
    // Queue an older extraction, then a late input event. Disabled controls do
    // not normally emit this; epoch protection must still reject the old result.
    let releaseExtract;
    extraction=()=>new Promise(resolve=>{releaseExtract=resolve;});
    const before=modes.length;
    await page.locator("#upload-importer").evaluate(form=>{
      form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
      form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>document.querySelector('input[type="file"]').disabled);
    assert.equal(modes.length,before+1,"Same-tick preview submissions stay guarded.");
    await page.getByLabel("File",{exact:true}).evaluate(el=>el.dispatchEvent(new Event("change",{bubbles:true})));
    releaseExtract(result());
    await button(page,"Preview slides").waitFor();
    await page.waitForFunction(()=>!document.querySelector('input[type="file"]').disabled);
    assert.equal(await title(page).count(),0,"A late old result cannot resurrect a preview.");
    extraction=result;await button(page,"Preview slides").click();
    await page.waitForFunction(()=>document.activeElement===document.querySelector(".presentation-document-bar input"));
    assert.match(await page.locator(".presentation-import-bar").innerText(),/changed\.pptx · PowerPoint slides/);
    await title(page).fill("Keep uncertain uploaded lesson");
    saveGate=new Promise(resolve=>{releaseSave=resolve;});
    await button(page,"Save").click();
    await page.waitForFunction(()=>document.querySelector(".presentation-import-bar button").disabled);
    assert.equal(await button(page,"Change file").isDisabled(),true);
    assert.equal(await page.getByLabel("File",{exact:true}).isDisabled(),true);
    const reads=modes.length;
    await page.locator("#upload-importer").evaluate(form=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
    assert.equal(modes.length,reads,"A late hidden-form submit cannot bypass the save lock.");
    releaseSave();
    await page.getByRole("alert").filter({hasText:/Save outcome is unknown/}).waitFor();
    assert.equal(await button(page,"Change file").isDisabled(),true);
    assert.equal(await button(page,"Save").isDisabled(),true);
    assert.equal(await title(page).inputValue(),"Keep uncertain uploaded lesson");
    assert.equal(saves.length,1);assert.deepEqual(modes,["text","powerpoint","powerpoint","powerpoint","powerpoint","powerpoint"]);
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
  }finally{releaseSave?.();await context.close();await browser.close();}
});
