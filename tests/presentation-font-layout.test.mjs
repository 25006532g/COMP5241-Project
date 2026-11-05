import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {chromium} from "@playwright/test";
import JSZip from "jszip";
import {harness,presentation as model} from "./slide-authoring-harness.mjs";
import {mountPresentation} from "./presentation-browser-harness.mjs";

function draft(text="Editable 中文 text",patch={}){
  const value=model.blankPresentation();value.title="Font layout regression";
  value.document.slides[0].title="Slide 1";
  const element={...model.newText(text),...patch};
  element.paragraphs[0].runs[0].size=24;
  value.document.slides[0].elements=[element];
  return value;
}
async function fixture(run){
  const browser=await chromium.launch();
  const context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],requests=[];
  page.on("pageerror",e=>errors.push(e.message));
  await context.route("**/*",route=>{requests.push(route.request().url());return route.abort();});
  await page.exposeFunction("images",()=>({error:"Not used."}));
  try{await run(page);assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);}
  finally{await context.close();await browser.close();}
}
async function select(page){
  await page.waitForFunction(()=>editCanvas.getObjects().length===1);
  await page.evaluate(()=>editCanvas.setActiveObject(editCanvas.getObjects()[0]));
  await page.getByLabel("Font size",{exact:true}).waitFor();
}
async function applySize(page,value){
  const input=page.getByLabel("Font size",{exact:true});
  await input.focus();await input.press("ControlOrMeta+A");await input.press("Backspace");
  await input.pressSequentially(String(value));
  assert.equal(await input.inputValue(),String(value),"intermediate digits must not snap back");
  await input.press("Enter");
}
async function openMobileProperties(page){
  // CSS/viewport resizing can precede matchMedia's panel-closing callback.
  // Wait for that observable transition before reopening, or it can steal
  // native focus between focus() and typing into the still-mounted input.
  await page.waitForFunction(()=>document.querySelector(".presentation-properties")?.open===false);
  if(!await page.locator(".presentation-properties").evaluate(el=>el.open))await page.locator(".presentation-properties > summary").click();
}

test("font field accepts real sequential typing and saves/reloads actual Fabric sizes",async()=>{
  const h=await harness(),payloads=[];
  try{await fixture(async page=>{
    await page.exposeFunction("persist",async(name,entries)=>{
      payloads.push(entries);const form=new FormData();for(const [k,v]of entries)form.set(k,v);
      return h.actions[name]({},form);
    });
    await mountPresentation(page,{initial:draft()});await select(page);
    const artifacts=await mkdtemp(join(tmpdir(),"forge-font-layout-"));
    await page.screenshot({path:join(artifacts,"before.png"),fullPage:true});
    console.log("Font screenshots:",artifacts);
    await applySize(page,48);
    await page.waitForFunction(()=>editCanvas.getActiveObject().fontSize===48);
    await applySize(page,12);
    await page.waitForFunction(()=>editCanvas.getActiveObject().fontSize===12);
    const input=page.getByLabel("Font size",{exact:true});
    await input.press("ArrowUp");await input.press("Tab");
    await page.waitForFunction(()=>editCanvas.getActiveObject().fontSize===13);
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    assert.match(await page.locator(".presentation-save-state").innerText(),/All changes saved/);
    const stored=JSON.parse(new Map(payloads.at(-1)).get("content"));
    assert.equal(stored.document.slides[0].elements[0].paragraphs[0].runs[0].size,13);
    const {rows}=await h.db.query("select content from forge_lessons");
    assert.equal(rows[0].content.slides[0].elements[0].paragraphs[0].runs[0].size,13);
    const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Export editable PPTX",exact:true}).click()]);
    const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
    const zip=await JSZip.loadAsync(Buffer.concat(chunks));
    const xml=await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml,/sz="1300"/);assert.match(xml,/Editable 中文 text/);
    assert.match(xml,new RegExp(`<a:ext cx="${700*12700}" cy="${150*12700}"`));
    assert.match(await page.locator(".presentation-save-state").innerText(),/All changes saved/);
    assert.equal(await input.inputValue(),"13");
    await page.screenshot({path:join(artifacts,"after.png"),fullPage:true});
    await mountPresentation(page,{initial:{...stored,document:{...stored.document,slides:rows[0].content.slides}}});await select(page);
    assert.equal(await input.inputValue(),"13");
    assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().fontSize),13);
  });}finally{await h.db.close();}
});

test("legacy stale height renders all wrapped text and grows canonical height before save",async()=>{
  await fixture(async page=>{
    const payloads=[];
    await page.exposeFunction("persist",async(name,entries)=>{payloads.push(entries);return {lessonId:crypto.randomUUID(),version:1,success:"Saved."};});
    await mountPresentation(page,{initial:draft("Wrapped 中文 text ".repeat(9),{w:210,h:1})});
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(()=>editCanvas.getObjects().length),1,"stale height must not refuse the whole render");
    await select(page);
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    const element=JSON.parse(new Map(payloads[0]).get("content")).document.slides[0].elements[0];
    const required=await page.evaluate(()=>editCanvas.getObjects()[0].height);
    assert.ok(element.h>=required&&element.h<470,`${element.h} must contain actual ${required}`);
    assert.equal(model.textOf(element),"Wrapped 中文 text ".repeat(9));
  });
});

