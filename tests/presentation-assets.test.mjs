import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import sharp from "sharp";
import {z} from "zod";
import {harness,load,presentation,learning} from "./slide-authoring-harness.mjs";
import * as imageTools from "../src/lib/presentation-images.ts";
const {NextResponse}=createRequire(import.meta.url)("next/server");

test("actual image actions/reader authorize lesson/draft, sanitize, preserve undo and retry cleanup (PGlite + in-memory blobs)",async()=>{
  const h=await harness(),blobs=new Map(),storageCalls=[];
  let removeFailure=false;
  const client={
    ...h.server.database(),
    async rpc(name,args){
      assert.match(name,/^forge_[a-z_]+$/);
      try{return {data:(await h.db.query(`select * from ${name}(${Object.keys(args).map((k,i)=>`${k}=>$${i+1}`).join(",")})`,Object.values(args))).rows.map(row=>Object.values(row).length===1?Object.values(row)[0]:row),error:null};}
      catch(error){return {data:null,error:{code:error.code}};}
    },
    storage:{from(bucket){assert.equal(bucket,"forge-presentation-images");return{
      async upload(path,data){storageCalls.push(["upload",path]);blobs.set(path,Buffer.from(data));return {error:null};},
      async download(path){storageCalls.push(["download",path]);return {data:blobs.has(path)?new Blob([blobs.get(path)],{type:"image/png"}):null,error:null};},
      async remove(paths){storageCalls.push(["remove",...paths]);if(removeFailure)return {error:{message:"PRIVATE"}};paths.forEach(p=>blobs.delete(p));return {error:null};},
    };}},
  };
  // Supabase scalar RPC returns a scalar, set-returning cleanup returns rows.
  const rpc=client.rpc.bind(client);client.rpc=async(name,args)=>{const r=await rpc(name,args);if(name!=="forge_claim_presentation_cleanup")r.data=r.data?.[0]??null;return r;};
  const server={...h.server,database:()=>client};
  const assets=load("../src/lib/presentation-assets-server.ts",{"server-only":{},zod:{z},"./learning-server":server,"./presentation":presentation,"./learning":learning});
  const actions=load("../src/app/presentation/actions.ts",{zod:{z},"@/lib/learning-server":server,"@/lib/presentation-assets-server":assets,"@/lib/presentation-images":imageTools});
  const route=load("../src/app/api/presentation/assets/[id]/route.ts",{"next/server":{NextResponse},"@/lib/presentation-assets-server":assets,"@/lib/learning-server":server});
  try{
    const begun=await actions.beginPresentationDraft();assert.ok(begun.id);
    const original=await sharp({create:{width:120,height:60,channels:3,background:"#ff0000"}}).withMetadata().jpeg().toBuffer();
    const form=new FormData();form.set("draftId",begun.id);form.set("image",new File([original],"private-location.jpg",{type:"image/jpeg"}));
    const upload=await actions.uploadPresentationImage(form);assert.ok(upload.id,upload.error);assert.equal(upload.width,120);assert.equal(upload.height,60);
    assert.equal(blobs.size,1);const sanitized=await sharp([...blobs.values()][0]).metadata();assert.equal(sanitized.exif,undefined);assert.equal(sanitized.format,"png");
    const read=async scope=>route.GET(new Request(`https://forge.test/api/presentation/assets/${upload.id}?${scope}`),{params:Promise.resolve({id:upload.id})});
    assert.equal((await read(`draft=${begun.id}`)).status,200);
    h.state.user.id=h.other;
    const foreignCalls=storageCalls.length;
    assert.match((await actions.uploadPresentationImage(form)).error,/unavailable/);
    assert.equal((await read(`draft=${begun.id}`)).status,404);assert.equal(storageCalls.length,foreignCalls);
    h.state.user.id=h.owner;
    const author=presentation.blankPresentation();author.title="Private image lesson";
    author.document.slides[0].elements.push({id:crypto.randomUUID(),type:"image",assetId:upload.id,alt:"Diagram",ratio:2,x:40,y:40,w:400,h:200,rotation:0});
    const saved=await h.actions.createManualLesson({},h.form(author,{format:"presentation",draftId:begun.id}));
    assert.ok(saved.lessonId,saved.error);
    assert.equal((await read(`lesson=${saved.lessonId}`)).status,200);
    h.state.user.id=h.other;
    assert.equal((await read(`lesson=${saved.lessonId}`)).status,404);
    h.state.user.app_metadata={role:"admin"};
    assert.equal((await read(`lesson=${saved.lessonId}`)).status,404,"admin cannot read private unsubmitted lesson");
    await h.db.query("update forge_lessons set review_requested=true where id=$1",[saved.lessonId]);
    assert.equal((await read(`lesson=${saved.lessonId}`)).status,200);
    h.state.user.id=h.owner;h.state.user.app_metadata={};
    const removed=structuredClone(author);removed.document.slides[0].elements=[];
    const second=await h.actions.updateLesson({},h.form(removed,{format:"presentation",draftId:begun.id,lessonId:saved.lessonId,version:"1"}));
    assert.equal(second.version,2,second.error);
    assert.equal((await read(`lesson=${saved.lessonId}`)).status,404,"learner endpoint never returns unreferenced images");
    assert.equal((await read(`draft=${begun.id}`)).status,200,"undo image remains authorized to active editor");
    const restored=await h.actions.updateLesson({},h.form(author,{format:"presentation",draftId:begun.id,lessonId:saved.lessonId,version:"2"}));
    assert.equal(restored.version,3,restored.error);
    const reopened=await h.actions.updateLesson({},h.form(author,{format:"presentation",lessonId:saved.lessonId,version:"3"}));
    assert.equal(reopened.version,4,reopened.error??"Reopened image lessons must save without starting another upload draft.");
    const foreignDraftless=await h.actions.createManualLesson({},h.form(author,{format:"presentation"}));
    assert.ok(foreignDraftless.error,"A new lesson cannot reuse an image without an authorized draft.");
    const bad=structuredClone(author);bad.document.slides[0].elements[0].ratio=3;
    const storedLesson=await h.server.accessibleLesson(saved.lessonId,h.state.user);
    await assert.rejects(()=>assets.validatePresentationAssets(bad.document,begun.id,h.state.user,storedLesson),/dimensions/);
    const discarded=await actions.discardPresentationDraft(begun.id);assert.ok(discarded.success,discarded.error);
    assert.equal(blobs.size,1,"discard must preserve saved reference");
    await h.db.query("delete from forge_lessons where id=$1",[saved.lessonId]);
    removeFailure=true;
    await assert.rejects(()=>assets.cleanupPresentationAssets(h.owner),/cleanup failed/);
    assert.equal((await h.db.query("select status from forge_presentation_assets where id=$1",[upload.id])).rows[0].status,"deleting");
    removeFailure=false;await assets.cleanupPresentationAssets(h.owner);assert.equal(blobs.size,0);
    assert.equal((await h.db.query("select * from forge_presentation_assets")).rows.length,0);
    h.state.user=null;const calls=storageCalls.length;assert.equal((await read(`draft=${begun.id}`)).status,404);assert.equal(storageCalls.length,calls);
  }finally{await h.db.close();}
});
