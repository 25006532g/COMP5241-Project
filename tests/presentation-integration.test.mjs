import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import * as jsx from "react/jsx-runtime";
import {renderToStaticMarkup} from "react-dom/server";
import {z} from "zod";
import {harness,load,presentation,learning,slides,curriculum,resume,draft} from "./slide-authoring-harness.mjs";

test("native 30-slide resume, safe learner DTO, quiz/report compatibility and text-only coach payload",async()=>{
  const h=await harness();
  try{
    const author=presentation.blankPresentation();author.title="Thirty native slides";
    author.document.slides=Array.from({length:30},(_,i)=>({...presentation.newSlide(),title:`Slide ${i+1}`,elements:[presentation.newText(`Teaching text ${i+1}`)]}));
    author.quiz=draft(3).quiz;
    const made=await h.actions.createManualLesson({},h.form(author,{format:"presentation",intent:"publish"}));
    assert.ok(made.lessonId,made.error);
    await h.db.query("insert into forge_enrollments(user_id,lesson_id,progress_evidence) values($1,$2,'{\"1\":{\"attended_at\":\"2026-11-05T00:00:00Z\"}}')",[h.owner,made.lessonId]);
    const state={stage:"slides",slide:29,ordering:[2,1,0],answers:[-1,-1,-1]};
    assert.equal((await h.actions.saveResume(made.lessonId,1,0,state)).revision,1);
    assert.ok((await h.actions.saveResume(made.lessonId,1,1,{...state,slide:30})).error);
    const storedResume=(await h.db.query("select * from forge_resume where lesson_id=$1",[made.lessonId])).rows[0];
    assert.equal(storedResume.slide_count,30);assert.equal(storedResume.lesson_format,"presentation");
    await assert.rejects(()=>h.db.query("update forge_resume set lesson_format='legacy' where lesson_id=$1",[made.lessonId]),e=>e.code==="23514");
    const legacy=await h.actions.createManualLesson({},h.form(draft()));
    await h.db.query("insert into forge_enrollments(user_id,lesson_id) values($1,$2)",[h.owner,legacy.lessonId]);
    assert.ok((await h.actions.saveResume(legacy.lessonId,1,0,{...state,answers:[],slide:6})).error);
    const quiz=await h.actions.submitQuiz(made.lessonId,1,[0,0,1]);assert.equal(quiz.score,2);assert.ok(quiz.attemptId);
    const attempt=(await h.db.query("select * from forge_attempts where id=$1",[quiz.attemptId])).rows[0];
    assert.equal(attempt.lesson_template,"slides");assert.deepEqual(learning.attemptOutcome(attempt),{total:3,passed:true});
    let player;
    const server={...h.server,requireUser:async()=>h.state.user,displayName:async()=>"Synthetic"};
    const route=load("../src/app/courses/[slug]/lessons/[lesson]/page.tsx",{
      "react/jsx-runtime":jsx,"next/link":{__esModule:true,default:"a"},
      "next/navigation":{notFound(){throw new Error("Not found");},redirect(){throw new Error("Redirect");}},
      "@/components/learner-shell":{LearnerShell:({children})=>React.createElement("main",{},children)},
      "@/components/learning-controls":{LessonPlayer:props=>{player=props;return null;}},
      "@/components/lesson-coach":{LessonCoach:()=>null},"@/components/lesson-metadata":{LessonMetadata:()=>null},
      "@/lib/curriculum":curriculum,"@/lib/learning-server":server,"@/lib/resume":resume,"@/lib/learning":learning,
    }).default;
    renderToStaticMarkup(await route({params:Promise.resolve({slug:made.lessonId,lesson:"1"})}));
    assert.equal(player.saved.slide,29);assert.equal(player.content.slides.length,30);
    assert.ok(player.content.questions.every(q=>Object.keys(q).sort().join()==="options,prompt"));
    let reference,completionMessages;
    const realCoach=load("../src/lib/openrouter.ts",{
      "server-only":{},zod:{z},"@/lib/learning":learning,"@/lib/curriculum":curriculum,
      "@/lib/openrouter-client":{completion:async messages=>{completionMessages=messages;return "Synthetic reply";}},
    }).coachReply;
    const coaching=load("../src/app/learning/actions.ts",{
      "next/cache":{revalidatePath(){}},zod:{z},
      "@/lib/learning-server":{...server,database:()=>({...server.database(),rpc:async()=>({data:true,error:null})})},
      "@/lib/learning":learning,"@/lib/resume":resume,"@/lib/curriculum":curriculum,"@/lib/slide-lesson":slides,
      "@/lib/openrouter":{coachReply:async(data,messages)=>{reference=data;return realCoach(data,messages);}},
      "@/lib/lesson-generation-server":{},"@/lib/ai-eligibility-server":{requireAiAccess:async()=>{}},
    });
    assert.equal((await coaching.askCoach(made.lessonId,[{role:"user",content:"Explain this lesson."}])).reply,"Synthetic reply");
    assert.equal(reference.slides.length,30);assert.match(JSON.stringify(reference),/Teaching text 30/);
    assert.doesNotMatch(JSON.stringify(reference),/assetId|base64|correct|explanation|questions|paragraphs/);
    assert.match(completionMessages[1].content,/Teaching text 30/);
    assert.doesNotMatch(completionMessages[1].content,/assetId|base64|correct|explanation|questions|paragraphs/);
    await assert.rejects(()=>realCoach({...reference,slides:Array.from({length:30},()=>({title:"Large",body:"x".repeat(10000)}))},[{role:"user",content:"Explain"}]),/valid lesson slides/);
    const safe=learning.coachSlides({...player.content,questions:[],slides:[{...author.document.slides[0],elements:[
      {id:crypto.randomUUID(),type:"image",assetId:crypto.randomUUID(),alt:"Accessible diagram",ratio:1,x:0,y:0,w:1,h:1,rotation:0},
    ]}]});
    assert.deepEqual(safe,[{title:"Slide 1",body:"Image: Accessible diagram"}]);
  }finally{await h.db.close();}
});
