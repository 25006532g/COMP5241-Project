import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {z} from "zod";
const m={exports:{}};
new Function("require","module","exports",ts.transpileModule(readFileSync("src/lib/presentation.ts","utf8"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText)(()=>({z}),m,m.exports);
export const model=m.exports;
test("canonical model bounds, IDs, image references, legacy adapter and coalesced document history",()=>{
  const {blankPresentation,presentationSchema,newText,newSlide,duplicateSlide,PresentationHistory,legacyPresentation}=model;
  const doc=blankPresentation().document;
  doc.slides[0].elements.push(newText("中文\nRich text"));
  assert.ok(presentationSchema.safeParse(doc).success);
  for(const change of [
    d=>d.slides.push(d.slides[0]), d=>d.slides[0].elements[0].x=961,
    d=>d.slides[0].elements[0].paragraphs[0].runs[0].font="Unrestricted",
    d=>d.slides[0].elements.push({...d.slides[0].elements[0],id:crypto.randomUUID(),type:"image",assetId:"data:image/png;base64,huge"}),
    d=>d.slides=Array.from({length:31},newSlide),
    d=>d.slides[0].elements=Array.from({length:101},()=>newText()),
  ]) {const invalid=structuredClone(doc);change(invalid);assert.equal(presentationSchema.safeParse(invalid).success,false);}
  const copy=duplicateSlide(doc.slides[0]);assert.notEqual(copy.id,doc.slides[0].id);assert.notEqual(copy.elements[0].id,doc.slides[0].elements[0].id);
  const history=new PresentationHistory(doc);
  const typed=structuredClone(doc);typed.slides[0].title="Typing";history.commit(typed,"typing",10);
  typed.slides[0].title="Typing again";history.commit(typed,"typing",100);
  assert.deepEqual(history.undo(),doc);assert.equal(history.redo().slides[0].title,"Typing again");
  typed.slides.push(newSlide());history.commit(typed);assert.equal(history.undo().slides.length,1);
  const legacy={title:"Legacy",audience:"learners",difficulty:"foundation",slides:[{title:"Title",body:"Body"}],quiz:[]};
  assert.equal(legacyPresentation(legacy).document.slides[0].elements.length,2);
  assert.deepEqual(legacy.slides,[{title:"Title",body:"Body"}]);
});

test("rotated bounds, immutable image ratio, app-owned JSON and 50-entry history are enforced",()=>{
  const {blankPresentation,presentationSchema,newText,PresentationHistory}=model;
  const doc=blankPresentation().document;
  doc.slides[0].elements=[{...newText(),x:300,y:246,w:200,h:200,rotation:45}];
  assert.ok(presentationSchema.safeParse(doc).success);
  const outside=structuredClone(doc);outside.slides[0].elements[0].y+=12;
  assert.equal(presentationSchema.safeParse(outside).success,false);
  const image={id:crypto.randomUUID(),type:"image",assetId:crypto.randomUUID(),alt:"Diagram",ratio:2,x:40,y:40,w:200,h:100,rotation:0};
  doc.slides[0].elements=[image];
  assert.ok(presentationSchema.safeParse(doc).success);
  for(const patch of [{h:120},{alt:""},{assetId:"https://example.test/image.png"},{src:"data:image/png;base64,private"}]){
    const invalid=structuredClone(doc);Object.assign(invalid.slides[0].elements[0],patch);
    assert.equal(presentationSchema.safeParse(invalid).success,false);
  }
  const history=new PresentationHistory({value:0});
  for(let i=1;i<=60;i++)history.commit({value:i});
  let count=0;while(history.undo())count++;
  assert.equal(count,50);assert.equal(history.value.value,10);
  history.commit({value:100});assert.equal(history.canRedo,false);
});
