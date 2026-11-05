import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {chromium} from "@playwright/test";
import JSZip from "jszip";
import sharp from "sharp";
import {harness} from "./slide-authoring-harness.mjs";
import {mountPresentation} from "./presentation-browser-harness.mjs";

test("mounted presentation: real Fabric IME, properties/history/slides, native export, guarded real saves and 320px keyboard",async()=>{
  const h=await harness(),browser=await chromium.launch();
  const context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width:1440,height:1000}});
  const requests=[],errors=[],payloads=[];
  await context.route("**/*",route=>{requests.push(route.request().url());return route.abort();});
  let release,gate=null;
  const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));
  const artifacts=await mkdtemp(join(tmpdir(),"forge-presentation-"));
  try{
    await page.exposeFunction("persist",async(name,entries)=>{
      payloads.push(entries);if(gate)await gate;
      const form=new FormData();for(const [k,v]of entries)form.set(k,v);
      return h.actions[name]({},form);
    });
    await page.exposeFunction("images",async()=>({error:"Image storage not used in this case."}));
    await mountPresentation(page);
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("alert").waitFor();assert.equal(payloads.length,0);
    await page.getByLabel("Lesson title",{exact:true}).fill("Native author lesson");
    await page.getByRole("button",{name:"Add text",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getActiveObject()?.type==="textbox");
    await page.evaluate(()=>{const t=editCanvas.getActiveObject();t.enterEditing();t.selectAll();});
    const cdp=await context.newCDPSession(page);
    await cdp.send("Input.imeSetComposition",{text:"中文",selectionStart:2,selectionEnd:2});await cdp.send("Input.insertText",{text:"中文"});
    await page.keyboard.type(" native text");
    await page.evaluate(()=>editCanvas.getActiveObject().exitEditing());
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getObjects()[0]?.text==="Edit text");
    await page.getByRole("button",{name:"Redo",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getObjects()[0]?.text==="中文 native text");
    await page.evaluate(()=>{const t=editCanvas.getObjects()[0];editCanvas.setActiveObject(t);t.enterEditing();t.selectionStart=0;t.selectionEnd=2;});
    await page.getByRole("button",{name:"bold",exact:true}).click();
    await page.getByRole("button",{name:"bold",exact:true}).click();
    await page.getByRole("button",{name:"bold",exact:true}).click();
    await page.evaluate(()=>editCanvas.getActiveObject().exitEditing());
    await page.getByLabel("X position",{exact:true}).fill("90");
    await page.getByLabel("Rotation",{exact:true}).fill("15");
    await page.getByText("Shapes",{exact:true}).click();await page.getByRole("button",{name:"rect",exact:true}).click();
    await page.getByLabel("Shape fill",{exact:true}).fill("#ff0000");
    await page.getByRole("button",{name:"Duplicate objects",exact:true}).click();
    await page.getByRole("button",{name:"Delete objects",exact:true}).click();
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getObjects().length===3);
    await page.getByRole("button",{name:"Duplicate slide",exact:true}).click();
    await page.getByLabel("Slide title (accessible)",{exact:true}).fill("Second slide");
    await page.getByRole("button",{name:"Slide up",exact:true}).click();
    await page.getByRole("button",{name:"Add slide",exact:true}).click();
    await page.getByRole("button",{name:"Delete slide",exact:true}).click();
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await page.getByRole("button",{name:"Redo",exact:true}).click();
    const native=await page.evaluate(async()=>{
      const load=presentationModules;
      const slides=[...document.querySelectorAll(".presentation-slides li button")].length;
      const doc={schemaVersion:1,width:960,height:540,slides:[{id:crypto.randomUUID(),title:"Native export",background:"#ffffff",elements:[
        {...load("@/lib/presentation").newText("Editable 中文"),rotation:15},
        {id:crypto.randomUUID(),type:"shape",shape:"ellipse",x:100,y:300,w:100,h:100,rotation:20,fill:"#ff0000",stroke:"#000000",strokeWidth:1},
        {id:crypto.randomUUID(),type:"image",assetId:crypto.randomUUID(),alt:"Small diagram",ratio:1,x:500,y:300,w:100,h:100,rotation:0},
      ]}]};
      const c=document.createElement("canvas");c.width=2;c.height=2;c.getContext("2d").fillRect(0,0,2,2);
      const blob=await load("@/lib/presentation-export").presentationPptx(doc,async()=>c.toDataURL("image/png"));
      let failed=false;try{await load("@/lib/presentation-export").presentationPptx(doc,async()=>{throw new Error("Missing image");});}catch{failed=true;}
      const overflow=structuredClone(doc);overflow.slides[0].elements[0].h=1;
      let overflowFailed=false;try{await load("@/lib/presentation-export").presentationPptx(overflow,async()=>c.toDataURL("image/png"));}catch(e){overflowFailed=e.message.includes("exceeds its height");}
      return {data:Array.from(new Uint8Array(await blob.arrayBuffer())),failed,slides,overflowFailed};
    });
    assert.equal(native.slides,2);assert.equal(native.failed,true);
    assert.equal(native.overflowFailed,true);
    const zip=await JSZip.loadAsync(Uint8Array.from(native.data));const xml=await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml,/Editable 中文/);assert.match(xml,/<p:pic>/);assert.match(xml,/prst="ellipse"/);assert.match(xml,/rot="900000"/);
    const textTransform=xml.match(/<a:xfrm[^>]*rot="900000"[^>]*>\s*<a:off x="(-?\d+)" y="(-?\d+)"/);
    const radians=15*Math.PI/180;
    assert.ok(Math.abs(Number(textTransform[1])-(60+Math.cos(radians)*350-Math.sin(radians)*75-350)*12700)<=1);
    assert.ok(Math.abs(Number(textTransform[2])-(70+Math.sin(radians)*350+Math.cos(radians)*75-75)*12700)<=1);
    assert.ok(xml.indexOf("Editable 中文")<xml.indexOf('prst="ellipse"')&&xml.indexOf('prst="ellipse"')<xml.indexOf("<p:pic>"),"Native OOXML preserves back-to-front element order.");
    const [download]=await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button",{name:"Export editable PPTX",exact:true}).click(),
    ]);
    const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
    const currentZip=await JSZip.loadAsync(Buffer.concat(chunks));
    const currentXml=await currentZip.file("ppt/slides/slide1.xml").async("string");
    assert.match(currentXml,/<a:t>中文<\/a:t>/);assert.match(currentXml,/<a:rPr[^>]*b="1"/);
    assert.match(currentXml,/rot="900000"/);assert.match(currentXml,/prst="rect"/);
    assert.equal(Object.keys(currentZip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).length,2);
    assert.doesNotMatch(currentXml,/Question|correct|answer key/);
    gate=new Promise(resolve=>{release=resolve;});
    await page.getByRole("button",{name:"Save",exact:true}).evaluate(button=>{button.click();button.click();});
    await page.waitForTimeout(100);assert.equal(payloads.length,1);release();gate=null;
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    await page.getByRole("button",{name:"Save and publish",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 2"}).waitFor();
    assert.equal(new Map(payloads[1]).get("version"),"1");assert.ok(new Map(payloads[1]).get("lessonId"));
    const content=JSON.parse(new Map(payloads[1]).get("content"));
    const text=content.document.slides.flatMap(s=>s.elements).find(e=>e.type==="text");
    assert.equal(text.x,90);assert.equal(text.rotation,15);
    assert.equal(text.paragraphs[0].runs[0].text,"中文");assert.equal(text.paragraphs[0].runs[0].bold,true);
    const stored=(await h.db.query("select * from forge_lessons")).rows;
    assert.equal(stored.length,1);assert.equal(stored[0].visibility,"private");assert.equal(stored[0].review_requested,true);assert.equal(stored[0].content.format,"presentation");assert.equal("body" in stored[0].content.slides[0],false);
    await page.screenshot({path:join(artifacts,"editor1440.png"),fullPage:true});
    await page.setViewportSize({width:320,height:900});
    await page.getByRole("button",{name:"Add text",exact:true}).focus();await page.keyboard.press("Enter");
    await page.getByRole("textbox",{name:/^Textbox content/}).fill("Keyboard accessible content");
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    for(const box of await page.locator(".presentation-surface").evaluateAll(els=>els.map(e=>({w:e.clientWidth,h:e.clientHeight})))){
      assert.ok(Math.abs(box.w/box.h-16/9)<.1,"all thumbnails and stage retain 16:9");
    }
    await page.screenshot({path:join(artifacts,"editor320.png"),fullPage:true});
    await page.evaluate(()=>{HTMLDialogElement.prototype.requestFullscreen=()=>Promise.reject(new Error("Synthetic denial"));});
    await page.getByRole("button",{name:"Fullscreen preview",exact:true}).click();await page.getByRole("dialog").waitFor();
    await page.getByRole("dialog").getByRole("status").filter({hasText:"Fullscreen is unavailable"}).waitFor();
    await page.getByRole("button",{name:"Close preview",exact:true}).click();
    assert.equal(await page.getByRole("button",{name:"Fullscreen preview",exact:true}).evaluate(el=>el===document.activeElement),true);
    h.state.lose=true;
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("alert").filter({hasText:"unknown"}).waitFor();
    assert.equal(await page.getByRole("button",{name:"Save",exact:true}).isDisabled(),true);
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    console.log("Mounted editor screenshot:",join(artifacts,"editor320.png"));
  }finally{if(errors.length)console.log("Browser errors:",errors);release?.();await context.close();await browser.close();await h.db.close();}
});

