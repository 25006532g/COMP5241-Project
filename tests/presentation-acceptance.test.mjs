// Independent bounded acceptance: synthetic content, actual modules/SQL, no Next
// loader or server. Run only through offline-run.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {z} from "zod";
import sharp from "sharp";
import JSZip from "jszip";
import {chromium} from "@playwright/test";
import {harness,load,transpile,presentation,learning,slides,curriculum,resume,draft} from "./slide-authoring-harness.mjs";
import {canonical,selection} from "./lesson-generation-harness.mjs";
import {mountPresentation} from "./presentation-browser-harness.mjs";
import * as imageTools from "../src/lib/presentation-images.ts";

const require=createRequire(import.meta.url);
// Only these synthetic values are visible to modules needing configuration.
function isolated(path,deps) {
  const mod={exports:{}};
  new Function("require","module","exports","process",transpile(path))(name=>{
    assert.ok(Object.hasOwn(deps,name),`Unexpected dependency ${name}`);
    return deps[name];
  },mod,mod.exports,{env:{NEXT_PUBLIC_SUPABASE_URL:"https://synthetic.invalid",SUPABASE_SERVICE_ROLE_KEY:"synthetic-not-a-credential"}});
  return mod.exports;
}
function author(slideCount=1,objectCount=0) {
  const value=presentation.blankPresentation();value.title="Independent acceptance";
  value.document.slides=Array.from({length:slideCount},(_,i)=>({
    ...presentation.newSlide(),title:`Slide ${i+1}`,
    elements:Array.from({length:i===0?objectCount:0},(_,j)=>({
      id:crypto.randomUUID(),type:"shape",shape:"rect",x:j%10*30,y:Math.floor(j/10)*30,w:20,h:20,
      rotation:0,fill:"#cc0000",stroke:"#000000",strokeWidth:0,
    })),
  }));
  return value;
}

test("independent exact 1/30/31 slides and 100/101 objects: actual saves, roundtrip, legacy and strict AI",async()=>{
  const h=await harness();
  try{
    for(const [count,objects] of [[1,100],[30,100]]) {
      const value=author(count,objects);
      assert.deepEqual(presentation.presentationAuthorSchema.parse(JSON.parse(JSON.stringify(value))),value);
      const saved=await h.actions.createManualLesson({},h.form(value,{format:"presentation"}));
      assert.ok(saved.lessonId,saved.error);
      const stored=(await h.db.query("select content from forge_lessons where id=$1",[saved.lessonId])).rows[0].content;
      assert.deepEqual(slides.fromPresentationLesson(learning.storedLessonSchema.parse(stored)),value);
      assert.equal(stored.slides.length,count);assert.equal(stored.slides[0].elements.length,objects);
    }
    const before=(await h.db.query("select * from forge_lessons order by id")).rows;
    for(const value of [author(0),author(31),author(1,101)]) {
      assert.equal(presentation.presentationAuthorSchema.safeParse(value).success,false);
      assert.ok((await h.actions.createManualLesson({},h.form(value,{format:"presentation"}))).error);
      const bypass={...slides.toPresentationLesson(author()),...value.document};
      await assert.rejects(()=>h.db.query("insert into forge_lessons(owner_id,title,subject,summary,content) values($1,$2,$3,$4,$5)",
        [h.owner,bypass.title,bypass.subject,bypass.summary,JSON.stringify(bypass)]),e=>e.code==="23514");
    }
    assert.deepEqual((await h.db.query("select * from forge_lessons order by id")).rows,before,"No clipping or partial rejected writes.");
    for(const count of [0,3,10,1,2,11]) {
      const value=author();value.quiz=draft(count).quiz;
      const saved=await h.actions.createManualLesson({},h.form(value,{format:"presentation"}));
      assert.equal(Boolean(saved.lessonId),[0,3,10].includes(count),saved.error);
    }
    const legacy=draft(3),snapshot=structuredClone(legacy);
    const saved=await h.actions.createManualLesson({},h.form(legacy));
    const prior=(await h.db.query("select content from forge_lessons where id=$1",[saved.lessonId])).rows[0].content;
    const converted=presentation.legacyPresentation(slides.fromStoredLesson(prior));
    assert.deepEqual(legacy,snapshot);
    assert.deepEqual(converted.document.slides.map(s=>s.elements.map(presentation.textOf)),legacy.slides.map(s=>[s.title,s.body]));
    assert.equal(converted.document.slides[0].background,legacy.slides[0].style.background);
    assert.equal(converted.document.slides[0].elements[1].paragraphs[0].runs[0].color,legacy.slides[0].style.color);
    assert.deepEqual((await h.db.query("select content from forge_lessons where id=$1",[saved.lessonId])).rows[0].content,prior);
    let response;
    const ai=load("../src/lib/openrouter.ts",{
      "server-only":{},zod:{z},"@/lib/learning":learning,"@/lib/curriculum":curriculum,
      "@/lib/openrouter-client":{completion:async()=>JSON.stringify(response)},
    });
    for(const [n,q,valid] of [[4,10,true],[6,10,true],[3,10,false],[7,10,false],[4,0,false],[4,3,false],[4,9,false],[4,11,false]]) {
      response={...canonical,slides:Array.from({length:n},()=>({...canonical.slides[0],topic:selection.metadata.topic})),
        questions:Array.from({length:q},()=>canonical.questions[0])};
      assert.equal(learning.lessonSchema.safeParse(response).success,valid);
      if(valid)assert.equal((await ai.generateLesson("Testable software requirements",selection)).slides.length,n);
      else await assert.rejects(()=>ai.generateLesson("Testable software requirements",selection),/incomplete or out-of-scope/);
    }
  }finally{await h.db.close();}
});