test("noninitial character range reports mixed styles, retains CJK/newlines, and undoes font with height",async()=>{
  await fixture(async page=>{
    const writes=[],initial=draft();
    const e=initial.document.slides[0].elements[0];e.w=280;e.h=1;
    e.paragraphs=[
      {runs:[{...model.defaultRun,text:"Lead ",size:24},{...model.defaultRun,text:"中文",size:18,font:"Courier New",bold:true},
        {...model.defaultRun,text:" tail",size:24,font:"Times New Roman",italic:true}]},
      {runs:[{...model.defaultRun,text:"",size:20,font:"Courier New"}]},
      {runs:[{...model.defaultRun,text:"Next",size:16,underline:true}]},
    ];
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:writes.length,success:"Saved."};});
    await mountPresentation(page,{initial});await select(page);
    const input=page.getByLabel("Font size",{exact:true});
    assert.equal(await input.inputValue(),"","whole mixed textbox must not show the first character size");
    assert.equal(await input.getAttribute("placeholder"),"Mixed");
    await page.getByText("Position & size",{exact:true}).click();
    const before=Number(await page.getByLabel("Height",{exact:true}).inputValue());
    await page.evaluate(()=>{
      const t=editCanvas.getActiveObject();t.enterEditing();t.selectionStart=5;t.selectionEnd=7;
      editCanvas.fire("text:selection:changed",{target:t});
    });
    await page.waitForFunction(()=>document.querySelector('input[placeholder="Mixed"]')===null);
    assert.equal(await input.inputValue(),"18");
    await applySize(page,48);
    assert.equal(await input.evaluate(el=>document.activeElement===el),true);
    const actual=await page.evaluate(()=>{
      const t=editCanvas.getActiveObject();
      return {text:presentationModules("@/lib/presentation-fabric").readText(t,{}),height:t.height};
    });
    assert.equal(actual.text.paragraphs[0].runs[0].size,24);
    assert.equal(actual.text.paragraphs[0].runs[1].size,48);
    assert.equal(actual.text.paragraphs[0].runs[1].font,"Courier New");
    assert.equal(actual.text.paragraphs[0].runs[1].bold,true);
    assert.equal(actual.text.paragraphs[0].runs[2].font,"Times New Roman");
    assert.equal(actual.text.paragraphs[0].runs[2].italic,true);
    assert.equal(actual.text.paragraphs[1].runs[0].size,20);
    assert.equal(actual.text.paragraphs[2].runs[0].underline,true);
    assert.equal(model.textOf(actual.text),"Lead 中文 tail\n\nNext");
    const grown=Number(await page.getByLabel("Height",{exact:true}).inputValue());
    assert.ok(grown>before&&grown>=actual.height);
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await select(page);
    assert.equal(Number(await page.getByLabel("Height",{exact:true}).inputValue()),before);
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].styles[0][5].fontSize),18);
    await page.getByRole("button",{name:"Redo",exact:true}).click();await select(page);
    assert.equal(Number(await page.getByLabel("Height",{exact:true}).inputValue()),grown);
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].styles[0][5].fontSize),48);
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    const stored=JSON.parse(new Map(writes[0]).get("content")).document.slides[0].elements[0];
    assert.equal(stored.h,grown);
    assert.deepEqual(stored.paragraphs,actual.text.paragraphs);
    const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Export editable PPTX",exact:true}).click()]);
    const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
    const zip=await JSZip.loadAsync(Buffer.concat(chunks));
    const xml=await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml,/<a:rPr[^>]*sz="4800"[^>]*b="1"/);
    assert.match(xml,/<a:t>中文<\/a:t>/);assert.match(xml,/typeface="Courier New"/);
    assert.match(xml,/<a:rPr[^>]*sz="2400"/);assert.match(xml,/typeface="Times New Roman"/);
    assert.match(xml,new RegExp(`<a:ext cx="${Math.round(stored.w*12700)}" cy="${Math.round(stored.h*12700)}"`));
    assert.equal((xml.match(/<a:p>/g)??[]).length,3,"original empty paragraph must remain an editable paragraph");
  });
});

