import {z} from "zod";
import {presentationSchema,textOf,type Presentation,type TextElement} from "./presentation";

const id=z.uuid();
const text=z.string().max(10000).refine(t=>!/[\u0000-\u0008\u000b-\u001f]/u.test(t));
export const aiScopeSchema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("textbox"),slideId:id,textboxId:id}).strict(),
  z.object({kind:z.literal("slide"),slideId:id}).strict(),
  z.object({kind:z.literal("slides"),slideIds:z.array(id).min(1).max(30)}).strict(),
]);
const referenceSchema=z.object({
  slideId:id,id,type:z.literal("text"),
  paragraphs:z.array(z.object({runs:z.array(z.object({text,size:z.number().min(8).max(120).optional()}).strict()).min(1).max(1000)}).strict()).min(1).max(100),
  align:z.enum(["left","center","right"]).optional(),
}).strict();
export const aiRequestSchema=z.object({
  requestId:id,sourceToken:id,lessonId:id.optional(),version:z.number().int().positive().optional(),
  scope:aiScopeSchema,instruction:z.string().trim().min(1).max(2000),
  allowFormatting:z.boolean(),consent:z.literal(true),
  reference:z.array(referenceSchema).min(1).max(100),
}).strict().superRefine((r,ctx)=>{
  const fail=(message:string)=>ctx.addIssue({code:"custom",message});
  if(Boolean(r.lessonId)!==Boolean(r.version))fail("Saved lesson ID and version must be supplied together.");
  const slides=r.scope.kind==="slides"?r.scope.slideIds:[r.scope.slideId];
  if(new Set(slides).size!==slides.length)fail("Selected slide IDs must be unique.");
  const ids=[...slides,...r.reference.map(e=>e.id)];
  if(new Set(ids).size!==ids.length)fail("Reference IDs must be unique.");
  if(r.reference.some(e=>!slides.includes(e.slideId)||r.scope.kind==="textbox"&&e.id!==r.scope.textboxId))fail("Textbox is outside the requested scope.");
  if(r.scope.kind==="textbox"&&r.reference.length!==1)fail("Select one textbox.");
  if(r.reference.some(e=>textOf(e).length>10000))fail("A textbox supports at most 10,000 characters.");
  const chars=r.reference.reduce((n,e)=>n+textOf(e).length,0);
  const runs=r.reference.reduce((n,e)=>n+e.paragraphs.reduce((n,p)=>n+p.runs.length,0),0);
  if(!r.reference.some(e=>textOf(e).trim()))fail("The scope has no teaching text. Select a textbox or narrower text-containing slides.");
  if(chars>20000||runs>2000||JSON.stringify(r).length>100000)fail("Selection is too large (20,000 text characters, 100 textboxes, 2,000 runs, 100,000 serialized characters). Select a narrower scope; nothing is clipped.");
  if(!r.allowFormatting&&r.reference.some(e=>e.align!==undefined||e.paragraphs.some(p=>p.runs.some(r=>r.size!==undefined))))fail("Formatting reference is not permitted.");
});
export const aiPatchSchema=z.object({
  explanation:z.string().trim().min(1).max(1000),
  changes:z.array(z.object({
    slideId:id,textboxId:id,
    runs:z.array(z.object({paragraph:z.number().int().min(0).max(99),run:z.number().int().min(0).max(999),text}).strict()).max(2000),
    fontSize:z.number().min(8).max(120).optional(),align:z.enum(["left","center","right"]).optional(),
  }).strict()).min(1).max(100),
}).strict();
export type AiScope=z.infer<typeof aiScopeSchema>;
export type AiRequest=z.infer<typeof aiRequestSchema>;
export type AiPatch=z.infer<typeof aiPatchSchema>;
export type AiBinding={requestId:string;sourceToken:string;userId:string;lessonId?:string;version?:number};
export type AiResult={error:string}|{patch:AiPatch;binding:AiBinding};
export type AiSnapshot={request:AiRequest;fingerprint:string};