async function assetFixture(h) {
  const blobs=new Map(),calls=[];
  const faults={upload:false,ready:false,remove:false};
  const base=h.server.database();
  const client={...base,
    from(table) {
      const q=base.from(table);
      if(table==="forge_presentation_assets") {
        const update=q.update;
        q.update=value=>{
          if(faults.ready&&value.status==="ready")return {eq(){return this;},select(){return this;},single:async()=>({data:null,error:{code:"synthetic"}})};
          return update(value);
        };
      }
      return q;
    },
    async rpc(name,args) {
      assert.match(name,/^forge_[a-z_]+$/);
      try{
        const result=await h.db.query(`select * from ${name}(${Object.keys(args).map((k,i)=>`${k}=>$${i+1}`).join(",")})`,Object.values(args));
        return {data:name==="forge_claim_presentation_cleanup"?result.rows:Object.values(result.rows[0])[0],error:null};
      }catch(error){return {data:null,error:{code:error.code}};}
    },
    storage:{from(bucket){assert.equal(bucket,"forge-presentation-images");return{
      async upload(path,data){calls.push(["upload",path]);if(faults.upload)return {error:{message:"synthetic"}};blobs.set(path,Buffer.from(data));return {error:null};},
      async download(path){calls.push(["download",path]);return {data:blobs.has(path)?new Blob([blobs.get(path)],{type:"image/png"}):null,error:null};},
      async remove(paths){calls.push(["remove",...paths]);if(faults.remove)return {error:{message:"synthetic"}};paths.forEach(p=>blobs.delete(p));return {error:null};},
    };}},
  };
  const permissions=load("../src/lib/permissions.ts",{});
  const server=isolated("../src/lib/learning-server.ts",{
    "server-only":{},"@supabase/supabase-js":{createClient:()=>client},
    "next/navigation":{redirect(){throw new Error("Unexpected redirect");}},
    "@/lib/supabase/server":{createClient:async()=>({auth:{getUser:async()=>({data:{user:h.state.user},error:null})}})},
    "@/lib/learning":learning,zod:{z},"@/lib/permissions":permissions,
  });
  const assets=load("../src/lib/presentation-assets-server.ts",{"server-only":{},zod:{z},"./learning-server":server,"./presentation":presentation,"./learning":learning});
  const actions=load("../src/app/presentation/actions.ts",{zod:{z},"@/lib/learning-server":server,"@/lib/presentation-assets-server":assets,"@/lib/presentation-images":imageTools});
  const lessons=load("../src/app/learning/actions.ts",{
    "next/cache":{revalidatePath(){}},zod:{z},"@/lib/learning-server":server,"@/lib/learning":learning,
    "@/lib/resume":resume,"@/lib/curriculum":curriculum,"@/lib/slide-lesson":slides,"@/lib/openrouter":{},
    "@/lib/lesson-generation-server":{},"@/lib/ai-eligibility-server":{},"@/lib/presentation":presentation,"@/lib/presentation-assets-server":assets,
  });
  const route=load("../src/app/api/presentation/assets/[id]/route.ts",{
    "next/server":{NextResponse:require("next/server").NextResponse},
    "@/lib/presentation-assets-server":assets,"@/lib/learning-server":server,
  });
  const png=await sharp({create:{width:80,height:40,channels:3,background:"#ff0000"}}).png().toBuffer();
  const upload=draftId=>{const f=new FormData();f.set("draftId",draftId);f.set("image",new File([png],"synthetic.png",{type:"image/png"}));return actions.uploadPresentationImage(f);};
  const read=(id,scope)=>route.GET(new Request(`https://forge.test/api/presentation/assets/${id}?${scope}`),{params:Promise.resolve({id})});
  return {blobs,calls,faults,server,assets,actions,lessons,upload,read};
}