test("invalid size drafts and actual bottom overflow retain input; width/text/height edits recover",async()=>{
  await fixture(async page=>{
    const writes=[],initial=draft("Fits first line",{y:450,w:280,h:30});
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:writes.length,success:"Saved."};});
    await mountPresentation(page,{initial});await select(page);
    const artifacts=await mkdtemp(join(tmpdir(),"forge-font-errors-"));
    const input=page.getByLabel("Font size",{exact:true});
    for(const invalid of ["","7","121"]){
      await input.fill(invalid);await input.press("Enter");
      await page.getByRole("alert").filter({hasText:"8 to 120"}).waitFor();
      assert.equal(await input.inputValue(),invalid);
      assert.equal(await input.evaluate(el=>document.activeElement===el),true);
      assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().fontSize),24);
      if(invalid==="121")await page.screenshot({path:join(artifacts,"invalid-size.png"),fullPage:true});
      await page.getByRole("button",{name:"Save",exact:true}).click();
      assert.equal(writes.length,0);
    }
    await applySize(page,120);
    await page.getByRole("alert").filter({hasText:"outside the slide"}).waitFor();
    assert.equal(await input.inputValue(),"120");
    assert.equal(await input.evaluate(el=>document.activeElement===el),true);
    assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().fontSize),120);
    await page.screenshot({path:join(artifacts,"overflow.png"),fullPage:true});
    console.log("Overflow screenshot:",artifacts);
    await page.getByRole("button",{name:"Save",exact:true}).click();
    assert.equal(writes.length,0);
    await page.getByRole("button",{name:"Export editable PPTX",exact:true}).click();
    await page.getByRole("alert").filter({hasText:"outside the slide"}).waitFor();
    assert.equal(writes.length,0);
    await page.getByRole("button",{name:"Fullscreen preview",exact:true}).click();
    assert.equal(await page.getByRole("dialog").count(),0);
    assert.equal(await page.evaluate(()=>editCanvas.getObjects()[0].text),"Fits first line");
    await applySize(page,24);
    await page.getByText("Position & size",{exact:true}).click();
    await page.getByLabel("Y position",{exact:true}).fill("70");
    await page.getByLabel("Height",{exact:true}).fill("250");
    await page.getByLabel("X position",{exact:true}).fill("61");
    assert.equal(await page.getByLabel("Height",{exact:true}).inputValue(),"250","move must preserve deliberately larger height");
    await page.locator(".presentation-text-content > summary").click();
    await page.getByRole("textbox",{name:/^Textbox content/}).fill("Wrapped 中文 text ".repeat(9));
    await page.getByLabel("Width",{exact:true}).fill("210");
    const required=await page.evaluate(()=>editCanvas.getObjects()[0].height);
    const height=Number(await page.getByLabel("Height",{exact:true}).inputValue());
    assert.ok(height>=required);
    await page.getByLabel("Height",{exact:true}).fill("1");
    assert.ok(Number(await page.getByLabel("Height",{exact:true}).inputValue())>=required,"explicit height cannot clip text");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    assert.equal(model.textOf(JSON.parse(new Map(writes[0]).get("content")).document.slides[0].elements[0]),"Wrapped 中文 text ".repeat(9));
    await page.getByRole("textbox",{name:/^Textbox content/}).fill("");
    await page.getByRole("combobox",{name:/^Font/}).selectOption("Courier New");
    await applySize(page,42);
    assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().text),"");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 2"}).waitFor();
    const empty=JSON.parse(new Map(writes[1]).get("content")).document.slides[0].elements[0];
    assert.equal(empty.paragraphs[0].runs[0].size,42);
    assert.equal(empty.paragraphs[0].runs[0].font,"Courier New");
    assert.equal(model.textOf(empty),"");
    const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Export editable PPTX",exact:true}).click()]);
    const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
    const zip=await JSZip.loadAsync(Buffer.concat(chunks));
    const xml=await zip.file("ppt/slides/slide1.xml").async("string");
    // PptxGenJS emits endParaRPr size, not an actual run, for empty text.
    // Do not insert invisible content just to force a native font-family run.
    assert.match(xml,/sz="4200"/);assert.doesNotMatch(xml,/<a:t>/);
  });
});

test("Fabric canonical-width roundtrips, fractional resize, empty styles and rotated bounds",async()=>{
  await fixture(async page=>{
    await page.exposeFunction("persist",()=>({error:"Not used."}));
    await mountPresentation(page);
    const result=await page.evaluate(async()=>{
      const model=presentationModules("@/lib/presentation"),adapter=presentationModules("@/lib/presentation-fabric");
      const slide=model.newSlide(),e={...model.newText("Threshold 中文 wrapping words ".repeat(3)),x:90.125,y:65.335,w:239.995,h:1};
      e.paragraphs[0].runs[0].size=24;slide.elements=[e];
      await adapter.drawSlide(editCanvas,slide,()=>{throw new Error("No images");});
      const t=editCanvas.getObjects()[0];t.set({scaleX:1.12345,scaleY:1.12345});
      const captured=adapter.captureSlide(editCanvas,slide);
      const normalized=await adapter.validateTextLayout({...model.blankPresentation().document,slides:[captured]});
      const stored=normalized.slides[0].elements[0];
      const rebuilt=await adapter.makeObject(stored,()=>{throw new Error("No images");});
      const height=rebuilt.height,text=rebuilt.text,lines=rebuilt._textLines.length;rebuilt.dispose();
      const again=adapter.captureSlide(editCanvas,normalized.slides[0]).elements[0];
      const empty=model.newText("");Object.assign(empty.paragraphs[0].runs[0],{size:42,font:"Courier New",bold:true});
      const emptyObject=await adapter.makeObject(empty,()=>{throw new Error("No images");});
      const emptyRead=adapter.readText(emptyObject,empty);emptyObject.dispose();
      const rotated={...model.newText("Rotated"),x:20,y:10,w:400,h:1,rotation:80};
      rotated.paragraphs[0].runs[0].size=80;
      let rotationError="";
      try{await adapter.validateTextLayout({...model.blankPresentation().document,slides:[{...model.newSlide(),elements:[rotated]}]});}
      catch(error){rotationError=error.message;}
      const widths=[];
      for(const width of [239.99,240,240.01,268.53]){
        const el=adapter.fitTextElement({...e,w:width});
        const object=await adapter.makeObject(el,()=>{throw new Error("No images");});
        widths.push({h:el.h,required:object.height,lines:object._textLines.length});object.dispose();
      }
      const threshold={...e,w:800,paragraphs:model.paragraphs("WW中文WW",{...model.defaultRun,size:24})};
      const wide=await adapter.makeObject(threshold,()=>{throw new Error("No images");});
      const boundary=wide.getLineWidth(0);wide.dispose();
      const thresholdLines=[];
      for(const width of [boundary-.01,boundary+.01]){
        const el=adapter.fitTextElement({...threshold,w:width});
        const object=await adapter.makeObject(el,()=>{throw new Error("No images");});
        thresholdLines.push(object.textLines.length);widths.push({h:el.h,required:object.calcTextHeight()});object.dispose();
      }
      const blob=await presentationModules("@/lib/presentation-export").presentationPptx(normalized,async()=>{throw new Error("No images");});
      return {stored,again,height,text,lines,emptyRead,rotationError,widths,thresholdLines,data:Array.from(new Uint8Array(await blob.arrayBuffer()))};
    });
    assert.ok(result.stored.h>=result.height);
    assert.deepEqual(result.again,result.stored,"second capture must not accumulate height/font/rounding drift");
    assert.equal(result.text,"Threshold 中文 wrapping words ".repeat(3));
    assert.ok(result.lines>1);
    assert.equal(result.emptyRead.paragraphs[0].runs[0].size,42);
    assert.equal(result.emptyRead.paragraphs[0].runs[0].font,"Courier New");
    assert.equal(result.emptyRead.paragraphs[0].runs[0].bold,true);
    assert.match(result.rotationError,/outside the slide/);
    assert.ok(result.widths.every(w=>w.h>=w.required));
    assert.deepEqual(result.thresholdLines,[2,1]);
    const zip=await JSZip.loadAsync(Uint8Array.from(result.data));
    const xml=await zip.file("ppt/slides/slide1.xml").async("string");
    assert.equal((xml.match(/<a:br\/>/g)??[]).length,result.lines-1,"native soft breaks must preserve Fabric's grapheme wrap");
    assert.match(xml,/<a:bodyPr[^>]*wrap="none"/);
    assert.match(xml,/<a:spcPct val="116000"/);
  });
});

