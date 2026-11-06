import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {chromium,expect} from "@playwright/test";
import {harness,presentation as model} from "./slide-authoring-harness.mjs";
import {mountPresentation} from "./presentation-browser-harness.mjs";

function draft(){
  const value=model.blankPresentation();value.title="AI author regression";
  const s=value.document.slides[0];s.title="SDLC";
  const box=model.newText("Complex SDLC ");
  box.paragraphs[0].runs.push({...model.defaultRun,text:"requirements",bold:true,font:"Courier New",size:24});
  s.elements=[box];
  const second=model.newSlide();second.title="Other slide";second.elements=[model.newText("Unrelated text")];
  value.document.slides.push(second);return value;
}
const userId="00000000-0000-4000-8000-000000000001";
function result(request,text="Simple SDLC ",style={}){
  return {binding:{requestId:request.requestId,sourceToken:request.sourceToken,userId,...(request.lessonId?{lessonId:request.lessonId,version:request.version}:{})},
    patch:{explanation:"Simplified for beginners.",changes:request.reference.map(e=>({slideId:e.slideId,textboxId:e.id,runs:[{paragraph:0,run:0,text}],...style}))}};
}
async function browserFixture(run,imageHandler=()=>({error:"Not used."})){
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],requests=[];
  page.on("pageerror",e=>errors.push(e.message));
  await context.route("**/*",route=>{requests.push(route.request().url());return route.abort();});
  await page.exposeFunction("images",imageHandler);
  try{await run(page);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);}
  finally{await context.close();await browser.close();}
}
async function select(page){
  await page.waitForFunction(()=>editCanvas.getObjects().length===1);
  await page.evaluate(()=>editCanvas.setActiveObject(editCanvas.getObjects()[0]));
  await expect(page.locator(".presentation-properties > summary")).toHaveText("Object properties (1 selected)");
}
async function open(page){
  await page.getByRole("button",{name:"AI Slide Assistant",exact:true}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function generate(page){
  await page.getByLabel("Instruction",{exact:true}).fill("Simplify this SDLC explanation for beginners.");
  await page.getByLabel("I consent",{exact:false}).check();
  await page.getByRole("button",{name:"Generate suggestions",exact:true}).click();
}
test("mounted AI review/apply exactly one undo/redo, rich styles, manual save/PGlite reopen and responsive focus",async()=>{
  const h=await harness(),calls=[],saves=[];
  try{await browserFixture(async page=>{
    await page.exposeFunction("persist",async(name,entries)=>{
      saves.push(entries);const form=new FormData();for(const [k,v]of entries)form.set(k,v);return h.actions[name]({},form);
    });
    await page.exposeFunction("presentationAi",(kind,request)=>{calls.push({kind,request});return kind==="generate"?result(request,request.scope.kind==="slides"?"Translated teaching ":undefined,request.allowFormatting?{fontSize:18,align:"center"}:{}):{};});
    await mountPresentation(page,{initial:draft()});await select(page);await open(page);
    await expect(page.getByLabel("Suggestion scope")).toHaveValue("textbox");
    assert.equal(await page.getByLabel("I consent",{exact:false}).isChecked(),false);
    assert.equal(await page.getByLabel("Allow simple").isChecked(),false);
    await generate(page);
    await expect(page.getByRole("region",{name:"AI suggestions"})).toBeFocused();
    assert.match(await page.getByRole("dialog").innerText(),/Before[\s\S]*Complex SDLC requirements[\s\S]*After[\s\S]*Simple SDLC requirements/);
    assert.equal(saves.length,0);
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].text),"Complex SDLC requirements");
    await page.evaluate(()=>{
      const History=presentationModules("@/lib/presentation").PresentationHistory,original=History.prototype.commit;
      window.aiCommits=[];History.prototype.commit=function(next,...args){
        if(JSON.stringify(next)!==JSON.stringify(this.value))aiCommits.push(structuredClone(next));
        return original.call(this,next,...args);
      };
    });
    const artifacts=await mkdtemp(join(tmpdir(),"forge-presentation-ai-"));
    await page.screenshot({path:join(artifacts,"1440-review.png"),fullPage:true});console.log("AI screenshots:",artifacts);
    await page.getByRole("button",{name:"Apply",exact:true}).evaluate(b=>{b.click();b.click();});
    await expect(page.getByRole("status")).toContainText("one undoable edit");
    await page.getByRole("button",{name:"Close",exact:true}).click();
    await expect(page.getByRole("button",{name:"AI Slide Assistant",exact:true})).toBeFocused();
    await page.waitForFunction(()=>editCanvas.getObjects()[0].text==="Simple SDLC requirements");
    assert.equal(await page.evaluate(()=>aiCommits.length),1,"Apply adds exactly one changed history commit");
    assert.equal(await page.evaluate(()=>editCanvas.viewportTransform.every(Number.isFinite)),true);
    // Fabric object attachment precedes its scheduled raster publication.
    // Verify real lower-canvas pixels, not just .text or a blank screenshot.
    await page.waitForFunction(()=>{
      const canvas=editCanvas.lowerCanvasEl,ctx=canvas.getContext("2d"),pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let dark=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<90&&pixels[i+1]<90&&pixels[i+2]<90&&pixels[i+3]>200)dark++;
      return dark>50;
    },{},{timeout:5000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.screenshot({path:join(artifacts,"1440-applied.png"),fullPage:true});
    assert.equal(saves.length,0);assert.equal(calls.filter(c=>c.kind==="authorize").length,1);
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getObjects()[0].text==="Complex SDLC requirements");
    await page.getByRole("button",{name:"Redo",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getObjects()[0].text==="Simple SDLC requirements");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    const stored=JSON.parse(new Map(saves[0]).get("content"));
    const styled=stored.document.slides[0].elements[0].paragraphs[0].runs[1];
    assert.equal(styled.bold,true);assert.equal(styled.font,"Courier New");assert.equal(styled.size,24);
    const {rows}=await h.db.query("select id,version,content from forge_lessons");
    assert.equal(rows.length,1);assert.equal(model.textOf(rows[0].content.slides[0].elements[0]),"Simple SDLC requirements");
    await page.evaluate(()=>presentationRoot.unmount());
    await mountPresentation(page,{initial:{...stored,document:{...stored.document,slides:rows[0].content.slides}},lessonId:rows[0].id,version:1});
    await select(page);
    await page.setViewportSize({width:320,height:850});await open(page);
    await page.getByLabel("Suggestion scope").selectOption("slides");
    await page.getByLabel("1. SDLC").check();
    await page.getByLabel("2. Other slide").check();
    await page.getByLabel("Instruction",{exact:true}).fill("Translate the selected teaching text into simple English.");
    await page.getByLabel("Allow simple").check();await page.getByLabel("I consent",{exact:false}).check();
    await page.getByRole("button",{name:"Generate suggestions",exact:true}).click();
    await expect(page.getByRole("region",{name:"AI suggestions"})).toBeFocused();
    const request=calls.filter(c=>c.kind==="generate").at(-1).request;
    assert.equal(request.scope.kind,"slides");assert.equal(request.reference.length,2);assert.equal(request.allowFormatting,true);assert.equal(request.lessonId,rows[0].id);
    assert.ok(request.reference[0].paragraphs[0].runs[0].size);assert.equal(request.reference[0].align,"left");
    await expect(page.getByRole("dialog")).toContainText("all runs 18px");
    await expect(page.getByRole("dialog")).toContainText("Alignment: left → center");
    const widths=await page.getByRole("dialog").evaluate(d=>({client:d.clientWidth,scroll:d.scrollWidth}));assert.ok(widths.scroll<=widths.client+1,JSON.stringify(widths));
    await page.screenshot({path:join(artifacts,"320-review.png"),fullPage:true});
    await page.getByRole("dialog").evaluate(d=>{d.scrollTop=0;});
    await page.screenshot({path:join(artifacts,"320-input.png"),fullPage:true});
    await page.getByRole("button",{name:"Apply",exact:true}).focus();await page.keyboard.press("Tab");
    await expect(page.getByRole("button",{name:"Close",exact:true})).toBeFocused();
    await page.keyboard.press("Shift+Tab");await expect(page.getByRole("button",{name:"Apply",exact:true})).toBeFocused();
    await page.keyboard.press("Escape");await expect(page.getByRole("button",{name:"AI Slide Assistant",exact:true})).toBeFocused();
  });}finally{await h.db.close();}
});
test("duplicate generation, Discard/Close/unmount epochs and stale edit denial retain draft",async()=>{
  await browserFixture(async page=>{
    let release,gate;const calls=[];
    await page.exposeFunction("persist",()=>{throw new Error("Must not save");});
    await page.exposeFunction("presentationAi",async(kind,request)=>{
      calls.push({kind,request});if(kind==="authorize")return {};
      if(gate)await gate;return result(request);
    });
    await mountPresentation(page,{initial:draft()});await select(page);await open(page);
    gate=new Promise(resolve=>{release=resolve;});
    await generate(page);
    await page.getByRole("button",{name:"Generating…",exact:true}).evaluate(b=>{b.click();b.click();});
    assert.equal(calls.length,1);
    await page.getByRole("button",{name:"Discard",exact:true}).click();
    release();gate=null;
    await expect(page.getByRole("button",{name:"Generate suggestions",exact:true})).toBeDisabled();
    await expect(page.getByRole("region",{name:"AI suggestions"})).toHaveCount(0);
    gate=new Promise(resolve=>{release=resolve;});await generate(page);
    // An edit/undo during the request lifetime changes history identity even
    // if the targeted text returns to its original value.
    await page.evaluate(()=>{
      const t=editCanvas.getObjects()[0];editCanvas.setActiveObject(t);t.enterEditing();t.text="Manually edited";t.fire("changed");editCanvas.fire("text:changed",{target:t});t.exitEditing();
    });
    release();gate=null;await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
    await page.getByRole("button",{name:"Apply",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("source changed");
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].text),"Manually edited");
    await page.getByRole("button",{name:"Undo",exact:true}).evaluate(b=>b.click());
    await page.waitForFunction(()=>editCanvas.getObjects()[0].text==="Complex SDLC requirements");
    await page.getByRole("button",{name:"Apply",exact:true}).click();
    await expect(page.getByRole("alert")).toContainText("source changed");
    await page.getByRole("button",{name:"Close",exact:true}).click();
    await open(page);gate=new Promise(resolve=>{release=resolve;});await generate(page);
    await page.getByRole("button",{name:"Close",exact:true}).click();release();gate=null;
    await open(page);await expect(page.getByRole("region",{name:"AI suggestions"})).toHaveCount(0);
    gate=new Promise(resolve=>{release=resolve;});await generate(page);
    await page.evaluate(()=>presentationRoot.unmount());release();gate=null;
    await mountPresentation(page,{initial:draft()});await open(page);
    await expect(page.getByRole("region",{name:"AI suggestions"})).toHaveCount(0);
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].text),"Complex SDLC requirements");
  });
});
  test("overflow Apply preserves deck, rich range/selection, and notice focus; no implicit save",async()=>{
    await browserFixture(async page=>{
      const value=draft(),e=value.document.slides[0].elements[0];e.y=450;e.h=70;
      let saves=0;await page.exposeFunction("persist",()=>{saves++;return {};});
      await page.exposeFunction("presentationAi",(kind,request)=>kind==="generate"?result(request,"Long educational explanation ".repeat(25)):{});
      await mountPresentation(page,{initial:value});await select(page);
      await page.evaluate(()=>{const t=editCanvas.getActiveObject();t.enterEditing();t.selectionStart=5;t.selectionEnd=7;});
      await open(page);await generate(page);await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
      const before=await page.evaluate(()=>({text:editCanvas.getActiveObject().text,start:editCanvas.getActiveObject().selectionStart,end:editCanvas.getActiveObject().selectionEnd}));
      await page.getByRole("button",{name:"Apply",exact:true}).click();
      await expect(page.getByRole("alert")).toContainText("overflows");await expect(page.getByRole("alert")).toBeFocused();
      assert.deepEqual(await page.evaluate(()=>({text:editCanvas.getActiveObject().text,start:editCanvas.getActiveObject().selectionStart,end:editCanvas.getActiveObject().selectionEnd})),before);
      assert.equal(saves,0);await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
    });
  });
  test("font draft flush preserves actual selected styles; changes reset consent/suggestions; imported/current/empty scopes",async()=>{
    await browserFixture(async page=>{
      const calls=[];await page.exposeFunction("persist",()=>({}));
      await page.exposeFunction("presentationAi",(kind,request)=>{calls.push({kind,request});return kind==="generate"?result(request):{};});
      await mountPresentation(page,{initial:draft()});await select(page);
      await page.evaluate(()=>{const t=editCanvas.getActiveObject();t.enterEditing();t.selectionStart=5;t.selectionEnd=7;editCanvas.fire("text:selection:changed",{target:t});});
      await page.getByLabel("Font size",{exact:true}).fill("36");await open(page);
      await generate(page);await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
      const reference=calls[0].request.reference[0];assert.ok(reference.paragraphs[0].runs.length>=3,"flushed character formatting retains its distinct run");
      await page.getByLabel("Allow simple").check();await expect(page.getByRole("region",{name:"AI suggestions"})).toHaveCount(0);
      assert.equal(await page.getByLabel("I consent",{exact:false}).isChecked(),false);
      await page.getByLabel("I consent",{exact:false}).check();await page.getByRole("button",{name:"Generate suggestions",exact:true}).click();
      await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
      assert.ok(calls.at(-1).request.reference[0].paragraphs[0].runs.some(r=>r.size===36));
      await page.getByLabel("Suggestion scope").selectOption("slides");
      assert.equal(await page.getByRole("button",{name:"Generate suggestions",exact:true}).isDisabled(),true);
      await expect(page.getByRole("dialog")).toContainText("0 selected");
      await page.getByRole("button",{name:"Close",exact:true}).click();await page.evaluate(()=>presentationRoot.unmount());
      const legacy={title:"Imported preview",audience:"learners",difficulty:"foundation",slides:[{title:"Imported",body:"Imported SDLC teaching text"}],quiz:[]};
      await mountPresentation(page,{initialLegacy:legacy});await open(page);
      await expect(page.getByLabel("Suggestion scope")).toHaveValue("slide");
      await generate(page);await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
      assert.equal(calls.at(-1).request.reference.length,2);assert.equal(calls.at(-1).request.lessonId,undefined);
      await page.getByRole("button",{name:"Close",exact:true}).click();await page.evaluate(()=>presentationRoot.unmount());
      const shapes=draft();shapes.document.slides[0].elements=[{id:crypto.randomUUID(),type:"shape",shape:"rect",x:0,y:0,w:30,h:30,rotation:0,fill:"#000000",stroke:"#000000",strokeWidth:0}];
      await mountPresentation(page,{initial:shapes});await open(page);
      await expect(page.getByRole("dialog")).toContainText("scope has no textbox");
      assert.equal(await page.getByRole("button",{name:"Generate suggestions",exact:true}).isDisabled(),true);
    });
  });