test("mounted range fonts, multiselect transforms and delayed image replacement preserve draft and undo",async()=>{
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block"});
  const page=await context.newPage(),errors=[],writes=[];
  page.on("pageerror",error=>errors.push(error.message));
  const draftId=crypto.randomUUID(),first=crypto.randomUUID(),replacement=crypto.randomUUID();
  const png=await sharp({create:{width:120,height:60,channels:3,background:"#ff0000"}}).png().toBuffer();
  const tallPng=await sharp({create:{width:60,height:120,channels:3,background:"#00ff00"}}).png().toBuffer();
  let release,uploads=0;
  const gate=new Promise(resolve=>{release=resolve;});
  try{
    await context.route("**/*",route=>route.abort());
    await page.route(/\/api\/presentation\/assets\//,route=>route.fulfill({contentType:"image/png",body:route.request().url().includes(replacement)?tallPng:png}));
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:1,success:"Saved."};});
    await page.exposeFunction("images",async name=>{
      if(name==="begin")return {id:draftId};
      if(name==="upload"){uploads++;if(uploads===1)await gate;return uploads===1?{id:first,width:120,height:60}:{id:replacement,width:60,height:120};}
      if(name==="clean")throw new Error("Synthetic transport failure");
      return {success:"Cleaned."};
    });
    await mountPresentation(page);
    await page.getByLabel("Lesson title",{exact:true}).fill("Rich image draft");
    await page.getByRole("button",{name:"Add text",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getActiveObject()?.type==="textbox");
    await page.evaluate(()=>{const t=editCanvas.getActiveObject();t.enterEditing();t.selectAll();});
    await page.keyboard.insertText("中文 rich\nSecond paragraph");
    await page.evaluate(()=>{const t=editCanvas.getActiveObject();t.selectionStart=0;t.selectionEnd=2;});
    await page.getByRole("combobox",{name:/^Font/}).selectOption("Courier New");
    await page.getByLabel("Font size",{exact:true}).fill("36");
    await page.getByLabel("Text colour",{exact:true}).fill("#cc0000");
    const runs=await page.evaluate(()=>{
      const t=editCanvas.getActiveObject();t.exitEditing();
      return presentationModules("@/lib/presentation-fabric").readText(t,{});
    });
    assert.equal(runs.paragraphs[0].runs[0].text,"中文");
    assert.equal(runs.paragraphs[0].runs[0].font,"Courier New");
    assert.equal(runs.paragraphs[0].runs[0].size,36);
    assert.equal(runs.paragraphs[0].runs[0].color,"#cc0000");
    assert.equal(runs.paragraphs[0].runs[1].font,"Arial");
    assert.equal(runs.paragraphs[1].runs[0].text,"Second paragraph");
    await page.getByRole("button",{name:"Add text",exact:true}).click();
    const checks=page.locator(".presentation-outline input[type=checkbox]");
    await checks.nth(0).check();await checks.nth(1).check();
    await page.waitForFunction(()=>editCanvas.getActiveObjects().length===2);
    await page.evaluate(()=>{const group=editCanvas.getActiveObject();group.set({left:group.left+10,top:group.top+10});group.setCoords();editCanvas.fire("object:modified",{target:group});});
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent.includes("Version 1"));
    const stored=JSON.parse(new Map(writes[0]).get("content"));
    assert.deepEqual(stored.document.slides[0].elements.map(e=>[e.x,e.y]),[[70,80],[70,80]]);
    await page.getByLabel("Insert PNG/JPEG",{exact:true}).setInputFiles({name:"diagram.png",mimeType:"image/png",buffer:png});
    await page.waitForFunction(()=>document.querySelector('input[type=file]').matches(":disabled"));
    assert.equal(await page.getByRole("button",{name:"Save",exact:true}).isDisabled(),true);
    release();
    await page.getByLabel("Image alt text",{exact:true}).fill("Private diagram");
    await page.getByLabel("Width",{exact:true}).fill("240");
    assert.equal(await page.getByLabel("Height",{exact:true}).inputValue(),"120");
    await page.getByLabel("Replace image",{exact:true}).setInputFiles({name:"replacement.png",mimeType:"image/png",buffer:tallPng});
    await page.waitForFunction(()=>!document.querySelector('input[type=file]').matches(":disabled"));
    await page.waitForFunction(()=>{const image=editCanvas.getObjects().find(o=>o.type==="image");return image&&Math.abs(image.width*image.scaleX/(image.height*image.scaleY)-.5)<.001;});
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await page.waitForFunction(()=>editCanvas.getObjects().filter(o=>o.type==="image").length===1);
    const ids=await page.locator(".presentation-slides img").count();
    assert.equal(ids,0,"Rendering uses the canonical Fabric adapter, not external image elements.");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent.includes("Version 1"));
    const undone=JSON.parse(new Map(writes.at(-1)).get("content")).document.slides[0].elements.find(e=>e.type==="image");
    assert.equal(undone.assetId,first);assert.equal(undone.alt,"Private diagram");assert.equal(undone.w/undone.h,2);
    await page.getByRole("button",{name:"Clean expired image uploads",exact:true}).click();
    await page.getByRole("alert").filter({hasText:"cleanup was not confirmed"}).waitFor();
    assert.deepEqual(errors,[]);
  }finally{release();await context.close();await browser.close();}
});