test("mounted fractional drag resize bakes font scale once and saves fitting geometry without drift",async()=>{
  await fixture(async page=>{
    const writes=[];
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:writes.length,success:"Saved."};});
    await mountPresentation(page,{initial:draft("Wrapped 中文 text and words",{w:260.995,h:100})});await select(page);
    await page.getByText("Position & size",{exact:true}).click();
    await page.evaluate(()=>{
      const t=editCanvas.getActiveObject();t.set({left:61.125,top:71.336,scaleX:1.12345,scaleY:1.12345});
      t.setCoords();editCanvas.fire("object:modified",{target:t});
    });
    const resized={
      width:Number(await page.getByLabel("Width",{exact:true}).inputValue()),
      height:Number(await page.getByLabel("Height",{exact:true}).inputValue()),
      size:Number(await page.getByLabel("Font size",{exact:true}).inputValue()),
    };
    assert.equal(resized.size,24*1.12345);
    assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().scaleY),1);
    await applySize(page,48);
    assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().fontSize),48,"font after resize must not be scaled again");
    const grown=Number(await page.getByLabel("Height",{exact:true}).inputValue());
    await page.getByRole("button",{name:"Undo",exact:true}).click();await select(page);
    assert.equal(Number(await page.getByLabel("Height",{exact:true}).inputValue()),resized.height);
    assert.equal(Number(await page.getByLabel("Font size",{exact:true}).inputValue()),resized.size);
    await page.getByRole("button",{name:"Redo",exact:true}).click();await select(page);
    assert.equal(Number(await page.getByLabel("Height",{exact:true}).inputValue()),grown);
    for(let version=1;version<=2;version++){
      await page.getByRole("button",{name:"Save",exact:true}).click();
      await page.getByRole("status").filter({hasText:`Version ${version}`}).waitFor();
    }
    const first=JSON.parse(new Map(writes[0]).get("content")),second=JSON.parse(new Map(writes[1]).get("content"));
    assert.deepEqual(second,first);
    const stored=second.document.slides[0].elements[0];
    assert.equal(stored.w,resized.width);assert.equal(stored.h,grown);
    assert.equal(stored.x,61.13);assert.equal(stored.y,71.34);
    assert.equal(stored.paragraphs[0].runs[0].size,48);
    assert.ok(stored.h>=await page.evaluate(()=>editCanvas.getObjects()[0].calcTextHeight()));
  });
});

test("QA: fitting stale height survives real save, PGlite reopen and native rotated geometry",async()=>{
  const h=await harness(),payloads=[];
  try{await fixture(async page=>{
    await page.exposeFunction("persist",async(name,entries)=>{
      payloads.push(entries);const form=new FormData();for(const [k,v]of entries)form.set(k,v);
      return h.actions[name]({},form);
    });
    const text="Wrapped 中文 text ".repeat(4);
    await mountPresentation(page,{initial:draft(text,{x:80,y:70,w:210,h:1,rotation:7})});await select(page);
    const read=()=>page.evaluate(()=>{
      const t=editCanvas.getActiveObject();
      return {text:t.text,w:t.width,h:t.height,required:t.calcTextHeight(),x:t.left,y:t.top,rotation:t.angle,font:t.fontSize};
    });
    const before=await read();
    assert.equal(before.text,text);assert.equal(before.font,24);
    assert.ok(before.h>=before.required&&before.h>1);
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    const saved=JSON.parse(new Map(payloads[0]).get("content")),e=saved.document.slides[0].elements[0];
    assert.deepEqual([e.x,e.y,e.w,e.rotation],[80,70,210,7]);
    assert.ok(e.h>=before.required&&e.h<before.required+.01);
    const {rows}=await h.db.query("select id,content from forge_lessons");
    assert.equal(rows.length,1);assert.deepEqual(rows[0].content.slides,saved.document.slides);
    await mountPresentation(page,{initial:{...saved,document:{...saved.document,slides:rows[0].content.slides}}});await select(page);
    assert.deepEqual(await read(),before,"reopened Fabric geometry/content must equal the fitted pre-save object");
    const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Export editable PPTX",exact:true}).click()]);
    const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
    const zip=await JSZip.loadAsync(Buffer.concat(chunks));
    const xml=await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml,/sz="2400"/);assert.match(xml,/rot="420000"/);
    assert.match(xml,new RegExp(`<a:ext cx="${Math.round(e.w*12700)}" cy="${Math.round(e.h*12700)}"`));
    const offset=xml.match(/<a:xfrm[^>]*rot="420000"[^>]*>\s*<a:off x="(-?\d+)" y="(-?\d+)"/);
    assert.ok(offset,"native rotated text transform required");
    const angle=e.rotation*Math.PI/180;
    assert.ok(Math.abs(Number(offset[1])-(e.x+Math.cos(angle)*e.w/2-Math.sin(angle)*e.h/2-e.w/2)*12700)<=1);
    assert.ok(Math.abs(Number(offset[2])-(e.y+Math.sin(angle)*e.w/2+Math.cos(angle)*e.h/2-e.h/2)*12700)<=1);
    const nativeText=[...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)].map(m=>m[1]).join("");
    assert.equal(nativeText,text,"editable native runs must preserve all stale-height text");
    assert.doesNotMatch(xml,/<p:pic>/);
    const writes=h.state.writes.length;
    h.state.user={id:h.other,app_metadata:{}};
    const form=new FormData();for(const [k,v]of payloads[0])form.set(k,v);
    form.set("lessonId",rows[0].id);form.set("version","1");
    const denied=await h.actions.updateLesson({},form);
    assert.equal(denied.error,"You cannot edit this lesson.");
    assert.equal(h.state.writes.length,writes);
    assert.deepEqual((await h.db.query("select content from forge_lessons")).rows[0].content,rows[0].content);
    console.log("QA stale-height agreement:",JSON.stringify({font:before.font,width:e.w,height:e.h,required:before.required,rotation:e.rotation,textLength:text.length,foreignOwnerDenied:true}));
  });}finally{await h.db.close();}
});

