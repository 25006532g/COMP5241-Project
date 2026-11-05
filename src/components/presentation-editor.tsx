"use client";

import {useCallback,useEffect,useRef,useState,type KeyboardEvent} from "react";
import {useRouter} from "next/navigation";
import {createManualLesson,updateLesson,type ActionState} from "@/app/learning/actions";
import {beginPresentationDraft,uploadPresentationImage,discardPresentationDraft,cleanExpiredPresentationUploads} from "@/app/presentation/actions";
import {PresentationHistory,blankPresentation,defaultRun,duplicateSlide,legacyPresentation,newSlide,newText,paragraphs,
  elementSchema,presentationAuthorSchema,presentationSchema,PRESENTATION_FONTS,textOf,type PresentationAuthor,type PresentationElement,type PresentationSlide,type RunStyle} from "@/lib/presentation";
import type {AuthorLesson} from "@/lib/slide-lesson";
import {PresentationCanvasEditor,type CanvasHandle} from "./presentation-canvas";
import {assetUrl,PresentationView} from "./presentation-view";

export function PresentationLessonEditor({lessonId="",version=1,initial,initialLegacy,onSaveLock}:{
  lessonId?:string;version?:number;initial?:PresentationAuthor;initialLegacy?:AuthorLesson;onSaveLock?:(locked:boolean)=>void;
}) {
  const router=useRouter();
  const [history]=useState(()=>new PresentationHistory(initial??(initialLegacy?legacyPresentation(initialLegacy):blankPresentation())));
  const [draft,setDraft]=useState(history.value);
  const [slideId,setSlideId]=useState(history.value.document.slides[0].id);
  const [selection,setSelection]=useState<string[]>([]);
  const [ack,setAck]=useState({id:lessonId,version});
  const [draftId,setDraftId]=useState("");
  const [pending,setPending]=useState(false),[uploading,setUploading]=useState(false),[uncertain,setUncertain]=useState(false);
  const [error,setError]=useState(""),[success,setSuccess]=useState("");
  const [saved,setSaved]=useState(JSON.stringify(history.value));
  const [preview,setPreview]=useState(false),[previewIndex,setPreviewIndex]=useState(0);
  const [previewError,setPreviewError]=useState("");
  const inFlight=useRef(false),blocked=useRef(false),live=useRef(true);
  const canvas=useRef<CanvasHandle|null>(null),notice=useRef<HTMLParagraphElement>(null),dialog=useRef<HTMLDialogElement>(null);
  const previewTrigger=useRef<HTMLButtonElement>(null);
  const slide=draft.document.slides.find(s=>s.id===slideId)??draft.document.slides[0];
  const index=draft.document.slides.indexOf(slide);
  const selected=slide.elements.filter(e=>selection.includes(e.id));
  const primary=selected[0];
  const locked=pending||uncertain||uploading;
  const reportError=useCallback((message:string)=>setError(message),[]);
  // Source identity changes only on a real draft/lesson scope change, not typing.
  const source=useCallback((id:string)=>assetUrl(id,{draftId:draftId||undefined,lessonId:ack.id}),[draftId,ack.id]);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{if(error||success)notice.current?.focus();},[error,success]);
  useEffect(()=>{
    if(saved===JSON.stringify(draft)&&!uncertain)return;
    const prevent=(event:BeforeUnloadEvent)=>event.preventDefault();
    window.addEventListener("beforeunload",prevent);return()=>window.removeEventListener("beforeunload",prevent);
  },[draft,saved,uncertain]);
  useEffect(()=>{
    if(preview){
      dialog.current?.showModal();
      const request=dialog.current?.requestFullscreen?.()??Promise.reject(new Error("Fullscreen unavailable"));
      void request.catch(()=>setPreviewError("Fullscreen is unavailable. You can still use the preview in this dialog."));
    }
  },[preview]);

  const commit=useCallback((next:PresentationAuthor,group="")=>{
    if(blocked.current||inFlight.current)return;
    history.commit(next,group);setDraft(history.value);setSuccess("");
  },[history]);
  const changeSlide=useCallback((next:PresentationSlide,group="")=>{
    const current=history.value;
    commit({...current,document:{...current.document,slides:current.document.slides.map(s=>s.id===next.id?next:s)}},group);
  },[commit,history]);
  function patchSlide(patch:Partial<PresentationSlide>,group=""){changeSlide({...slide,...patch},group);}
  function patchElements(fn:(element:PresentationElement)=>PresentationElement,group=""){
    const next={...slide,elements:slide.elements.map(e=>selection.includes(e.id)?fn(e):e)};
    const parsed=presentationSchema.safeParse({...draft.document,slides:draft.document.slides.map(s=>s.id===slide.id?next:s)});
    if(!parsed.success){setError(parsed.error.issues[0]?.message??"Invalid object properties.");return;}
    changeSlide(next,group);
  }
  function add(element:PresentationElement) {
    if(slide.elements.length>=100){setError("A slide supports at most 100 objects.");return;}
    patchSlide({elements:[...slide.elements,element]});setSelection([element.id]);
  }
  function undo(redo=false){
    if(locked)return;
    const next=redo?history.redo():history.undo();if(next){setDraft(next);setSelection([]);setError("");}
  }
  function remove(){patchSlide({elements:slide.elements.filter(e=>!selection.includes(e.id))});setSelection([]);}
  function duplicateObjects(){
    if(slide.elements.length+selected.length>100){setError("A slide supports at most 100 objects.");return;}
    const copies=selected.map(e=>{
      const copy={...structuredClone(e),id:crypto.randomUUID(),x:Math.min(960-e.w,e.x+12),y:Math.min(540-e.h,e.y+12)};
      return elementSchema.safeParse(copy).success?copy:{...copy,x:e.x,y:e.y};
    });
    patchSlide({elements:[...slide.elements,...copies]});setSelection(copies.map(e=>e.id));
  }
  function select(ids:string[]){setSelection(ids);canvas.current?.select(ids);}
  function reorderSlide(direction:number){
    const slides=[...draft.document.slides];const to=index+direction;if(to<0||to>=slides.length)return;
    [slides[index],slides[to]]=[slides[to],slides[index]];commit({...draft,document:{...draft.document,slides}});
  }
  function font(patch:Partial<RunStyle>) {canvas.current?.format(patch);}
  function keyboard(event:KeyboardEvent<HTMLDivElement>){
    if(locked)return;
    if(event.nativeEvent.isComposing)return;
    const mod=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
    if(mod&&key==="s"){event.preventDefault();void save("save");return;}
    const target=event.target as HTMLElement;
    const field=target.closest("input,textarea,select,[contenteditable=true]");
    const nativeText=field&&!target.closest(".presentation-editable");
    if(nativeText)return;
    const editing=canvas.current?.editing();
    if(mod&&key==="z"){event.preventDefault();undo(event.shiftKey);return;}
    if(mod&&key==="y"){event.preventDefault();undo(true);return;}
    if(mod&&["b","i","u"].includes(key)){event.preventDefault();canvas.current?.toggle(key==="b"?"bold":key==="i"?"italic":"underline");return;}
    if(editing)return; // IME, deletion, caret/selection and clipboard stay native.
    if(mod&&key==="d"){event.preventDefault();duplicateObjects();}
    else if(mod&&key==="a"){event.preventDefault();select(slide.elements.map(e=>e.id));}
    else if(["Delete","Backspace"].includes(event.key)&&selection.length){event.preventDefault();remove();}
    else if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)&&selection.length){
      event.preventDefault();const step=event.shiftKey?10:1;
      patchElements(e=>({...e,x:Math.max(0,Math.min(960-e.w,e.x+(event.key==="ArrowLeft"?-step:event.key==="ArrowRight"?step:0))),
        y:Math.max(0,Math.min(540-e.h,e.y+(event.key==="ArrowUp"?-step:event.key==="ArrowDown"?step:0)))}),`move:${selection.join()}`);
    }
  }
  async function ensureImageDraft(){
    if(draftId)return draftId;
    const result=await beginPresentationDraft(ack.id||undefined);
    if(!result.id)throw new Error(result.error??"Image storage unavailable.");
    if(live.current)setDraftId(result.id);return result.id;
  }
  async function image(file:File|undefined,replace=false){
    if(!file||locked||inFlight.current)return;
    setUploading(true);setError("");
    try {
      if(!replace&&slide.elements.length>=100)throw new Error("A slide supports at most 100 objects.");
      const id=await ensureImageDraft();
      const form=new FormData();form.set("draftId",id);form.set("image",file);
      const result=await uploadPresentationImage(form);
      if(!live.current)return;
      if(!result.id||!result.width||!result.height)throw new Error(result.error??"Image upload failed.");
      const ratio=result.width/result.height;
      if(replace&&primary?.type==="image"){
        const w=Math.min(primary.w,(540-primary.y)*ratio),h=w/ratio;
        patchElements(e=>e.id===primary.id?{...primary,assetId:result.id!,ratio,w,h}:e);
      }else {
        const w=Math.min(480,380*ratio),h=w/ratio;
        add({id:crypto.randomUUID(),type:"image",assetId:result.id,alt:"Image — add a description",ratio,x:60,y:70,w,h,rotation:0});
      }
    }catch(e){if(live.current)setError(e instanceof Error?e.message:"Image upload failed.");}
    finally{if(live.current)setUploading(false);}
  }
  async function save(intent:"save"|"publish"){
    if(inFlight.current||blocked.current||uploading)return;
    const parsed=presentationAuthorSchema.safeParse(history.value);
    if(!parsed.success){setError(`${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}`);return;}
    inFlight.current=true;setPending(true);onSaveLock?.(true);setError("");setSuccess("");
    const form=new FormData();
    for(const [k,v] of Object.entries({template:"slides",format:"presentation",content:JSON.stringify(parsed.data),intent,lessonId:ack.id,version:String(ack.version),draftId}))form.set(k,v);
    let dispatched=false;
    try{
      const {validateTextLayout}=await import("@/lib/presentation-fabric");await validateTextLayout(parsed.data.document);
      dispatched=true;
      const result:ActionState=ack.id?await updateLesson({},form):await createManualLesson({},form);
      if(!live.current)return;
      if(result.saveUncertain||!result.error&&(!result.lessonId||!result.version)){
        blocked.current=true;setUncertain(true);setError("Save outcome is unknown. Keep this tab and check Your lessons in another tab before saving again.");
      }else if(result.error)setError(result.error);
      else{
        setAck({id:result.lessonId!,version:result.version!});
        setSaved(JSON.stringify(parsed.data));setSuccess(`${result.success} Version ${result.version}.`);router.refresh();
      }
    }catch(e){if(live.current){
      if(dispatched){blocked.current=true;setUncertain(true);setError("Save outcome is unknown. Keep this tab and reconcile Your lessons before retrying.");}
      else setError(e instanceof Error?e.message:"Slide validation failed. Nothing was saved.");
    }}
    finally{inFlight.current=false;if(live.current){setPending(false);onSaveLock?.(blocked.current);}}
  }
  async function exportPptx(){
    if(locked)return;
    setUploading(true);setError("");
    try{
      const {presentationPptx,fetchAssetData}=await import("@/lib/presentation-export");
      const blob=await presentationPptx(history.value.document,id=>fetchAssetData(source(id)));
      const url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="presentation.pptx";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setSuccess("Native editable PPTX exported. Review font and wrapping fidelity in PowerPoint.");
    }catch(e){setError(e instanceof Error?e.message:"Export failed. No partial PPTX was produced.");}
    finally{if(live.current)setUploading(false);}
  }
  async function discard(){
    if(locked||!window.confirm("Discard unsaved input and undo history? Saved lesson images remain; unused draft images will be removed."))return;
    setUploading(true);
    try{
      if(draftId){const result=await discardPresentationDraft(draftId);if(result.error)throw new Error(result.error);}
      router.refresh();window.location.assign(ack.id?`/studio?edit=${ack.id}`:"/studio?manual=1");
    }catch(e){setError(e instanceof Error?e.message:"Draft cleanup failed.");setUploading(false);}
  }
  const style=primary?.type==="text"?primary.paragraphs[0].runs[0]:defaultRun;
  return <div className="presentation-editor" onKeyDown={keyboard}>
    <p>16:9 · 1–30 slides · up to 100 objects per slide. Double click text to edit (including IME/CJK). Shift-click to select multiple objects. Use the outline and numeric properties without dragging.</p>
    <fieldset disabled={locked} className="presentation-metadata learning-form">
      <label>Lesson title<input value={draft.title} maxLength={120} onChange={e=>commit({...draft,title:e.target.value},"lesson-title")}/></label>
      <label>Audience<select value={draft.audience} onChange={e=>commit({...draft,audience:e.target.value as PresentationAuthor["audience"]})}><option value="learners">Learners</option><option value="instructors">Instructors</option><option value="both">Both</option></select></label>
      <label>Difficulty<select value={draft.difficulty} onChange={e=>commit({...draft,difficulty:e.target.value as PresentationAuthor["difficulty"]})}>{["new","foundation","intermediate","advanced"].map(v=><option key={v}>{v}</option>)}</select></label>
    </fieldset>
    <fieldset disabled={locked} className="presentation-toolbar" aria-label="Presentation toolbar">
      <button type="button" disabled={!history.canUndo} onClick={()=>undo()}>Undo</button><button type="button" disabled={!history.canRedo} onClick={()=>undo(true)}>Redo</button>
      <button type="button" onClick={()=>add(newText())}>Add text</button>
      <details><summary>Shapes</summary><div>{(["rect","roundedrect","ellipse","line","arrow"] as const).map(shape=><button type="button" key={shape} onClick={()=>add({id:crypto.randomUUID(),type:"shape",shape,x:80,y:100,w:240,h:120,rotation:0,fill:"#c7e8df",stroke:"#17201d",strokeWidth:2})}>{shape}</button>)}</div></details>
      <label className="presentation-upload">Insert PNG/JPEG<input type="file" accept="image/png,image/jpeg" onChange={e=>{void image(e.target.files?.[0]);e.target.value="";}}/></label>
      <button type="button" disabled={!selected.length} onClick={duplicateObjects}>Duplicate objects</button><button type="button" disabled={!selected.length} onClick={remove}>Delete objects</button>
      <button ref={previewTrigger} type="button" onClick={()=>{setPreviewError("");setPreviewIndex(index);setPreview(true);}}>Fullscreen preview</button>
      <button type="button" onClick={()=>void exportPptx()}>Export editable PPTX</button>
    </fieldset>
    <div className="presentation-workspace">
      <details open className="presentation-slides"><summary>Slides ({draft.document.slides.length})</summary>
        <ol>{draft.document.slides.map((s,i)=><li key={s.id}><button type="button" disabled={locked} aria-current={s.id===slide.id?"step":undefined} onClick={()=>{setSlideId(s.id);setSelection([]);}}>
          <PresentationView slide={s} lessonId={ack.id} draftId={draftId||undefined} outline={false}/><span>{i+1}. {s.title||"Untitled slide"}</span>
        </button></li>)}</ol>
        <fieldset disabled={locked} className="presentation-toolbar">
          <button type="button" disabled={draft.document.slides.length>=30} onClick={()=>{const s=newSlide();commit({...draft,document:{...draft.document,slides:[...draft.document.slides,s]}});setSlideId(s.id);setSelection([]);}}>Add slide</button>
          <button type="button" disabled={draft.document.slides.length>=30} onClick={()=>{const s=duplicateSlide(slide),slides=[...draft.document.slides];slides.splice(index+1,0,s);commit({...draft,document:{...draft.document,slides}});setSlideId(s.id);setSelection([]);}}>Duplicate slide</button>
          <button type="button" disabled={draft.document.slides.length<=1} onClick={()=>{commit({...draft,document:{...draft.document,slides:draft.document.slides.filter(s=>s.id!==slide.id)}});setSelection([]);}}>Delete slide</button>
          <button type="button" disabled={index===0} onClick={()=>reorderSlide(-1)}>Slide up</button><button type="button" disabled={index===draft.document.slides.length-1} onClick={()=>reorderSlide(1)}>Slide down</button>
        </fieldset>
      </details>
      <main className="presentation-main" aria-label="Presentation editing area">
        <fieldset disabled={locked} className="presentation-toolbar">
          <label>Slide title (accessible)<input value={slide.title} maxLength={100} onChange={e=>patchSlide({title:e.target.value},`slide-title:${slide.id}`)}/></label>
          <label>Background<input type="color" value={slide.background} onChange={e=>patchSlide({background:e.target.value})}/></label>
        </fieldset>
        <PresentationCanvasEditor slide={slide} source={source} onChange={changeSlide} onSelect={setSelection} onError={reportError} handle={canvas} selection={selection} disabled={locked}/>
        <p>Slide {index+1} of {draft.document.slides.length} · {slide.elements.length}/100 objects. Delete/arrow keys affect selected objects only outside text editing; Ctrl/Cmd+Z/Y undo/redo, +D duplicate, +S save.</p>
        <fieldset disabled={locked} className="presentation-toolbar">
          <button type="button" disabled={index===0} onClick={()=>{setSlideId(draft.document.slides[index-1].id);setSelection([]);}}>Previous</button>
          <button type="button" disabled={index===draft.document.slides.length-1} onClick={()=>{setSlideId(draft.document.slides[index+1].id);setSelection([]);}}>Next</button>
        </fieldset>
        <details open className="presentation-outline"><summary>Accessible object outline</summary>
          <ul>{slide.elements.map((e,i)=><li key={e.id}><label><input type="checkbox" checked={selection.includes(e.id)} disabled={locked} onChange={event=>select(event.target.checked?[...selection,e.id]:selection.filter(id=>id!==e.id))}/>
            Object {i+1}: {e.type==="text"?textOf(e)||"Empty text":e.type==="image"?`Image: ${e.alt}`:e.shape}</label></li>)}</ul>
        </details>
      </main>
      <details open className="presentation-properties"><summary>Object properties ({selected.length} selected)</summary>
        <fieldset disabled={locked||!primary} className="learning-form">
          {!primary&&<p>Select objects on the canvas or in the outline.</p>}
          {primary&&<>
            {(["x","y","w","h","rotation"] as const).map(key=><label key={key}>{({x:"X position",y:"Y position",w:"Width",h:"Height",rotation:"Rotation"})[key]}
              <input type="number" step={1} value={Math.round(primary[key]*100)/100} onChange={event=>{
                const value=Number(event.target.value);if(!Number.isFinite(value))return;
                patchElements(e=>e.type==="image"&&(key==="w"||key==="h")?{...e,w:key==="w"?value:value*e.ratio,h:key==="h"?value:value/e.ratio}:{...e,[key]:value},`number:${key}:${selection.join()}`);
              }}/></label>)}
            <div className="presentation-toolbar">{(["left","center","right","top","middle","bottom"] as const).map(align=><button type="button" key={align} onClick={()=>patchElements(e=>({...e,
              ...(align==="left"?{x:0}:align==="center"?{x:(960-e.w)/2}:align==="right"?{x:960-e.w}:align==="top"?{y:0}:align==="middle"?{y:(540-e.h)/2}:{y:540-e.h}),
            }))}>Align {align}</button>)}</div>
            <div className="presentation-toolbar"><button type="button" onClick={()=>patchSlide({elements:[...slide.elements.filter(e=>!selection.includes(e.id)),...selected]})}>Bring to front</button>
              <button type="button" onClick={()=>patchSlide({elements:[...selected,...slide.elements.filter(e=>!selection.includes(e.id))]})}>Send to back</button>
              <button type="button" onClick={()=>{const elements=[...slide.elements];for(let i=elements.length-2;i>=0;i--)if(selection.includes(elements[i].id)&&!selection.includes(elements[i+1].id))[elements[i],elements[i+1]]=[elements[i+1],elements[i]];patchSlide({elements});}}>Forward one</button>
              <button type="button" onClick={()=>{const elements=[...slide.elements];for(let i=1;i<elements.length;i++)if(selection.includes(elements[i].id)&&!selection.includes(elements[i-1].id))[elements[i],elements[i-1]]=[elements[i-1],elements[i]];patchSlide({elements});}}>Backward one</button></div>
            {primary.type==="text"&&<>
              <p>Formatting applies to selected characters while editing, otherwise to selected textboxes. Toolbar buttons preserve the canvas selection.</p>
              <div className="presentation-toolbar">{(["bold","italic","underline"] as const).map(mark=><button type="button" key={mark} onMouseDown={e=>e.preventDefault()} onClick={()=>canvas.current?.toggle(mark)}>{mark}</button>)}</div>
              <label>Font<select value={style.font} onChange={e=>font({font:e.target.value as RunStyle["font"]})}>{PRESENTATION_FONTS.map(f=><option key={f}>{f}</option>)}</select></label>
              <label>Font size<input type="number" min={8} max={120} value={style.size} onChange={e=>{const size=Number(e.target.value);if(size>=8&&size<=120)font({size});}}/></label>
              <label>Text colour<input type="color" value={style.color} onChange={e=>font({color:e.target.value})}/></label>
              <label>Text alignment<select value={primary.align} onChange={e=>patchElements(o=>o.type==="text"?{...o,align:e.target.value as "left"|"center"|"right"}:o)}><option>left</option><option>center</option><option>right</option></select></label>
              <label>Textbox content (plain replacement removes character formatting)<textarea value={textOf(primary)} onChange={e=>patchElements(o=>o.type==="text"?{...o,paragraphs:paragraphs(e.target.value,o.paragraphs[0].runs[0])}:o,`plain-text:${primary.id}`)}/></label>
            </>}
            {primary.type==="shape"&&<>
              <label>Shape fill<input type="color" value={primary.fill} onChange={e=>patchElements(o=>o.type==="shape"?{...o,fill:e.target.value}:o)}/></label>
              <label>Shape stroke<input type="color" value={primary.stroke} onChange={e=>patchElements(o=>o.type==="shape"?{...o,stroke:e.target.value}:o)}/></label>
              <label>Stroke width<input type="number" min={0} max={20} value={primary.strokeWidth} onChange={e=>patchElements(o=>o.type==="shape"?{...o,strokeWidth:Number(e.target.value)}:o)}/></label>
            </>}
            {primary.type==="image"&&<>
              <label>Image alt text<input value={primary.alt} maxLength={300} onChange={e=>patchElements(o=>o.type==="image"?{...o,alt:e.target.value}:o,`alt:${primary.id}`)}/></label>
              <label>Replace image<input type="file" accept="image/png,image/jpeg" onChange={e=>{void image(e.target.files?.[0],true);e.target.value="";}}/></label>
              <p>Image resizing preserves the source aspect ratio. Replacements retain the old private asset for undo.</p>
            </>}
          </>}
        </fieldset>
      </details>
    </div>
    <details className="learning-section"><summary>Optional quiz — excluded from PPTX export</summary>
      <fieldset disabled={locked} className="learning-form">
        <label><input type="checkbox" checked={draft.quiz.length>0} onChange={e=>commit({...draft,quiz:e.target.checked?Array.from({length:3},()=>({prompt:"",options:["","","",""],correct:0})):[]})}/> Include a quiz</label>
        {draft.quiz.map((q,i)=><fieldset key={i}><legend>Question {i+1}</legend>
          <label>Question<input value={q.prompt} maxLength={300} onChange={e=>commit({...draft,quiz:draft.quiz.map((v,j)=>j===i?{...v,prompt:e.target.value}:v)},`quiz:${i}`)}/></label>
          {q.options.map((o,k)=><label key={k}>Option {k+1}<input value={o} maxLength={200} onChange={e=>commit({...draft,quiz:draft.quiz.map((v,j)=>j===i?{...v,options:v.options.map((v,n)=>n===k?e.target.value:v)}:v)},`option:${i}:${k}`)}/></label>)}
          <label>Correct option<select value={q.correct} onChange={e=>commit({...draft,quiz:draft.quiz.map((v,j)=>j===i?{...v,correct:Number(e.target.value)}:v)})}>{q.options.map((_,k)=><option key={k} value={k}>{k+1}</option>)}</select></label>
          <button type="button" disabled={draft.quiz.length<=3} onClick={()=>commit({...draft,quiz:draft.quiz.filter((_,j)=>j!==i)})}>Remove question</button>
        </fieldset>)}
        <button type="button" disabled={!draft.quiz.length||draft.quiz.length>=10} onClick={()=>commit({...draft,quiz:[...draft.quiz,{prompt:"",options:["","","",""],correct:0}]})}>Add question</button>
      </fieldset>
    </details>
    <div className="presentation-toolbar">
      <button type="button" className="primary-button" disabled={locked} onClick={()=>void save("save")}>{pending?"Saving…":"Save"}</button>
      <button type="button" className="secondary-button" disabled={locked} onClick={()=>void save("publish")}>Save and publish</button>
      <button type="button" disabled={locked} onClick={()=>void discard()}>Discard unsaved draft</button>
      <button type="button" disabled={locked} onClick={()=>void cleanExpiredPresentationUploads().then(r=>{setError(r.error??"");setSuccess(r.success??"");})
        .catch(()=>{setSuccess("");setError("Image cleanup was not confirmed. Retry; no cleanup success is assumed.");})}>Clean expired image uploads</button>
    </div>
    <p>Save is private for every author role. Save and publish requests administrator review. Originals are not retained; sanitized private uploads are retained for undo for seven days, or while referenced by a saved lesson. Discard removes unused uploads now. Expired cleanup is retryable; administrators must schedule cleanup for abandoned accounts/drafts.</p>
    {(error||success)&&<p ref={notice} tabIndex={-1} role={error?"alert":"status"} className={`form-notice${error?" notice-error":""}`}>{error||success}</p>}
    {uncertain&&<a href="/studio" target="_blank" rel="noopener noreferrer">Check Your lessons in another tab; saving is locked here</a>}
    {preview&&<dialog ref={dialog} className="presentation-fullscreen" aria-label="Presentation fullscreen preview" onClose={()=>{setPreview(false);previewTrigger.current?.focus();if(document.fullscreenElement)void document.exitFullscreen();}}>
      <h2>{draft.document.slides[previewIndex]?.title}</h2>{previewError&&<p role="status">{previewError}</p>}<PresentationView slide={draft.document.slides[previewIndex]} draftId={draftId||undefined} lessonId={ack.id}/>
      <div className="presentation-toolbar"><button type="button" disabled={previewIndex===0} onClick={()=>setPreviewIndex(i=>i-1)}>Previous slide</button><button type="button" disabled={previewIndex===draft.document.slides.length-1} onClick={()=>setPreviewIndex(i=>i+1)}>Next slide</button><button type="button" onClick={()=>dialog.current?.close()}>Close preview</button></div>
    </dialog>}
  </div>;
}
