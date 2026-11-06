import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {chromium} from "@playwright/test";
import sharp from "sharp";
import {presentation} from "./slide-authoring-harness.mjs";
import {mountPresentation} from "./presentation-browser-harness.mjs";

function sample(){
  const value=presentation.blankPresentation();
  value.title="Designing better software";
  value.document.slides=Array.from({length:6},(_,i)=>{
    const slide=presentation.newSlide();
    slide.title=["Start with the problem","Listen to your users","Map the journey","Test an idea","Learn and improve","Your next step"][i];
    const title=presentation.newText(slide.title);
    Object.assign(title,{x:65,y:120,w:800,h:110});
    Object.assign(title.paragraphs[0].runs[0],{size:48,bold:true,color:"#174a3a"});
    const body=presentation.newText("Small steps. Clear goals. Meaningful progress.");
    Object.assign(body,{x:65,y:270,w:800,h:100});
    Object.assign(body.paragraphs[0].runs[0],{size:26,color:"#4a6656"});
    slide.background="#fffefa";
    slide.elements=[
      {id:crypto.randomUUID(),type:"shape",shape:"roundedrect",x:65,y:70,w:100,h:12,rotation:0,fill:"#eac86b",stroke:"#eac86b",strokeWidth:0},
      title,body,
    ];
    return slide;
  });
  return value;
}