test("QA: noninitial overflow selection survives denied actions, width/move recover, typed size 8 blurs",async()=>{
  await fixture(async page=>{
    const writes=[],denials=[],artifacts=await mkdtemp(join(tmpdir(),"forge-font-qa-"));let downloads=0;
    page.on("download",()=>downloads++);
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:writes.length,success:"Saved."};});
    await mountPresentation(page,{initial:draft("Lead 中文 tail",{y:370,w:150,h:1})});await select(page);
    const chooseRange=()=>page.evaluate(()=>{
      const t=editCanvas.getActiveObject();t.enterEditing();t.selectionStart=5;t.selectionEnd=7;
      editCanvas.fire("text:selection:changed",{target:t});
    });
    const selection=()=>page.evaluate(()=>{
      const t=editCanvas.getActiveObject();
      return {start:t.selectionStart,end:t.selectionEnd,editing:t.isEditing,text:t.text,sizes:t.getSelectionStyles(5,7,true).map(s=>s.fontSize)};
    });
    await chooseRange();await applySize(page,120);
    await page.getByRole("alert").filter({hasText:"outside the slide"}).waitFor();
    const overflow=await selection();
    assert.deepEqual(overflow,{start:5,end:7,editing:true,text:"Lead 中文 tail",sizes:[120,120]});
    for(const name of ["Save","Export editable PPTX","Fullscreen preview"]){
      await chooseRange();
      await page.getByRole("button",{name,exact:true}).click();
      await page.getByRole("alert").filter({hasText:"outside the slide"}).waitFor();
      const after=await selection();denials.push({action:name,selection:after});
      assert.equal(after.text,overflow.text);assert.deepEqual(after.sizes,overflow.sizes);
    }
    console.log("QA denied-action selection:",JSON.stringify(denials));
    await page.screenshot({path:join(artifacts,"denied-range.png"),fullPage:true});
    assert.equal(writes.length,0);assert.equal(downloads,0);assert.equal(await page.getByRole("dialog").count(),0);
    await page.getByText("Position & size",{exact:true}).click();
    await page.getByLabel("Width",{exact:true}).fill("800");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    const wide=JSON.parse(new Map(writes[0]).get("content")).document.slides[0].elements[0];
    assert.equal(wide.w,800);assert.equal(wide.y,370);assert.equal(model.textOf(wide),"Lead 中文 tail");
    assert.equal(wide.paragraphs[0].runs[1].size,120);
    await page.getByLabel("Width",{exact:true}).fill("150");
    await page.getByRole("alert").filter({hasText:"outside the slide"}).waitFor();
    await page.getByLabel("Y position",{exact:true}).fill("70");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 2"}).waitFor();
    const moved=JSON.parse(new Map(writes[1]).get("content")).document.slides[0].elements[0];
    assert.equal(moved.y,70);assert.equal(moved.w,150);
    assert.deepEqual(moved.paragraphs,wide.paragraphs,"the second save must preserve the recovered character styles");
    await page.setViewportSize({width:320,height:900});
    await openMobileProperties(page);
    await chooseRange();
    const input=page.getByLabel("Font size",{exact:true});
    await input.focus();assert.equal(await input.evaluate(el=>document.activeElement===el),true);
    await input.press("ControlOrMeta+A");await input.press("Backspace");await input.pressSequentially("8");
    assert.equal(await input.inputValue(),"8","mobile typing must reach the native font input");
    assert.deepEqual((await selection()).sizes,[120,120],"typing alone must retain the confirmed canonical size");
    await input.press("Tab");
    assert.deepEqual((await selection()).sizes,[8,8],"blur alone must confirm the inclusive minimum");
    await input.hover();
    const box=await input.boundingBox();assert.ok(box);
    const padding=await input.evaluate(el=>parseFloat(getComputedStyle(el).paddingRight));
    await page.mouse.click(box.x+box.width-padding-7,box.y+box.height/2-5);
    assert.equal(await input.inputValue(),"9","native spinner increment must change the draft");
    await input.press("Tab");assert.deepEqual((await selection()).sizes,[9,9]);
    await input.focus();await input.press("ArrowDown");await input.press("Tab");
    assert.deepEqual((await selection()).sizes,[8,8]);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    await input.scrollIntoViewIfNeeded();await page.screenshot({path:join(artifacts,"recovered-mobile-size8.png")});
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 3"}).waitFor();
    const small=JSON.parse(new Map(writes[2]).get("content")).document.slides[0].elements[0];
    assert.equal(small.h,moved.h,"font shrinking must keep reserved height");
    assert.deepEqual([small.w,small.rotation],[moved.w,moved.rotation]);
    assert.equal(small.paragraphs[0].runs[0].size,24);assert.equal(small.paragraphs[0].runs[1].size,8);assert.equal(small.paragraphs[0].runs[2].size,24);
    assert.equal(await input.getAttribute("min"),"8");assert.equal(await input.getAttribute("max"),"120");
    console.log("QA overflow recovery:",JSON.stringify({range:[5,7],size:120,widthRecovery:wide.w,moveRecovery:moved.y,blurMinimum:8,pointerSpinner:9,reservedHeight:small.h}));
    console.log("QA range screenshots:",artifacts);
    // Keep this exact assertion failing for the coordinator; recovery assertions
    // above still run so the retained selection defect cannot mask their result.
    assert.deepEqual(denials,denials.map(({action})=>({action,selection:overflow})),"denied actions must not discard the noninitial text selection");
  });
});