test("independent real authorization/actions: forged roles/scopes, version links, failed staging, DB privileges and account blob deletion",async()=>{
  const h=await harness();
  try{
    const f=await assetFixture(h);
    const {actions:a,lessons,assets,server,upload,read,faults,blobs,calls}=f;
    const begun=await a.beginPresentationDraft();assert.ok(begun.id,begun.error);
    const good=await upload(begun.id);assert.ok(good.id,good.error);
    const value=author();value.document.slides[0].elements=[{
      id:crypto.randomUUID(),type:"image",assetId:good.id,alt:"Synthetic private diagram",ratio:2,x:100,y:100,w:160,h:80,rotation:0,
    }];
    const made=await lessons.createManualLesson({},h.form(value,{format:"presentation",draftId:begun.id}));
    assert.ok(made.lessonId,made.error);
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,200);
    const headers=(await read(good.id,`lesson=${made.lessonId}`)).headers;
    assert.match(headers.get("cache-control"),/private.*no-store/);
    h.state.user={id:h.other,app_metadata:{},user_metadata:{role:"admin"}};
    const noCalls=calls.length;
    assert.ok((await a.beginPresentationDraft(made.lessonId)).error);
    assert.ok((await upload(begun.id)).error);
    assert.ok((await a.discardPresentationDraft(begun.id)).error);
    assert.ok((await lessons.updateLesson({},h.form(value,{format:"presentation",lessonId:made.lessonId,version:"1"}))).error);
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,404);
    assert.equal((await read(good.id,`draft=${begun.id}`)).status,404);
    assert.equal(calls.length,noCalls,"Untrusted user_metadata never reaches blob storage.");
    const foreignDraft=await a.beginPresentationDraft();assert.ok(foreignDraft.id);
    const foreign=await upload(foreignDraft.id);assert.ok(foreign.id);
    assert.equal((await read(good.id,`draft=${foreignDraft.id}`)).status,404);
    const tampered=structuredClone(value);tampered.document.slides[0].elements[0].assetId=good.id;
    assert.ok((await lessons.createManualLesson({},h.form(tampered,{format:"presentation",draftId:foreignDraft.id}))).error);
    h.state.user.app_metadata={role:"admin"};
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,404);
    await h.db.query("update forge_lessons set review_requested=true where id=$1",[made.lessonId]);
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,200);
    const reviewDraft=await a.beginPresentationDraft(made.lessonId);assert.ok(reviewDraft.id,reviewDraft.error);
    const reviewUpload=await upload(reviewDraft.id);assert.ok(reviewUpload.id,reviewUpload.error);
    assert.equal((await h.db.query("select owner_id from forge_presentation_assets where id=$1",[reviewUpload.id])).rows[0].owner_id,h.owner);
    h.state.user.app_metadata={};
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,404,"Revoked review rights apply immediately.");
    await h.db.query("update forge_lessons set visibility='public' where id=$1",[made.lessonId]);
    await h.db.query("insert into forge_enrollments(user_id,lesson_id) values($1,$2)",[h.other,made.lessonId]);
    assert.equal((await server.enrolledLesson(made.lessonId,h.state.user)).id,made.lessonId);
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,200);
    assert.ok((await a.beginPresentationDraft(made.lessonId)).error,"Enrolled learner cannot upload to someone else's lesson.");
    h.state.user={id:h.owner,app_metadata:{role:"instructor"}};
    const other=await lessons.createManualLesson({},h.form(author(),{format:"presentation"}));
    assert.ok(other.lessonId);
    assert.ok((await lessons.updateLesson({},h.form(value,{format:"presentation",lessonId:other.lessonId,version:"1",draftId:begun.id}))).error);
    assert.equal((await read(good.id,`lesson=${other.lessonId}`)).status,404);
    assert.equal((await read(foreign.id,`draft=${begun.id}`)).status,404);
    assert.equal((await read(crypto.randomUUID(),`lesson=${made.lessonId}`)).status,404);
    assert.ok((await lessons.updateLesson({},h.form(value,{format:"presentation",lessonId:made.lessonId,version:"0"}))).error);
    const reopened=await lessons.updateLesson({},h.form(value,{format:"presentation",lessonId:made.lessonId,version:"1"}));
    assert.equal(reopened.version,2,reopened.error);
    const confirmed=(await h.db.query("select * from forge_lessons where id=$1",[made.lessonId])).rows[0];
    const stale=structuredClone(value);stale.document.slides[0].elements=[];
    assert.ok((await lessons.updateLesson({},h.form(stale,{format:"presentation",lessonId:made.lessonId,version:"1"}))).error);
    assert.deepEqual((await h.db.query("select * from forge_lessons where id=$1",[made.lessonId])).rows[0],confirmed,"A well-formed stale save cannot remove current image references.");
    assert.equal((await h.db.query("select lesson_id from forge_presentation_drafts where id=$1",[begun.id])).rows[0].lesson_id,made.lessonId);
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,200);
    const pendingDraft=await a.beginPresentationDraft();
    faults.upload=true;assert.match((await upload(pendingDraft.id)).error,/not confirmed/);faults.upload=false;
    faults.ready=true;assert.match((await upload(pendingDraft.id)).error,/acknowledgement failed/);faults.ready=false;
    const pending=(await h.db.query("select * from forge_presentation_assets where draft_id=$1",[pendingDraft.id])).rows;
    assert.equal(pending.length,2);assert.ok(pending.every(row=>row.status==="pending"));
    for(const row of pending)assert.equal((await read(row.id,`draft=${pendingDraft.id}`)).status,404);
    const invalid=structuredClone(value);invalid.document.slides[0].elements[0].assetId=pending[0].id;
    assert.ok((await lessons.createManualLesson({},h.form(invalid,{format:"presentation",draftId:pendingDraft.id}))).error);
    const retained=blobs.size;await assets.cleanupPresentationAssets(h.owner);assert.equal(blobs.size,retained,"Unexpired failed reservations retained for retry/undo.");
    await h.db.query("update forge_presentation_drafts set expires_at=now()-interval '1 second' where id=$1",[pendingDraft.id]);
    assert.ok((await upload(pendingDraft.id)).error);
    faults.remove=true;await assert.rejects(()=>assets.cleanupPresentationAssets(h.owner),/cleanup failed/);faults.remove=false;
    assert.ok((await h.db.query("select status from forge_presentation_assets where draft_id=$1",[pendingDraft.id])).rows.every(row=>row.status==="deleting"));
    await assets.cleanupPresentationAssets(h.owner);
    assert.equal((await h.db.query("select * from forge_presentation_assets where draft_id=$1",[pendingDraft.id])).rows.length,0);
    await h.db.query("update forge_presentation_drafts set expires_at=now()-interval '1 second' where id=$1",[begun.id]);
    await assets.cleanupPresentationAssets(h.owner);
    assert.equal((await read(good.id,`lesson=${made.lessonId}`)).status,200,"Expiry cannot delete a linked image.");
    for(const role of ["anon","authenticated"]) {
      await h.db.exec(`set role ${role}`);
      try {
        for(const sql of ["select * from forge_presentation_assets","select * from forge_presentation_drafts",
          "delete from forge_presentation_assets","update forge_presentation_assets set status='ready'",
          `select forge_begin_presentation_draft('${h.owner}',null)`,
          `select * from forge_claim_presentation_cleanup('${h.owner}',true)`]) {
          await assert.rejects(()=>h.db.exec(sql),e=>e.code==="42501");
        }
      }finally{await h.db.exec("reset role");}
    }
    assert.equal((await h.db.query("select has_function_privilege('service_role','forge_claim_presentation_cleanup(uuid,boolean)','EXECUTE') allowed")).rows[0].allowed,true);
    const events=[];
    const profile=isolated("../src/app/profile/actions.ts",{
      "next/navigation":{redirect(location){throw Object.assign(new Error("synthetic redirect"),{location});}},
      zod:{z},"@/lib/supabase/server":{createClient:async()=>({auth:{
        getUser:async()=>({data:{user:{id:h.owner,email:"synthetic@example.test"}},error:null}),
        signInWithPassword:async()=>({data:{user:{id:h.owner}},error:null}),signOut:async()=>{events.push("signout");return {error:null};},
      }})},
      "@supabase/supabase-js":{createClient:()=>({auth:{admin:{deleteUser:async id=>{
        assert.equal(id,h.owner);events.push("delete");
        assert.equal((await h.db.query("select * from forge_presentation_assets where owner_id=$1",[id])).rows.length,0);
        return {data:{user:{id}},error:null};
      }}}})},
      sharp:{},"next/cache":{},"@/lib/public-config":{},"@/lib/eligibility":{},
      "@/lib/presentation-assets-server":assets,
    });
    const form=new FormData();form.set("confirm","on");form.set("password","synthetic-only");
    faults.remove=true;
    await assert.rejects(()=>profile.deleteAccount(form),e=>e.location?.includes("Could%20not%20confirm%20account%20deletion"));
    assert.deepEqual(events,[]);
    faults.remove=false;
    await assert.rejects(()=>profile.deleteAccount(form),e=>e.location?.startsWith("/login?success="));
    assert.deepEqual(events,["delete","signout"]);
    assert.equal((await h.db.query("select * from forge_presentation_assets where id=$1",[foreign.id])).rows.length,1,"Account cleanup leaves foreign assets intact.");
    h.state.user=null;const n=calls.length;
    assert.equal((await read(foreign.id,`draft=${foreignDraft.id}`)).status,404);assert.equal(calls.length,n);
  }finally{await h.db.close();}
});

