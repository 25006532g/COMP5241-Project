import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {load,learning,curriculum,slides,resume} from "./slide-authoring-harness.mjs";

function coachFixture(){
  const state={user:{id:randomUUID(),app_metadata:{ai_access:true}},quota:true,enrolled:true,calls:0,claims:0,after:null};
  const server={
    ...load("../src/lib/permissions.ts",{}),
    currentUser:async()=>{if(!state.user)throw new Error("Log in again.");return state.user;},
    enrolledLesson:async()=>{
      if(!state.enrolled)throw new Error("Enroll first.");
      return {subject:"Software Development Life Cycle",content:{subject:"Software Development Life Cycle",slides:[{title:"Requirements",body:"Write testable requirements."}]}};
    },
    database:()=>({
      from(){assert.fail("Coach AI must not look up profile age");},
      rpc:async(name,args)=>{assert.equal(name,"forge_claim_coach_request");assert.equal(args.request_user,state.user.id);state.claims++;return {data:state.quota,error:null};},
    }),
  };
  const guard=load("../src/lib/ai-eligibility-server.ts",{"server-only":{},"@/lib/eligibility":load("../src/lib/eligibility.ts",{})});
  const actions=load("../src/app/learning/actions.ts",{
    "next/cache":{revalidatePath(){}},zod:{z},"@/lib/learning-server":server,
    "@/lib/learning":learning,"@/lib/curriculum":curriculum,"@/lib/slide-lesson":slides,"@/lib/resume":resume,
    "@/lib/lesson-generation-server":{},"@/lib/ai-eligibility-server":guard,
    "@/lib/openrouter":{coachReply:async()=>{state.calls++;if(state.after)state.after();return "Review your requirements.";}},
  });
  return {state,ask:history=>actions.askCoach(randomUUID(),history??[{role:"user",content:"Explain requirements."}])};
}
test("real coach permits approved ages/missing age; denies spoof, invalid history, enrollment and quota before inference",async()=>{
  for(const age of [13,17,18,120,null,undefined]){
    const h=coachFixture();h.state.user.user_metadata={age};
    assert.ok((await h.ask()).reply);assert.equal(h.state.calls,1);assert.equal(h.state.claims,1);
  }
  for(const grant of [false,undefined,"true"]){
    const h=coachFixture();h.state.user.app_metadata.ai_access=grant;h.state.user.user_metadata={ai_access:true};
    assert.match((await h.ask()).error,/administrator-approved AI access/);
    assert.equal(h.state.calls,0);assert.equal(h.state.claims,0);
  }
  const unenrolled=coachFixture();unenrolled.state.enrolled=false;assert.match((await unenrolled.ask()).error,/Enroll/);
  assert.equal(unenrolled.state.calls,0);assert.equal(unenrolled.state.claims,0);
  const invalid=coachFixture();assert.ok((await invalid.ask([{role:"user",content:" "}])).error);assert.equal(invalid.state.calls,0);
  const quota=coachFixture();quota.state.quota=false;assert.match((await quota.ask()).error,/quota/);assert.equal(quota.state.calls,0);
});
test("real coach rechecks revoked approval, lost session and switched approved owner after inference",async()=>{
  for(const mutate of [
    h=>{h.state.user.app_metadata.ai_access=false;},
    h=>{h.state.user=null;},
    h=>{h.state.user={id:randomUUID(),app_metadata:{ai_access:true}};},
  ]){
    const h=coachFixture();h.state.after=()=>mutate(h);
    const result=await h.ask();assert.ok(result.error);assert.equal(result.reply,undefined);
    assert.equal(h.state.calls,1);assert.equal(h.state.claims,1);
  }
});