test("mobile properties waits for the responsive callback before font focus and real Tab confirmation",async()=>{
  await fixture(async page=>{
    // Hold the real matchMedia notification, not focus/input/blur or React.
    // setViewportSize can return while this notification is still pending.
    await page.addInitScript(()=>{
      const matchMedia=window.matchMedia.bind(window);
      window.matchMedia=query=>{
        const media=matchMedia(query);
        if(query!=="(min-width: 1200px)")return media;
        const add=media.addEventListener.bind(media);
        media.addEventListener=(type,listener,...options)=>add(type,event=>{
          const deliver=()=>typeof listener==="function"?listener.call(media,event):listener.handleEvent(event);
          if(event.matches)deliver();
          else window.deliverResponsive=()=>{delete window.deliverResponsive;deliver();};
        },...options);
        return media;
      };
    });
    const initial=draft("Lead 中文 tail",{y:70,w:150,h:1});
    initial.document.slides[0].elements[0].paragraphs=[{runs:[
      {...model.defaultRun,text:"Lead ",size:24},
      {...model.defaultRun,text:"中文",size:120},
      {...model.defaultRun,text:" tail",size:24},
    ]}];
    await mountPresentation(page,{initial});await select(page);
    await page.setViewportSize({width:320,height:900});
    await page.waitForFunction(()=>typeof window.deliverResponsive==="function");
    let ready=false;
    const opening=openMobileProperties(page).then(()=>{ready=true;});
    try{
      // This ordered browser round trip follows the helper's first read.
      // No timer/retry: the callback is explicitly still withheld.
      assert.equal(await page.locator(".presentation-properties").evaluate(el=>el.open),true);
      assert.equal(ready,false,"an old desktop-open panel is not mobile readiness");
      await page.evaluate(()=>window.deliverResponsive());
      await opening;
      assert.equal(await page.locator(".presentation-properties").evaluate(el=>el.open),true);
      await page.evaluate(()=>{
        const t=editCanvas.getActiveObject();t.enterEditing();t.selectionStart=5;t.selectionEnd=7;
        editCanvas.fire("text:selection:changed",{target:t});
      });
      const input=page.getByLabel("Font size",{exact:true});
      await input.focus();assert.equal(await input.evaluate(el=>document.activeElement===el),true);
      await input.press("ControlOrMeta+A");await input.press("Backspace");await input.pressSequentially("8");
      assert.equal(await input.inputValue(),"8");
      const sizes=()=>page.evaluate(()=>editCanvas.getActiveObject().getSelectionStyles(5,7,true).map(s=>s.fontSize));
      assert.deepEqual(await sizes(),[120,120],"typing alone must retain the confirmed canonical size");
      await input.press("Tab");
      assert.deepEqual(await sizes(),[8,8],"blur alone must confirm the inclusive minimum");
      const text=await page.evaluate(()=>presentationModules("@/lib/presentation-fabric").readText(editCanvas.getActiveObject(),{}));
      assert.deepEqual(text.paragraphs[0].runs.map(r=>[r.text,r.size]),[["Lead ",24],["中文",8],[" tail",24]]);
    }finally{
      await page.evaluate(()=>window.deliverResponsive?.());
      await opening;
    }
  });
});