test("independent mounted draft: image-inclusive toolbar OOXML, pixel geometry, real drag/keyboard history and responsive focus",async()=>{
  const browser=await chromium.launch();
  const context=await browser.newContext({offline:true,serviceWorkers:"block",viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[],requests=[],writes=[],downloads=[];
  const artifacts=await mkdtemp(join(tmpdir(),"forge-independent-presentation-"));
  const assetId=crypto.randomUUID(),value=author();
  const text=presentation.newText("中文 editable");
  Object.assign(text,{x:100,y:80,w:400,h:100,rotation:10});
  Object.assign(text.paragraphs[0].runs[0],{bold:true,color:"#cc0000",size:32});
  const shape={id:crypto.randomUUID(),type:"shape",shape:"rect",x:240,y:270,w:200,h:100,rotation:0,fill:"#ff0000",stroke:"#000000",strokeWidth:0};
  value.quiz=[{prompt:"QA_SECRET_QUIZ_PROMPT",options:["A","B","C","D"],correct:2},...draft(3).quiz.slice(1)];
  value.document.slides[0].elements=[text,shape,{id:crypto.randomUUID(),type:"image",assetId,alt:"Synthetic image",ratio:2,x:650,y:320,w:160,h:80,rotation:0}];
  const png=await sharp({create:{width:80,height:40,channels:3,background:"#0000ff"}}).png().toBuffer();
  try{
    page.on("pageerror",error=>errors.push(error.message));
    page.on("download",download=>downloads.push(download));
    await context.route("**/*",route=>{requests.push(route.request().url());return route.abort();});
    await page.route(/\/api\/presentation\/assets\//,route=>route.fulfill({contentType:"image/png",body:png}));
    await page.exposeFunction("persist",async(name,entries)=>{writes.push(entries);return {lessonId:crypto.randomUUID(),version:1,success:"Saved."};});
    await page.exposeFunction("images",async()=>({error:"Not used."}));
    await mountPresentation(page,{initial:value,lessonId:crypto.randomUUID(),version:1});
    await page.waitForFunction(()=>editCanvas.getObjects().length===3);
    // Measure rendered pixels, not merely canonical source coordinates.
    const pixels=await page.evaluate(()=>{
      editCanvas.renderAll();
      const c=editCanvas.lowerCanvasEl,ctx=c.getContext("2d"),data=ctx.getImageData(0,0,c.width,c.height).data;
      const xs=[],ys=[];
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
        const i=(y*c.width+x)*4;
        if(data[i]>240&&data[i+1]<10&&data[i+2]<10){xs.push(x);ys.push(y);}
      }
      return {width:c.width,height:c.height,zoom:editCanvas.getZoom(),red:xs.length?[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]:null};
    });
    assert.ok(pixels.red,"A visible native shape must be rendered.");
    assert.ok(Math.abs(pixels.red[0]/pixels.width-240/960)<.01,JSON.stringify(pixels));
    assert.ok(Math.abs(pixels.red[1]/pixels.height-270/540)<.01,JSON.stringify(pixels));
    await page.locator(".presentation-outline > summary").click();
    const checks=page.locator(".presentation-outline input[type=checkbox]");
    await checks.nth(1).check();
    const stage=page.getByRole("group",{name:/^Slide canvas/});
    await stage.focus();await page.keyboard.press("Shift+ArrowRight");
    await page.waitForFunction(()=>editCanvas.getObjects()[1].left===250);
    await page.keyboard.press("Control+z");
    await page.waitForFunction(()=>editCanvas.getObjects()[1].left===240);
    await page.keyboard.press("Control+y");
    await page.waitForFunction(()=>editCanvas.getObjects()[1].left===250);
    await checks.nth(1).check();
    const bounds=await page.locator(".presentation-editable .canvas-container").boundingBox(),zoom=await page.evaluate(()=>editCanvas.getZoom());
    await page.mouse.move(bounds.x+350*zoom,bounds.y+320*zoom);
    await page.mouse.down();await page.mouse.move(bounds.x+380*zoom,bounds.y+340*zoom,{steps:5});await page.mouse.up();
    await page.waitForFunction(()=>Math.abs(editCanvas.getObjects()[1].left-280)<2);
    await stage.focus();await page.keyboard.press("Control+z");
    await page.waitForFunction(()=>editCanvas.getObjects()[1].left===250);
    await page.keyboard.press("Control+y");
    await page.waitForFunction(()=>Math.abs(editCanvas.getObjects()[1].left-280)<2);
    // Unified undo/redo intentionally clears selection; select the object again.
    await checks.nth(1).check();
    await page.getByText("Alignment & layers",{exact:true}).click();
    await page.getByRole("button",{name:"Bring to front",exact:true}).click();
    await page.waitForFunction(id=>editCanvas.getObjects().at(-1).elementId===id,shape.id);
    const currentShape=await page.evaluate(()=>{const o=editCanvas.getObjects().at(-1);return {x:o.left,y:o.top};});
    const [download]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Export editable PPTX",exact:true}).click()]);
    const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
    const zip=await JSZip.loadAsync(Buffer.concat(chunks));
    const xml=await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml,/<a:t>中文 editable<\/a:t>/);assert.match(xml,/<a:rPr[^>]*b="1"/);
    assert.match(xml,/rot="600000"/);assert.match(xml,/<a:srgbClr val="CC0000"/);
    assert.match(xml,/<p:pic>/);assert.match(xml,/prst="rect"/);
    const native=await page.evaluate(xml=>{
      const doc=new DOMParser().parseFromString(xml,"application/xml");
      const items=[...doc.getElementsByTagNameNS("*","spTree")[0].children].filter(e=>["sp","pic"].includes(e.localName));
      const shape=items.at(-1),transform=shape.getElementsByTagNameNS("*","xfrm")[0];
      const off=transform.getElementsByTagNameNS("*","off")[0],ext=transform.getElementsByTagNameNS("*","ext")[0];
      return {order:items.map(e=>e.localName==="pic"?"image":e.getElementsByTagNameNS("*","t").length?"text":"shape"),
        x:Number(off.getAttribute("x")),y:Number(off.getAttribute("y")),w:Number(ext.getAttribute("cx")),h:Number(ext.getAttribute("cy"))};
    },xml);
    assert.deepEqual(native.order,["text","image","shape"],"Toolbar exports unsaved stacking changes; text also has rectangular geometry.");
    assert.ok(Math.abs(native.x-currentShape.x*12700)<=1);
    assert.ok(Math.abs(native.y-currentShape.y*12700)<=1);
    assert.equal(native.w,200*12700);assert.equal(native.h,100*12700);
    assert.equal(Object.keys(zip.files).filter(p=>/^ppt\/media\/.+\.png$/.test(p)).length,1);
    assert.doesNotMatch(xml,/QA_SECRET_QUIZ_PROMPT|correct|answer key/);assert.equal(writes.length,0);
    await page.screenshot({path:join(artifacts,"native1440.png"),fullPage:true});
    await page.setViewportSize({width:320,height:900});
    await checks.nth(0).uncheck();await checks.nth(1).uncheck();await checks.nth(2).uncheck();
    await checks.nth(0).focus();await page.keyboard.press("Space");
    assert.equal(await checks.nth(0).isChecked(),true);
    assert.equal(await checks.nth(0).evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(artifacts,"native320.png"),fullPage:true});
    await page.route(/\/api\/presentation\/assets\//,route=>route.fulfill({status:404,contentType:"application/json",body:'{"error":"Image unavailable."}'}));
    await page.getByRole("button",{name:"Export editable PPTX",exact:true}).click();
    await page.getByRole("alert").filter({hasText:"PPTX export was cancelled"}).waitFor();
    assert.equal(downloads.length,1,"Missing image must cancel, not download a partial PPTX.");
    assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
    console.log("Independent screenshot artifacts:",artifacts);
  }finally{await context.close();await browser.close();}
});
