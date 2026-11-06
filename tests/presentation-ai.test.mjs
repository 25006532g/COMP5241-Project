import test from "node:test";
import assert from "node:assert/strict";
import {z} from "zod";
import {load,presentation as model} from "./slide-authoring-harness.mjs";
import {OpenRouterError} from "../src/lib/openrouter-client.ts";
export const ai=load("../src/lib/presentation-ai.ts",{zod:{z},"./presentation":model});
export function fixture(){
  const author=model.blankPresentation();author.title="PRIVATE_TITLE";
  const first=author.document.slides[0];first.title="PRIVATE_SLIDE_LABEL";
  const box=model.newText("Beginner SDLC ");
  box.paragraphs[0].runs.push({...model.defaultRun,text:"requirements",bold:true,font:"Courier New",color:"#ff0000"});
  first.elements=[box,{id:crypto.randomUUID(),type:"image",assetId:crypto.randomUUID(),alt:"PRIVATE_ASSET_ALT",ratio:1,x:0,y:0,w:20,h:20,rotation:0}];
  const second=model.newSlide();second.elements=[model.newText("UNRELATED_TEACHING_TEXT")];author.document.slides.push(second);
  const scope={kind:"textbox",slideId:first.id,textboxId:box.id};
  const request=ai.aiRequestSchema.parse({requestId:crypto.randomUUID(),sourceToken:crypto.randomUUID(),scope,
    instruction:"Simplify SDLC for beginners",allowFormatting:false,consent:true,reference:ai.minimizedReference(author.document,scope,false)});
  const patch={explanation:"Simpler wording.",changes:[{slideId:first.id,textboxId:box.id,runs:[{paragraph:0,run:0,text:"Simple SDLC "}]}]};
  return {author,box,first,second,scope,request,patch};
}
test("minimal selected/current/multislide reference and rich-run atomic history",()=>{
  const {author,box,first,second,scope,request,patch}=fixture();
  assert.equal(ai.minimizedReference(author.document,{kind:"slide",slideId:first.id},false).length,1);
  assert.equal(ai.minimizedReference(author.document,{kind:"slides",slideIds:[first.id,second.id]},false).length,2);
  assert.doesNotMatch(JSON.stringify(request),/PRIVATE_|UNRELATED_|assetId|font|bold|color|quiz|audience/);
  const next=ai.applyAiPatch(author.document,request,patch),changed=next.slides[0].elements[0];
  assert.deepEqual(changed.paragraphs[0].runs[1],box.paragraphs[0].runs[1]);
  assert.deepEqual({...changed.paragraphs[0].runs[0],text:box.paragraphs[0].runs[0].text},box.paragraphs[0].runs[0]);
  assert.deepEqual(next.slides[0].elements[1],author.document.slides[0].elements[1]);
  assert.deepEqual(next.slides[1],second);
  const history=new model.PresentationHistory(author);history.commit({...author,document:next});
  assert.deepEqual(history.undo(),author);assert.equal(history.canUndo,false);assert.deepEqual(history.redo().document,next);
  const fingerprint=ai.sourceFingerprint(author.document,scope,"mount:1");
  assert.notEqual(ai.sourceFingerprint(next,scope,"mount:1"),fingerprint);
  assert.notEqual(ai.sourceFingerprint(author.document,scope,"mount:2"),fingerprint);
  const layout=structuredClone(author.document);layout.slides[0].elements[0].x++;
  assert.notEqual(ai.sourceFingerprint(layout,scope,"mount:1"),fingerprint);
  layout.slides[0].elements[0].x--;layout.slides[0].elements[0].paragraphs[0].runs[1].italic=true;
  assert.notEqual(ai.sourceFingerprint(layout,scope,"mount:1"),fingerprint);
});
test("patch and input bounds fail closed without changing original",()=>{
  const {author,request,patch,second}=fixture(),original=structuredClone(author);
  const edits=[
    {...patch,changes:[]},
    {...patch,changes:[...patch.changes,...patch.changes]},
    {...patch,changes:[{...patch.changes[0],textboxId:second.elements[0].id}]},
    {...patch,changes:[{...patch.changes[0],slideId:second.id}]},
    {...patch,changes:[{...patch.changes[0],runs:[{paragraph:0,run:9,text:"bad"}]}]},
    {...patch,changes:[{...patch.changes[0],runs:[...patch.changes[0].runs,...patch.changes[0].runs]}]},
    {...patch,changes:[{...patch.changes[0],fontSize:20}]},
    {...patch,changes:[{...patch.changes[0],align:"center"}]},
    {...patch,changes:[{...patch.changes[0],x:50}]},
    {...patch,changes:[{...patch.changes[0],font:"Arial"}]},
    {...patch,changes:[{...patch.changes[0],runs:[{paragraph:0,run:0,text:"New\nparagraph"}]}]},
    {...patch,changes:[{...patch.changes[0],runs:[]}]},
    {...patch,changes:[{...patch.changes[0],runs:[{paragraph:0,run:0,text:"x".repeat(10000)}]}]},
  ];
  for(const p of edits)assert.throws(()=>ai.applyAiPatch(author.document,request,p));
  assert.deepEqual(author,original);
  for(const r of [
    {...request,instruction:"x".repeat(2001)},{...request,consent:false},
    {...request,reference:[...request.reference,...request.reference]},
    {...request,scope:{kind:"slide",slideId:second.id}},
    {...request,reference:[{...request.reference[0],alt:"secret"}]},
  ])assert.equal(ai.aiRequestSchema.safeParse(r).success,false);
  const formatting={...request,allowFormatting:true,reference:ai.minimizedReference(author.document,request.scope,true)};
  const styled={...patch,changes:[{...patch.changes[0],fontSize:18,align:"center"}]};
  assert.equal(ai.applyAiPatch(author.document,formatting,styled).slides[0].elements[0].paragraphs[0].runs[1].size,18);
  for(const size of [7,121])assert.throws(()=>ai.validateAiPatch({...styled,changes:[{...styled.changes[0],fontSize:size}]},formatting));
  assert.throws(()=>ai.validateAiPatch({...styled,changes:[{...styled.changes[0],align:"justify"}]},formatting));
  const long=fixture();long.box.paragraphs[0].runs=[{...model.defaultRun,text:"x".repeat(10001)}];
  assert.equal(ai.aiRequestSchema.safeParse({...long.request,reference:ai.minimizedReference(long.author.document,long.scope,false)}).success,false);
  const large=fixture();large.first.elements.push(model.newText("x".repeat(10000)),model.newText("x".repeat(10000)));
  const scope={kind:"slide",slideId:large.first.id};
  assert.equal(ai.aiRequestSchema.safeParse({...large.request,scope,reference:ai.minimizedReference(large.author.document,scope,false)}).success,false);
  const runHeavy=fixture();runHeavy.box.paragraphs=Array.from({length:3},()=>({runs:Array.from({length:700},()=>({...model.defaultRun,text:"x"}))}));
  assert.equal(ai.aiRequestSchema.safeParse({...runHeavy.request,reference:ai.minimizedReference(runHeavy.author.document,runHeavy.scope,false)}).success,false);
  const serialized=fixture();serialized.box.paragraphs[0].runs=[{...model.defaultRun,text:'"'.repeat(10000)}];
  assert.equal(ai.aiRequestSchema.safeParse({...serialized.request,reference:ai.minimizedReference(serialized.author.document,serialized.scope,false)}).success,true);
  const noText=fixture();noText.box.paragraphs[0].runs.forEach(r=>r.text="");
  assert.equal(ai.aiRequestSchema.safeParse({...noText.request,reference:ai.minimizedReference(noText.author.document,noText.scope,false)}).success,false);
  const tooMany=fixture();tooMany.first.elements=Array.from({length:100},()=>({
    ...model.newText(),paragraphs:[{runs:Array.from({length:20},()=>({...model.defaultRun,size:120,text:'"'.repeat(10)}))}],
  }));
  const all={kind:"slide",slideId:tooMany.first.id},reference=ai.minimizedReference(tooMany.author.document,all,true);
  const bounded={...tooMany.request,scope:all,reference,allowFormatting:true};
  assert.ok(JSON.stringify(bounded).length>100000);assert.equal(ai.aiRequestSchema.safeParse(bounded).success,false);
});