async function settled(page){
  await page.waitForTimeout(100);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

test("presentation geometry in the portal shell, responsive panels, unclipped primary tools and fit-height stage",async()=>{
  const browser=await chromium.launch();
  const context=await browser.newContext({offline:true,serviceWorkers:"block"});
  const errors=[],requests=[];
  const artifacts=await mkdtemp(join(tmpdir(),"forge-presentation-layout-"));
  try{
    await context.route("**/*",route=>{requests.push(route.request().url());return route.abort();});
    for(const [width,height,minCanvas] of [[1440,900,600],[1366,768,540],[1920,1080,600],[1024,768,0],[768,1024,0],[320,900,0],[683,384,0]]){
      const page=await context.newPage();
      page.on("pageerror",error=>errors.push(error.message));
      await page.setViewportSize({width,height});
      await mountPresentation(page,{initial:sample()});
      await page.waitForFunction(()=>editCanvas.getObjects().length===3);
      await settled(page);
      await page.evaluate(()=>{editCanvas.setActiveObject(editCanvas.getObjects()[1]);editCanvas.requestRenderAll();});
      await settled(page);
      const geometry=await page.evaluate(()=>{
        const rect=selector=>{
          const r=document.querySelector(selector).getBoundingClientRect();
          return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right};
        };
        return {editor:rect(".presentation-editor"),canvas:rect(".canvas-container"),main:rect(".presentation-main"),
          workspace:rect(".presentation-workspace"),overflow:document.documentElement.scrollWidth>innerWidth,
          sidebar:getComputedStyle(document.querySelector(".portal-workspace")).marginLeft};
      });
      console.log(`${width}x${height}: ${JSON.stringify(geometry)}`);
      assert.equal(geometry.overflow,false);
      assert.ok(Math.abs(geometry.canvas.w/geometry.canvas.h-16/9)<.01);
      assert.ok(geometry.canvas.right<=geometry.main.right&&geometry.canvas.x>=geometry.main.x);
      if(width>=1200){
        assert.equal(geometry.sidebar,"242px");
        if(width===1440)assert.ok(geometry.editor.w>=1100);
        assert.ok(geometry.canvas.w>=minCanvas,`Canvas below ${minCanvas}px: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.workspace.bottom<=height,JSON.stringify(geometry));
        assert.ok(geometry.canvas.bottom<=height);
        for(const name of ["Save","Save and publish","Export editable PPTX","Fullscreen preview","Undo","Redo","Add text","Add slide","AI Slide Assistant","Lesson settings","Quiz","Help"]){
          const button=page.getByRole("button",{name,exact:true});
          const r=await button.boundingBox();
          assert.ok(r&&r.y>=0&&r.y+r.height<=height,`${width}: ${name} outside initial viewport`);
          assert.equal(await button.evaluate(el=>{
            const r=el.getBoundingClientRect(),at=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
            return el===at||el.contains(at);
          }),true,`${name} is covered`);
        }
        const gaps=await page.locator(".presentation-ribbon .presentation-toolbar").evaluateAll(groups=>groups.flatMap(group=>{
          const boxes=[...group.children].map(e=>e.getBoundingClientRect());
          return boxes.slice(1).map((r,i)=>r.x-boxes[i].right);
        }));
        assert.ok(gaps.every(gap=>gap>=6),`Crowded tool gaps: ${gaps}`);
        const ribbonRows=await page.locator(".presentation-ribbon > *").evaluateAll(groups=>groups.map(group=>group.getBoundingClientRect().y));
        assert.ok(ribbonRows.every(y=>y===ribbonRows[0]),`Ribbon groups must share one desktop row: ${ribbonRows}`);
      }else{
        assert.equal(await page.locator(".presentation-slides").getAttribute("open"),null);
        assert.equal(await page.locator(".presentation-properties").getAttribute("open"),null);
        await page.locator(".presentation-properties > summary").focus();
        await page.keyboard.press("Enter");
        await page.getByRole("combobox",{name:/^Font/}).waitFor({state:"visible"});
        await page.locator(".presentation-properties > summary").click();
        await page.locator(".presentation-slides > summary").click();
        await page.getByRole("button",{name:"Add slide",exact:true}).scrollIntoViewIfNeeded();
        assert.equal(await page.getByRole("button",{name:"Add slide",exact:true}).isVisible(),true);
        await page.locator(".presentation-slides > summary").click();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
      await page.evaluate(()=>scrollTo(0,0));
      await settled(page);
      const screenshot=await page.screenshot({path:join(artifacts,`workspace-${width}.png`),fullPage:true});
      // Check the screenshot's actual canvas pixels, not just its empty bounds.
      const bounds=await page.locator(".canvas-container").boundingBox();
      const pixel=await sharp(screenshot).extract({left:Math.round(bounds.x+100*bounds.width/960),top:Math.round(bounds.y+76*bounds.height/540),width:1,height:1}).removeAlpha().raw().toBuffer();
      assert.ok(pixel[0]>200&&pixel[1]>150&&pixel[2]<140,`${width}: the slide's gold accent is missing from the screenshot: ${pixel}`);
      if(width>=1200){
        const add=page.getByRole("button",{name:"Add slide",exact:true}),before=await add.boundingBox();
        await page.locator(".presentation-slides ol").evaluate(el=>{el.scrollTop=el.scrollHeight;});
        assert.deepEqual(await add.boundingBox(),before,"Slide management must not scroll with thumbnails.");
        const thumbnails=await page.locator(".presentation-slides ol").boundingBox();
        assert.ok(thumbnails.y+thumbnails.height<=geometry.workspace.bottom);
        await page.getByText("Position & size",{exact:true}).click();
        await page.getByText("Alignment & layers",{exact:true}).click();
        const inspector=await page.locator(".presentation-properties > fieldset").boundingBox();
        assert.ok(inspector.y+inspector.height<=geometry.workspace.bottom);
        assert.equal(await page.locator(".presentation-properties > fieldset").evaluate(el=>el.scrollHeight>el.clientHeight),true);
      }
      await page.close();
    }
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    console.log("Layout screenshots:",artifacts);
  }finally{await context.close();await browser.close();}
});

test("named dialogs support keyboard, focus return, metadata/quiz history, validation and modal feedback",async()=>{
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width:1366,height:768}});
  const page=await context.newPage(),writes=[],errors=[];
  try{
    page.on("pageerror",e=>errors.push(e.message));
    await context.route("**/*",route=>route.abort());
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:writes.length,success:"Saved."};});
    await page.exposeFunction("images",async()=>({success:"Unused synthetic uploads cleaned."}));
    await mountPresentation(page,{initial:sample()});
    for(const name of ["Lesson settings","Quiz","Help"]){
      const trigger=page.getByRole("button",{name,exact:true});
      await trigger.focus();await page.keyboard.press("Enter");
      const dialog=page.getByRole("dialog");await dialog.waitFor();
      for(let i=0;i<12;i++){
        await page.keyboard.press(i%3?"Tab":"Shift+Tab");
        assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
      }
      await page.keyboard.press("Escape");
      assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
    }
    await page.getByRole("button",{name:"Lesson settings",exact:true}).click();
    await page.getByRole("combobox",{name:/^Audience/}).selectOption("both");
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await page.getByRole("button",{name:"Lesson settings",exact:true}).click();
    assert.equal(await page.getByRole("combobox",{name:/^Audience/}).inputValue(),"learners");
    await page.getByRole("button",{name:"Clean expired image uploads",exact:true}).click();
    const status=page.getByRole("status");
    await status.filter({hasText:"synthetic uploads cleaned"}).waitFor();
    assert.equal(await status.evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("dialog").evaluate(el=>el.contains(document.activeElement)),true);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button",{name:"Lesson settings",exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.getByRole("button",{name:"Quiz",exact:true}).click();
    await page.getByLabel("Include a quiz",{exact:true}).check();
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Undo",exact:true}).click();
    await page.getByRole("button",{name:"Quiz",exact:true}).click();
    assert.equal(await page.getByLabel("Include a quiz",{exact:true}).isChecked(),false);
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Redo",exact:true}).click();
    await page.getByRole("button",{name:"Save",exact:true}).click();
    const alert=page.getByRole("alert");await alert.waitFor();
    assert.equal(writes.length,0);
    assert.equal(await alert.evaluate(el=>el===document.activeElement),true);
    await page.getByRole("button",{name:"Quiz (3)",exact:true}).click();
    for(let i=0;i<3;i++){
      const question=page.getByRole("group",{name:`Question ${i+1}`,exact:true});
      await question.getByLabel("Question",{exact:true}).fill(`A complete question ${i+1}?`);
      for(let j=0;j<4;j++)await question.getByLabel(`Option ${j+1}`,{exact:true}).fill(`Answer ${j+1}`);
    }
    await page.keyboard.press("Escape");
    await page.getByRole("button",{name:"Save",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Version 1"}).waitFor();
    assert.equal(JSON.parse(new Map(writes[0]).get("content")).quiz.length,3);
    await page.getByLabel("Insert PNG/JPEG",{exact:true}).focus();
    assert.equal(await page.locator(".presentation-upload").evaluate(el=>el.matches(":focus-within")),true);
    await page.getByText("Shapes",{exact:true}).focus();await page.keyboard.press("Enter");await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("button",{name:"rect",exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press("Enter");
    assert.equal(await page.getByText("Shapes",{exact:true}).evaluate(el=>el===document.activeElement),true);
    assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close();}
});

test("enlarged editor text and 320px dialogs keep controls reachable without horizontal overflow",async()=>{
  const browser=await chromium.launch(),context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width:1366,height:768}});
  const page=await context.newPage(),errors=[];
  const artifacts=await mkdtemp(join(tmpdir(),"forge-presentation-accessibility-"));
  try{
    page.on("pageerror",e=>errors.push(e.message));
    await context.route("**/*",route=>route.abort());
    await mountPresentation(page,{initial:sample()});
    await page.addStyleTag({content:".presentation-editor {font-size:20px} .presentation-editor :is(button,input,select,summary,label), .presentation-editor .presentation-upload {font-size:20px}"});
    await settled(page);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    for(const name of ["Save","Save and publish","Export editable PPTX","Fullscreen preview","Add text","Lesson settings","Quiz","Help"]){
      const button=page.getByRole("button",{name,exact:true});
      await button.scrollIntoViewIfNeeded();
      const bounds=await button.boundingBox();
      assert.ok(bounds.x>=242&&bounds.x+bounds.width<=1366,`${name} is clipped with enlarged text`);
    }
    await page.evaluate(()=>scrollTo(0,0));await settled(page);
    await page.screenshot({path:join(artifacts,"text20px-1366.png"),fullPage:true});
    await page.setViewportSize({width:320,height:900});
    await page.getByRole("button",{name:"Lesson settings",exact:true}).click();
    const dialog=page.getByRole("dialog");await dialog.waitFor();
    const bounds=await dialog.boundingBox();
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=320);
    assert.ok(Math.abs(bounds.x-(320-bounds.width)/2)<1,"The modal should remain centered after CSS reset/zoom.");
    await page.getByRole("combobox",{name:/^Difficulty/}).selectOption("advanced");
    await page.getByRole("button",{name:"Clean expired image uploads",exact:true}).scrollIntoViewIfNeeded();
    assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.screenshot({path:join(artifacts,"settings320-text20px.png"),fullPage:true});
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button",{name:"Lesson settings",exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.getByRole("button",{name:"Quiz",exact:true}).click();
    await page.getByLabel("Include a quiz",{exact:true}).check();
    const last=page.getByRole("group",{name:"Question 3",exact:true});
    await last.getByLabel("Question",{exact:true}).fill("Keyboard-reachable question");
    await last.getByRole("combobox",{name:/^Correct option/}).focus();
    assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("button",{name:"Quiz (3)",exact:true}).evaluate(el=>el===document.activeElement),true);
    assert.deepEqual(errors,[]);
    console.log("Enlarged text/mobile dialog screenshots:",artifacts);
  }finally{await context.close();await browser.close();}
});