for(const action of ["Tab","Save"])test(`untouched focused font draft cannot overwrite a newly published range on ${action}`,async()=>{
  await fixture(async page=>{
    const writes=[];
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:writes.length,success:"Saved."};});
    const initial=draft("Lead 中文 tail");
    initial.document.slides[0].elements[0].paragraphs=[{runs:[
      {...model.defaultRun,text:"Lead ",size:24},
      {...model.defaultRun,text:"中文",size:120,font:"Courier New"},
      {...model.defaultRun,text:" tail",size:24},
    ]}];
    await mountPresentation(page,{initial});await select(page);
    await page.evaluate(()=>{
      const t=editCanvas.getActiveObject();t.enterEditing();t.selectionStart=0;t.selectionEnd=4;
      editCanvas.fire("text:selection:changed",{target:t});
    });
    const input=page.getByLabel("Font size",{exact:true});
    await page.waitForFunction(()=>document.querySelector('input[min="8"]')?.value==="24");
    await input.focus();
    // Fabric is already editing: publishing another range does not focus its
    // textarea. Exercise the selection-before-field-blur ordering directly,
    // without a timing delay, replacing any data or bypassing field events.
    await page.evaluate(()=>{
      const t=editCanvas.getActiveObject();t.selectionStart=5;t.selectionEnd=7;
      editCanvas.fire("text:selection:changed",{target:t});
    });
    const publishedFont=font=>page.waitForFunction(font=>Array.from(document.querySelectorAll("label")).find(el=>el.firstChild?.textContent==="Font")?.querySelector("select")?.value===font,font);
    await publishedFont("Courier New");
    assert.equal(await input.evaluate(el=>document.activeElement===el),true);
    const sizes=()=>page.evaluate(()=>editCanvas.getActiveObject().getSelectionStyles(5,7,true).map(s=>s.fontSize));
    assert.deepEqual(await sizes(),[120,120]);
    if(action==="Tab")await input.press("Tab");
    else{
      await page.getByRole("button",{name:"Save",exact:true}).click();
      await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    }
    assert.deepEqual(await sizes(),[120,120],`${action} must not apply an untouched stale 24-point draft to the 120-point range`);
    if(action==="Save"){
      const saved=JSON.parse(new Map(writes.at(-1)).get("content")).document.slides[0].elements[0];
      assert.deepEqual(saved.paragraphs,initial.document.slides[0].elements[0].paragraphs);
    }else{
      // Pristine synchronization must not become a snap-back for real typing,
      // even if selection styles publish again before the draft is confirmed.
      await input.focus();await input.press("ControlOrMeta+A");await input.press("Backspace");await input.pressSequentially("8");
      for(const [start,end,font] of [[0,4,"Arial"],[5,7,"Courier New"]]){
        await page.evaluate(({start,end})=>{
          const t=editCanvas.getActiveObject();t.selectionStart=start;t.selectionEnd=end;
          editCanvas.fire("text:selection:changed",{target:t});
        },{start,end});
        await publishedFont(font);assert.equal(await input.inputValue(),"8");
        assert.deepEqual(await sizes(),[120,120],"style publication and typing alone cannot format text");
      }
      await input.press("Tab");assert.deepEqual(await sizes(),[8,8]);
    }
  });
});

test("temporary validation locks retain range-only correction, notice focus and font history after Save and Export denial",async()=>{
  await fixture(async page=>{
    const writes=[];let downloads=0;
    page.on("download",()=>downloads++);
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:writes.length,success:"Saved."};});
    for(const action of ["Save","Export editable PPTX"]){
      const initial=draft("Lead 中文 tail",{y:370,w:150,h:1});
      initial.document.slides[0].elements[0].paragraphs=[{runs:[
        {...model.defaultRun,text:"Lead "},
        {...model.defaultRun,text:"中文",font:"Courier New",bold:true,underline:true},
        {...model.defaultRun,text:" tail",font:"Times New Roman",italic:true},
      ]}];
      await mountPresentation(page,{initial});await select(page);
      await page.evaluate(()=>{
        const t=editCanvas.getActiveObject();t.enterEditing();t.selectionStart=5;t.selectionEnd=7;
        editCanvas.fire("text:selection:changed",{target:t});
      });
      await applySize(page,120);
      const read=()=>page.evaluate(()=>{
        const t=editCanvas.getObjects()[0];
        return presentationModules("@/lib/presentation-fabric").readText(t,{});
      });
      const overflow=await read(),beforeWrites=writes.length;
      const pixels=()=>page.evaluate(()=>{editCanvas.renderAll();return editCanvas.lowerCanvasEl.toDataURL();});
      const rendered=await pixels();
      // Gate only the first real validation, not its result or the UI lock.
      await page.evaluate(()=>{
        const fabricModule=presentationModules("@/lib/presentation-fabric"),validate=fabricModule.validateTextLayout;
        window.validationEntered=false;
        fabricModule.validateTextLayout=async(...args)=>{
          fabricModule.validateTextLayout=validate;window.validationEntered=true;
          await new Promise(resolve=>{window.releaseValidation=resolve;});
          return validate(...args);
        };
      });
      try{
        await page.getByRole("button",{name:action,exact:true}).click();
        await page.waitForFunction(()=>validationEntered&&editCanvas.getActiveObject().hiddenTextarea?.disabled);
        assert.equal(await page.getByLabel("Font size",{exact:true}).isDisabled(),true);
        assert.equal(await page.evaluate(()=>editCanvas.skipTargetFind&&!editCanvas.selection),true);
        // A disabled Fabric textarea cannot regain focus or accept native input.
        await page.evaluate(()=>editCanvas.getActiveObject().hiddenTextarea.focus());
        await page.keyboard.type("blocked");await page.keyboard.press("Backspace");
        await page.keyboard.press("ControlOrMeta+b");
        assert.deepEqual(await read(),overflow,"actual Fabric text/styles must not mutate while validation is locked");
        assert.equal(writes.length,beforeWrites);assert.equal(downloads,0);
      }finally{await page.evaluate(()=>window.releaseValidation?.());}
      const alert=page.getByRole("alert").filter({hasText:"outside the slide"});
      await alert.waitFor();await page.waitForFunction(()=>!editCanvas.getActiveObject().hiddenTextarea.disabled);
      assert.equal(await alert.evaluate(el=>document.activeElement===el),true,"unlock must not steal accessible error focus");
      assert.deepEqual(await page.evaluate(()=>{
        const t=editCanvas.getActiveObject();return [t.selectionStart,t.selectionEnd,t.isEditing];
      }),[5,7,true]);
      assert.ok(await pixels()===rendered,"denial must also retain the rendered text, not just its stored styles");
      assert.equal(writes.length,beforeWrites);assert.equal(downloads,0);
      // No reselect/enterEditing between denial, correction and the saved check.
      await applySize(page,18);
      const corrected=await read(),expected=structuredClone(overflow);expected.paragraphs[0].runs[1].size=18;
      assert.deepEqual(corrected,expected,"only the originally selected characters may change, including their marks/fonts");
      await page.getByRole("button",{name:"Undo",exact:true}).click();
      await page.waitForFunction(()=>editCanvas.getObjects()[0]?.getSelectionStyles(5,7,true).every(s=>s.fontSize===120));
      assert.deepEqual(await read(),overflow);
      await page.getByRole("button",{name:"Redo",exact:true}).click();
      await page.waitForFunction(()=>editCanvas.getObjects()[0]?.getSelectionStyles(5,7,true).every(s=>s.fontSize===18));
      assert.deepEqual(await read(),corrected);
      await page.getByRole("button",{name:"Save",exact:true}).click();
      await page.getByRole("status").filter({hasText:`Version ${beforeWrites+1}`}).waitFor();
      assert.equal(writes.length,beforeWrites+1);
      const saved=JSON.parse(new Map(writes.at(-1)).get("content")).document.slides[0].elements[0];
      assert.deepEqual(saved.paragraphs,corrected.paragraphs);
      assert.equal(model.textOf(saved),"Lead 中文 tail");
    }
  });
});