function serverFixture(){
  const f=fixture(),permissions=load("../src/lib/permissions.ts",{}),eligibility=load("../src/lib/eligibility.ts",{});
  const s={user:{id:crypto.randomUUID(),app_metadata:{ai_access:true}},age:22,claims:0,calls:[],quota:true,quotaError:false,editable:true,version:1,late:null};
  const database=()=>({
    from(){assert.fail("Presentation AI authorization must never read profiles");},
    async rpc(name,args){assert.equal(name,"forge_claim_coach_request");assert.equal(args.request_user,s.user.id);s.claims++;return {data:s.quota,error:s.quotaError};},
  });
  const learningServer={...permissions,database,currentUser:async()=>{if(!s.user)throw new Error("PRIVATE_AUTH");return s.user;},
    accessibleLesson:async(id,user,review)=>{assert.equal(review,true);return s.editable?{id,owner_id:s.lessonOwner??user.id,visibility:s.visibility??"private",review_requested:s.reviewRequested??false,version:s.version}:null;}};
  const eligible=load("../src/lib/ai-eligibility-server.ts",{"server-only":{},"@/lib/learning-server":learningServer,"@/lib/eligibility":eligibility});
  const server=load("../src/lib/presentation-ai-server.ts",{"server-only":{},zod:{z},"@/lib/presentation-ai":ai,
    "@/lib/learning-server":learningServer,"@/lib/ai-eligibility-server":eligible,
    "@/lib/openrouter-client":{OpenRouterError,configuredFreeModels:()=>["test/model:free"],completion:async(messages,schema)=>{
      s.calls.push({messages,schema});if(s.late)await s.late();if(s.failure)throw s.failure;
      return s.output??JSON.stringify(f.patch);
    }},
  });
  return {...f,s,server};
}
test("real action gates, shared quota and minimized JSON completion; zero lesson writes",async()=>{
  const key=process.env.OPENROUTER_API_KEY;process.env.OPENROUTER_API_KEY="offline-fixture";
  try{
    const f=serverFixture(),result=await f.server.generateAiSuggestions(f.request);
    assert.ok(result.patch);assert.equal(result.binding.userId,f.s.user.id);assert.equal(f.s.claims,1);assert.equal(f.s.calls.length,1);
    const payload=f.s.calls[0];assert.ok(payload.schema.properties.changes);
    assert.doesNotMatch(payload.messages[1].content,/PRIVATE_|UNRELATED_|quiz|asset|lessonId|sourceToken|requestId|audience|userId/);
    assert.deepEqual(await f.server.checkAiApply(result.binding),{});assert.equal(f.s.claims,1);assert.equal(f.s.calls.length,1);
    for(const age of [13,17,18,120,null,undefined]){
      const approved=serverFixture();approved.s.age=age;approved.s.user.user_metadata={age};
      const generated=await approved.server.generateAiSuggestions(approved.request);
      assert.ok(generated.patch);assert.deepEqual(await approved.server.checkAiApply(generated.binding),{});
      approved.s.user.app_metadata.ai_access=false;
      assert.match((await approved.server.checkAiApply(generated.binding)).error,/^External AI requires administrator-approved AI access\.$/);
      assert.equal(approved.s.calls.length,1);assert.equal(approved.s.claims,1);
    }
    for(const mutate of [
      f=>{f.s.user=null;},
      f=>{f.s.user.app_metadata={};},f=>{f.s.user.app_metadata={ai_access:"true"};},f=>{f.s.user.app_metadata={};f.s.user.user_metadata={ai_access:true};},
      f=>{f.request.instruction="   ";},
      f=>{f.request.consent=false;},f=>{f.request.instruction="x".repeat(2001);},
      f=>{f.request.reference[0].id=crypto.randomUUID();},f=>{f.request.reference=[];},
      f=>{f.request.lessonId=crypto.randomUUID();f.request.version=1;f.s.editable=false;},
      f=>{f.request.lessonId=crypto.randomUUID();f.request.version=1;f.s.lessonOwner=crypto.randomUUID();},
      f=>{f.request.lessonId=crypto.randomUUID();f.request.version=1;f.s.visibility="public";},
      f=>{f.request.lessonId=crypto.randomUUID();f.request.version=2;},
    ]){
      const denied=serverFixture();mutate(denied);
      assert.ok((await denied.server.generateAiSuggestions(denied.request)).error);assert.equal(denied.s.claims,0);assert.equal(denied.s.calls.length,0);
    }
    for(const quota of [false,"true"]){const f=serverFixture();f.s.quota=quota;assert.match((await f.server.generateAiSuggestions(f.request)).error,/limit/);assert.equal(f.s.calls.length,0);}
    const q=serverFixture();q.s.quotaError=true;assert.match((await q.server.generateAiSuggestions(q.request)).error,/quota/);assert.equal(q.s.calls.length,0);
    for(const visibility of ["public","private"]){
      const admin=serverFixture();admin.s.user.app_metadata.role="admin";admin.s.lessonOwner=crypto.randomUUID();admin.s.visibility=visibility;admin.s.reviewRequested=visibility==="private";
      admin.request.lessonId=crypto.randomUUID();admin.request.version=1;
      assert.ok((await admin.server.generateAiSuggestions(admin.request)).patch);
    }
    const instructor=serverFixture();instructor.s.user.app_metadata.role="instructor";instructor.s.visibility="public";
    instructor.request.lessonId=crypto.randomUUID();instructor.request.version=1;
    assert.ok((await instructor.server.generateAiSuggestions(instructor.request)).patch);
    delete process.env.OPENROUTER_API_KEY;
    const missing=serverFixture();assert.match((await missing.server.generateAiSuggestions(missing.request)).error,/key is missing/);assert.equal(missing.s.claims,0);
  }finally{if(key===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=key;}
});
test("late session/rights/version denial, invalid/truncated output and safe provider errors",async()=>{
  process.env.OPEN_ROUTER_API_KEY="offline-fixture";
  try{
    for(const mutate of [
      f=>{f.s.user={...f.s.user,id:crypto.randomUUID()};},
      f=>{f.s.user=null;},f=>{f.s.user.app_metadata.ai_access=false;},
      f=>{f.s.editable=false;},f=>{f.s.version=2;},
      f=>{f.s.lessonOwner=crypto.randomUUID();},
    ]){
      const f=serverFixture();f.request.lessonId=crypto.randomUUID();f.request.version=1;f.s.late=()=>mutate(f);
      const result=await f.server.generateAiSuggestions(f.request);assert.ok(result.error);assert.equal(f.s.calls.length,1);assert.equal(f.s.claims,1);
    }
    for(const output of ['{"changes":',"not json",JSON.stringify({explanation:"none",changes:[]}),"x".repeat(160001)]){
      const f=serverFixture();f.s.output=output;assert.match((await f.server.generateAiSuggestions(f.request)).error,/invalid/);
    }
    const f=serverFixture();f.s.failure=new Error("PRIVATE_TEACHING_PROVIDER_BODY");
    assert.doesNotMatch((await f.server.generateAiSuggestions(f.request)).error,/PRIVATE/);
    f.s.failure=new OpenRouterError("The AI request timed out.");assert.match((await f.server.generateAiSuggestions(f.request)).error,/timed out/);
    const apply=serverFixture(),suggestions=await apply.server.generateAiSuggestions(apply.request);
    apply.s.user.id=crypto.randomUUID();assert.match((await apply.server.checkAiApply(suggestions.binding)).error,/session changed/);
  }finally{delete process.env.OPEN_ROUTER_API_KEY;}
});