test("duplicating a rotated object near the edge retains a valid saveable draft",async()=>{
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block"}),page=await context.newPage();
  const writes=[];
  try{
    await context.route("**/*",route=>route.abort());
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:1,success:"Saved."};});
    await page.exposeFunction("images",()=>({error:"Not used."}));
    await mountPresentation(page,{initial:{title:"Rotated edge",audience:"learners",difficulty:"foundation",quiz:[],document:{
      schemaVersion:1,width:960,height:540,slides:[{id:crypto.randomUUID(),title:"Edge",background:"#ffffff",elements:[
        {id:crypto.randomUUID(),type:"shape",shape:"rect",x:300,y:246,w:200,h:200,rotation:45,fill:"#ffffff",stroke:"#000000",strokeWidth:1},
      ]}],
    }}});
    await page.locator(".presentation-outline input[type=checkbox]").check();
    await page.getByRole("button",{name:"Duplicate objects",exact:true}).click();
    const valid=await page.evaluate(()=>{
      const model=presentationModules("@/lib/presentation");
      const slide=model.newSlide();
      slide.elements=editCanvas.getObjects().map(o=>({id:o.elementId,type:"shape",shape:"rect",x:o.left,y:o.top,w:o.width,h:o.height,rotation:o.angle,fill:"#ffffff",stroke:"#000000",strokeWidth:1}));
      return model.presentationSlideSchema.safeParse(slide).success;
    });
    assert.equal(valid,true,"Duplicate must not put rotated corners outside the slide.");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    assert.equal(JSON.parse(new Map(writes[0]).get("content")).document.slides[0].elements.length,2);
  }finally{await context.close();await browser.close();}
});