test("pending requests lock native text input without losing a caret or multiselect; unknown save stays locked",async()=>{
  await fixture(async page=>{
    const payloads=[];let release;
    await page.exposeFunction("persist",async(name,entries)=>{
      payloads.push(entries);return new Promise(resolve=>{release=resolve;});
    });
    const initial=draft("Lead 中文 tail");
    initial.document.slides[0].elements.push({...model.newText("Second textbox"),y:270});
    await mountPresentation(page,{initial});
    await page.waitForFunction(()=>editCanvas.getObjects().length===2);
    await page.evaluate(()=>{
      const t=editCanvas.getObjects()[0];editCanvas.setActiveObject(t);t.enterEditing();t.selectionStart=5;t.selectionEnd=5;
      editCanvas.fire("text:selection:changed",{target:t});
    });
    const read=()=>page.evaluate(()=>editCanvas.getObjects().map(t=>{
      const adapter=presentationModules("@/lib/presentation-fabric");
      return {id:adapter.objectId(t),text:adapter.readText(t,{}),matrix:t.calcTransformMatrix(),w:t.width,h:t.height};
    }));
    async function lockedAttempt(result){
      const before=await read(),calls=payloads.length;release=undefined;
      try{
        await page.getByRole("button",{name:"Save",exact:true}).click();
        await page.waitForFunction(()=>document.querySelector(".presentation-save-state").textContent.includes("Saving"));
        for(let i=0;payloads.length===calls&&i<500;i++)await new Promise(resolve=>setTimeout(resolve,10));
        assert.equal(payloads.length,calls+1);
        assert.equal(await page.getByLabel("Lesson title",{exact:true}).isDisabled(),true);
        assert.equal(await page.evaluate(()=>editCanvas.skipTargetFind&&!editCanvas.selection),true);
        await page.evaluate(()=>editCanvas.getObjects()[0].hiddenTextarea?.focus());
        await page.keyboard.type("blocked");await page.keyboard.press("Backspace");await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ControlOrMeta+b");
        assert.deepEqual(await read(),before,"pending request must not change actual canvas data");
        const saved=JSON.parse(new Map(payloads.at(-1)).get("content")).document.slides[0].elements;
        assert.deepEqual(saved.map(e=>({id:e.id,paragraphs:e.paragraphs,align:e.align})),before.map(e=>({id:e.id,...e.text})));
      }finally{release?.(result);}
    }
    try{
      await lockedAttempt({error:"Synthetic denied save."});
      const alert=page.getByRole("alert").filter({hasText:"Synthetic denied save."});await alert.waitFor();
      assert.equal(await alert.evaluate(el=>el===document.activeElement),true);
      assert.deepEqual(await page.evaluate(()=>{
        const t=editCanvas.getActiveObject();return [t.selectionStart,t.selectionEnd,t.isEditing,t.hiddenTextarea.disabled];
      }),[5,5,true,false]);
      await page.getByText("Accessible object outline",{exact:true}).click();
      await page.getByRole("checkbox",{name:/Object 2:/}).check();
      const ids=await page.evaluate(()=>editCanvas.getActiveObjects().map(o=>presentationModules("@/lib/presentation-fabric").objectId(o)).sort());
      await lockedAttempt({error:"Synthetic denied save."});
      await alert.waitFor();
      assert.deepEqual(await page.evaluate(()=>editCanvas.getActiveObjects().map(o=>presentationModules("@/lib/presentation-fabric").objectId(o)).sort()),ids);
      assert.equal(await page.evaluate(()=>editCanvas.getActiveObject() instanceof fabric.ActiveSelection),true);
      await page.evaluate(()=>{
        const t=editCanvas.getObjects()[0];editCanvas.discardActiveObject();editCanvas.setActiveObject(t);
        t.enterEditing();t.selectionStart=5;t.selectionEnd=7;editCanvas.fire("text:selection:changed",{target:t});
      });
      await lockedAttempt({saveUncertain:true});
      await page.getByRole("alert").filter({hasText:"unknown"}).waitFor();
      assert.equal(await page.getByRole("button",{name:"Save",exact:true}).isDisabled(),true);
      assert.equal(await page.evaluate(()=>editCanvas.getActiveObject().hiddenTextarea.disabled),true);
      const uncertain=await read();
      await page.evaluate(()=>editCanvas.getActiveObject().hiddenTextarea.focus());
      await page.keyboard.type("still blocked");await page.keyboard.press("Delete");
      assert.deepEqual(await read(),uncertain);
      assert.equal(payloads.length,3);
    }finally{release?.({error:"Fixture cleanup."});}
  });
});
