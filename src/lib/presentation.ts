import { z } from "zod";

export const SLIDE_WIDTH = 960;
export const SLIDE_HEIGHT = 540;
export const PRESENTATION_FONTS = ["Arial", "Calibri", "Times New Roman", "Courier New", "Noto Sans CJK SC"] as const;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const runStyleSchema = z.object({
  font: z.enum(PRESENTATION_FONTS), size: z.number().min(8).max(120),
  color, bold: z.boolean(), italic: z.boolean(), underline: z.boolean(),
}).strict();
export const textRunSchema = runStyleSchema.extend({ text: z.string().max(10000).refine(t => !/[\u0000-\u0008\u000b-\u001f]/u.test(t)) }).strict();
const box = {
  id: z.uuid(), x: z.number().min(0).max(960), y: z.number().min(0).max(540),
  w: z.number().min(1).max(960), h: z.number().min(1).max(540),
  rotation: z.number().min(-360).max(360),
};
export const elementSchema = z.discriminatedUnion("type", [
  z.object({ ...box, type: z.literal("text"), align: z.enum(["left", "center", "right"]),
    paragraphs: z.array(z.object({ runs: z.array(textRunSchema).min(1).max(1000) }).strict()).min(1).max(100),
  }).strict(),
  z.object({ ...box, type: z.literal("shape"), shape: z.enum(["rect", "roundedrect", "ellipse", "line", "arrow"]),
    fill: color, stroke: color, strokeWidth: z.number().min(0).max(20),
  }).strict(),
  z.object({ ...box, type: z.literal("image"), assetId: z.uuid(), alt: z.string().trim().min(1).max(300),
    // Image ratio is immutable source metadata, not trusted as server authority.
    ratio: z.number().min(0.001).max(1000),
  }).strict(),
]).superRefine((e, ctx) => {
  if (e.x + e.w > 960.01 || e.y + e.h > 540.01) ctx.addIssue({code:"custom",message:"Object must fit within the slide."});
  const radians=e.rotation*Math.PI/180;
  for(const [x,y] of [[0,0],[e.w,0],[0,e.h],[e.w,e.h]]){
    const px=e.x+x*Math.cos(radians)-y*Math.sin(radians),py=e.y+x*Math.sin(radians)+y*Math.cos(radians);
    if(px<-.01||px>960.01||py<-.01||py>540.01){ctx.addIssue({code:"custom",message:"The rotated object must fit within the slide."});break;}
  }
  if (e.type === "text" && textOf(e).length > 10000) ctx.addIssue({code:"custom",message:"A textbox supports at most 10,000 characters."});
  if (e.type === "image" && Math.abs(e.w / e.h / e.ratio - 1) > .02) ctx.addIssue({code:"custom",message:"Keep the image aspect ratio."});
});
export const presentationSlideSchema = z.object({
  id: z.uuid(), title: z.string().trim().min(1).max(100), background: color,
  elements: z.array(elementSchema).max(100),
}).strict();
export const presentationSchema = z.object({
  schemaVersion: z.literal(1), width: z.literal(960), height: z.literal(540),
  slides: z.array(presentationSlideSchema).min(1).max(30),
}).strict().superRefine((doc,ctx) => {
  const ids = doc.slides.flatMap(s=>[s.id,...s.elements.map(e=>e.id)]);
  if(new Set(ids).size !== ids.length) ctx.addIssue({code:"custom",message:"Slide and object IDs must be unique."});
  if(JSON.stringify(doc).length > 1_500_000) ctx.addIssue({code:"custom",message:"Presentation text is too large (1.5 million characters maximum)."});
});
export const presentationQuizSchema = z.array(z.object({
  prompt:z.string().trim().min(1).max(300),options:z.array(z.string().trim().min(1).max(200)).length(4),correct:z.number().int().min(0).max(3),
}).strict()).max(10).refine(q=>q.length===0 || q.length>=3,"Use no quiz or 3–10 questions.");
export const presentationAuthorSchema = z.object({
  title:z.string().trim().min(3).max(120),audience:z.enum(["learners","instructors","both"]),
  difficulty:z.enum(["new","foundation","intermediate","advanced"]),document:presentationSchema,quiz:presentationQuizSchema,
}).strict();
export type Presentation = z.infer<typeof presentationSchema>;
export type PresentationSlide = z.infer<typeof presentationSlideSchema>;
export type PresentationElement = z.infer<typeof elementSchema>;
export type TextElement = Extract<PresentationElement,{type:"text"}>;
export type RunStyle = z.infer<typeof runStyleSchema>;
export type PresentationAuthor = z.infer<typeof presentationAuthorSchema>;
export const defaultRun: RunStyle = {font:"Arial",size:28,color:"#17201d",bold:false,italic:false,underline:false};
export function textOf(e: {paragraphs:{runs:{text:string}[]}[]}) { return e.paragraphs.map(p=>p.runs.map(r=>r.text).join("")).join("\n"); }
export function paragraphs(text:string,style:RunStyle=defaultRun):TextElement["paragraphs"] {
  return text.split("\n").map(line=>({runs:[{...style,text:line}]}));
}
export function newSlide():PresentationSlide {return {id:crypto.randomUUID(),title:"Untitled slide",background:"#fffefa",elements:[]};}
export function newText(text="Edit text"):TextElement {
  return {id:crypto.randomUUID(),type:"text",x:60,y:70,w:700,h:150,rotation:0,align:"left",paragraphs:paragraphs(text)};
}
export function blankPresentation():PresentationAuthor {
  return {title:"",audience:"learners",difficulty:"foundation",document:{schemaVersion:1,width:960,height:540,slides:[newSlide()]},quiz:[]};
}
export function duplicateSlide(slide:PresentationSlide):PresentationSlide {
  return {...structuredClone(slide),id:crypto.randomUUID(),elements:slide.elements.map(e=>({...structuredClone(e),id:crypto.randomUUID()}))};
}
// Read-only conversion; callers persist v1 only through an explicit save.
export function legacyPresentation(legacy:{title:string;audience:PresentationAuthor["audience"];difficulty:PresentationAuthor["difficulty"];
  slides:{title:string;body:string;style?:{color:string;size:number;align:"left"|"center"|"right";background:string}}[];quiz:PresentationAuthor["quiz"]}):PresentationAuthor {
  return {title:legacy.title,audience:legacy.audience,difficulty:legacy.difficulty,quiz:legacy.quiz,document:{
    schemaVersion:1,width:960,height:540,slides:legacy.slides.map(s=>{
      const style={...defaultRun,color:s.style?.color??defaultRun.color,size:s.style?.size??28};
      return {...newSlide(),title:s.title || "Untitled slide",background:s.style?.background??"#fffefa",elements:[
        {...newText(s.title),y:40,h:85,align:s.style?.align??"left",paragraphs:paragraphs(s.title,{...style,size:40,bold:true})},
        {...newText(s.body),y:145,h:340,align:s.style?.align??"left",paragraphs:paragraphs(s.body,style)},
      ]};
    }),
  }};
}
export function presentationOutline(doc:Presentation):string {
  return doc.slides.map(s=>`${s.title}\n${s.elements.map(e=>e.type==="text"?textOf(e):e.type==="image"?`Image: ${e.alt}`:"").filter(Boolean).join("\n")}`).join("\n\n");
}
export function assetIds(doc:Presentation) {return [...new Set(doc.slides.flatMap(s=>s.elements.flatMap(e=>e.type==="image"?[e.assetId]:[])))];}

// Document history includes slide operations. Assets are retained for undo until
// explicit draft discard/expiry, never deleted when an element leaves the canvas.
export class PresentationHistory<T> {
  private past:T[]=[]; private future:T[]=[]; private group=""; private at=0;
  public value:T;
  constructor(value:T){this.value=value;}
  commit(next:T,group="",now=Date.now()) {
    if(JSON.stringify(next)===JSON.stringify(this.value)) return;
    if(!group || group!==this.group || now-this.at>900) this.past=[...this.past.slice(-49),structuredClone(this.value)];
    this.value=structuredClone(next);this.future=[];this.group=group;this.at=now;
  }
  undo(){const next=this.past.pop();if(!next)return;this.future.push(this.value);this.value=next;this.group="";return this.value;}
  redo(){const next=this.future.pop();if(!next)return;this.past.push(this.value);this.value=next;this.group="";return this.value;}
  get canUndo(){return this.past.length>0;} get canRedo(){return this.future.length>0;}
}