export function scopeTextboxes(doc:Presentation,scope:AiScope):{slideId:string;element:TextElement}[]{
  aiScopeSchema.parse(scope);
  const slideIds=scope.kind==="slides"?scope.slideIds:[scope.slideId];
  if(new Set(slideIds).size!==slideIds.length||slideIds.some(id=>!doc.slides.some(s=>s.id===id)))throw new Error("Select existing, unique slides.");
  const boxes=doc.slides.filter(s=>slideIds.includes(s.id)).flatMap(s=>s.elements.flatMap(e=>e.type==="text"&&(scope.kind!=="textbox"||e.id===scope.textboxId)?[{slideId:s.id,element:e}]:[]));
  if(!boxes.length||scope.kind==="textbox"&&boxes.length!==1)throw new Error("The scope has no textbox. Select teaching text.");
  return boxes;
}
export function minimizedReference(doc:Presentation,scope:AiScope,allowFormatting:boolean):AiRequest["reference"]{
  return scopeTextboxes(doc,scope).map(({slideId,element:e})=>({
    slideId,id:e.id,type:"text",...(allowFormatting?{align:e.align}:{}),
    paragraphs:e.paragraphs.map(p=>({runs:p.runs.map(r=>({text:r.text,...(allowFormatting?{size:r.size}:{})}))})),
  }));
}
// Full targeted style/layout plus a mount/history/save identity. Never sent to
// the provider: the request carries only an opaque sourceToken.
export function sourceFingerprint(doc:Presentation,scope:AiScope,identity:string){
  return JSON.stringify({identity,scope,targets:scopeTextboxes(doc,scope)});
}
export function validateAiPatch(raw:unknown,request:AiRequest):AiPatch{
  const patch=aiPatchSchema.parse(raw);
  if(JSON.stringify(patch).length>160000)throw new Error("AI suggestions are too large.");
  const boxes=new Set<string>();
  for(const change of patch.changes){
    const original=request.reference.find(e=>e.id===change.textboxId&&e.slideId===change.slideId);
    if(!original||boxes.has(change.textboxId))throw new Error("AI returned unknown, duplicate or out-of-scope textbox IDs.");
    boxes.add(change.textboxId);
    if(!request.allowFormatting&&(change.fontSize!==undefined||change.align!==undefined))throw new Error("AI formatting changes were not permitted.");
    const next=structuredClone(original),indices=new Set<string>();let changed=false;
    for(const edit of change.runs){
      const run=next.paragraphs[edit.paragraph]?.runs[edit.run],key=`${edit.paragraph}:${edit.run}`;
      if(!run||indices.has(key))throw new Error("AI returned unknown or duplicate run indices.");
      if(edit.text.split("\n").length!==run.text.split("\n").length)throw new Error("AI must preserve existing paragraph boundaries.");
      indices.add(key);changed ||= run.text!==edit.text;run.text=edit.text;
    }
    if(change.fontSize!==undefined)changed ||= original.paragraphs.some(p=>p.runs.some(r=>r.size!==change.fontSize));
    if(change.align!==undefined)changed ||= original.align!==change.align;
    if(textOf(next).length>10000)throw new Error("AI text exceeds 10,000 characters in a textbox.");
    if(!textOf(next).trim()&&textOf(original).trim())throw new Error("AI returned empty teaching text. Nothing was applied.");
    if(!changed)throw new Error("AI suggested no changes. Nothing was applied.");
  }
  return patch;
}
export function applyAiPatch(doc:Presentation,request:AiRequest,raw:unknown):Presentation{
  const patch=validateAiPatch(raw,request);
  const next=structuredClone(doc);
  for(const change of patch.changes){
    const box=next.slides.find(s=>s.id===change.slideId)?.elements.find(e=>e.id===change.textboxId);
    if(!box||box.type!=="text")throw new Error("The source textbox is no longer available.");
    for(const edit of change.runs){
      const run=box.paragraphs[edit.paragraph]?.runs[edit.run];
      if(!run)throw new Error("The source run structure changed.");
      run.text=edit.text;
    }
    if(change.fontSize!==undefined)for(const p of box.paragraphs)for(const r of p.runs)r.size=change.fontSize;
    if(change.align!==undefined)box.align=change.align;
  }
  return presentationSchema.parse(next);
}