test("Apply rechecks save/upload/export/uncertain locks and late local Discard while authorization waits",async()=>{
  for(const lock of ["save","upload","export","uncertain","discard"]){
    let imageRelease,imageGate;
    await browserFixture(async page=>{
      let applyRelease,applyGate,saveRelease,saveGate;const calls=[];
      await page.exposeFunction("persist",async()=>{if(saveGate)await saveGate;return lock==="uncertain"?{saveUncertain:true}:{error:"Offline save denial"};});
      await page.exposeFunction("presentationAi",async(kind,request)=>{
        calls.push(kind);if(kind==="generate")return result(request);
        if(applyGate)await applyGate;return {};
      });
      await mountPresentation(page,{initial:draft()});await select(page);await open(page);
      await generate(page);await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
      applyGate=new Promise(resolve=>{applyRelease=resolve;});
      await page.getByRole("button",{name:"Apply",exact:true}).click();
      await expect(page.getByRole("button",{name:"Checking…",exact:true})).toBeDisabled();
      if(lock==="discard"){
        await page.getByRole("button",{name:"Discard",exact:true}).click();applyRelease();applyGate=null;
        await expect(page.getByRole("region",{name:"AI suggestions"})).toHaveCount(0);
      }else{
        if(lock==="upload"){
          imageGate=new Promise(resolve=>{imageRelease=resolve;});
          await page.locator(".presentation-upload input").evaluate(input=>{
            const transfer=new DataTransfer();transfer.items.add(new File(["offline"],"small.png",{type:"image/png"}));input.files=transfer.files;input.dispatchEvent(new Event("change",{bubbles:true}));
          });
        }else if(lock==="export"){
          await page.evaluate(()=>{
            presentationModules("@/lib/presentation-export").presentationPptx=()=>new Promise(resolve=>{window.releaseAiExport=()=>resolve(new Blob(["offline export fixture"]));});
          });
          await page.getByRole("button",{name:"Export editable PPTX",exact:true}).evaluate(b=>b.click());
          await page.waitForFunction(()=>Boolean(window.releaseAiExport));
        }else{
          saveGate=new Promise(resolve=>{saveRelease=resolve;});
          await page.getByRole("button",{name:"Save",exact:true}).evaluate(b=>b.click());
          await page.waitForFunction(()=>document.querySelector(".presentation-save-state").textContent.includes("Saving"));
        }
        applyRelease();applyGate=null;
        await expect(page.getByRole("alert").filter({hasText:"AI edits are locked"})).toBeVisible();
        if(lock==="upload"){imageRelease();imageGate=null;}
        else if(lock==="export"){await page.evaluate(()=>releaseAiExport());}
        else{saveRelease();saveGate=null;}
        if(lock==="uncertain"){
          await page.waitForFunction(()=>document.querySelector(".presentation-save-state").textContent.includes("Save needs checking"));
          await expect(page.getByRole("button",{name:"Apply",exact:true})).toBeDisabled();
        }else await expect(page.getByRole("button",{name:"Save",exact:true})).toBeEnabled();
      }
      assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].text),"Complex SDLC requirements");
      assert.equal(calls.filter(x=>x==="generate").length,1);assert.equal(calls.filter(x=>x==="authorize").length,1);
    },async kind=>{if(kind==="begin"){if(imageGate)await imageGate;return {error:"Offline image denial"};}return {error:"Offline image denial"};});
  }
});
test("a font draft entered while final layout validation waits is flushed and denies stale Apply",async()=>{
  await browserFixture(async page=>{
    await page.exposeFunction("persist",()=>({}));
    await page.exposeFunction("presentationAi",(kind,request)=>kind==="generate"?result(request):{});
    await mountPresentation(page,{initial:draft()});await select(page);await open(page);
    await generate(page);await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
    await page.evaluate(()=>{
      const adapter=presentationModules("@/lib/presentation-fabric"),validate=adapter.validateTextLayout;
      adapter.validateTextLayout=async doc=>{
        const next=await validate(doc);await new Promise(resolve=>{window.finishAiLayout=resolve;});return next;
      };
    });
    await page.getByRole("button",{name:"Apply",exact:true}).click();
    await page.waitForFunction(()=>Boolean(window.finishAiLayout));
    await page.getByLabel("Font size",{exact:true}).evaluate(input=>{
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"36");
      input.dispatchEvent(new Event("input",{bubbles:true}));
    });
    await expect(page.getByLabel("Font size",{exact:true})).toHaveValue("36");
    await page.evaluate(()=>finishAiLayout());
    await expect(page.getByRole("alert")).toContainText("source changed");
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].text),"Complex SDLC requirements");
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].fontSize),36);
  });
});
test("AI editor survives a transient zero-sized host with finite viewport and real rendered text",async()=>{
  await browserFixture(async page=>{
    await page.exposeFunction("persist",()=>({}));
    await page.exposeFunction("presentationAi",(kind,request)=>kind==="generate"?result(request):{});
    await mountPresentation(page,{initial:draft()});await select(page);
    await page.locator(".presentation-surface.presentation-editable").evaluate(host=>{host.style.width="0px";host.style.height="0px";});
    await page.waitForFunction(()=>document.querySelector(".presentation-surface.presentation-editable").clientWidth===0);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.locator(".presentation-surface.presentation-editable").evaluate(host=>{host.style.removeProperty("width");host.style.removeProperty("height");});
    await page.waitForFunction(()=>editCanvas.width>100&&editCanvas.viewportTransform.every(Number.isFinite));
    await open(page);await generate(page);await expect(page.getByRole("region",{name:"AI suggestions"})).toBeVisible();
    await page.getByRole("button",{name:"Apply",exact:true}).click();
    await expect(page.getByRole("status")).toContainText("one undoable edit");await page.getByRole("button",{name:"Close",exact:true}).click();
    await page.waitForFunction(()=>{
      const c=editCanvas.lowerCanvasEl,p=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let dark=0;for(let i=0;i<p.length;i+=4)if(p[i]<90&&p[i+1]<90&&p[i+2]<90&&p[i+3]>200)dark++;
      return dark>50&&editCanvas.getObjects()[0].text==="Simple SDLC requirements"&&editCanvas.viewportTransform.every(Number.isFinite);
    });
  });
});
