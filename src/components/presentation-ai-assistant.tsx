"use client";

import {useEffect,useRef,useState} from "react";
import {generatePresentationSuggestions} from "@/app/presentation/ai-actions";
import {validateAiPatch,scopeTextboxes,type AiScope,type AiSnapshot,type AiResult} from "@/lib/presentation-ai";
import {textOf,type Presentation} from "@/lib/presentation";

export function PresentationAiAssistant({document:doc,slideId,textboxId,locked,prepare,apply}:{
  document:Presentation;slideId:string;textboxId?:string;locked:boolean;
  prepare:(scope:AiScope,instruction:string,formatting:boolean,consent:boolean)=>AiSnapshot;
  apply:(snapshot:AiSnapshot,result:Extract<AiResult,{patch:unknown}>,isCurrent:()=>boolean)=>Promise<void>;
}){
  const [scope,setScope]=useState<AiScope>(()=>textboxId?{kind:"textbox",slideId,textboxId}:{kind:"slide",slideId});
  const [instruction,setInstruction]=useState(""),[formatting,setFormatting]=useState(false),[consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false),[applying,setApplying]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [suggestion,setSuggestion]=useState<{snapshot:AiSnapshot;result:Extract<AiResult,{patch:unknown}>}|null>(null);
  const epoch=useRef(0),pending=useRef(false),applyPending=useRef(false),live=useRef(true);
  const notice=useRef<HTMLParagraphElement>(null),results=useRef<HTMLElement>(null);
  useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  useEffect(()=>{if(error||message)notice.current?.focus();else if(suggestion)results.current?.focus();},[error,message,suggestion]);
  function invalidate(resetConsent=true){
    epoch.current++;setSuggestion(null);setError("");setMessage("");
    if(resetConsent)setConsent(false);
  }
  let count=0,scopeError="";
  try{count=scopeTextboxes(doc,scope).length;}catch(e){scopeError=e instanceof Error?e.message:"Select teaching text.";}
  async function generate(){
    if(pending.current||applyPending.current||locked)return;
    invalidate(false);
    let snapshot:AiSnapshot;
    try{snapshot=prepare(scope,instruction,formatting,consent);}
    catch(e){setError(e instanceof Error?e.message:"Invalid selection.");return;}
    const current=++epoch.current;
    pending.current=true;setBusy(true);
    try{
      const result=await generatePresentationSuggestions(snapshot.request);
      if(!live.current||epoch.current!==current)return;
      if("error" in result)setError(result.error);
      else if(result.binding.requestId!==snapshot.request.requestId||result.binding.sourceToken!==snapshot.request.sourceToken)setError("Suggestion identity mismatch. Generate again.");
      else {validateAiPatch(result.patch,snapshot.request);setSuggestion({snapshot,result});}
    }catch{if(live.current&&epoch.current===current)setError("AI request was not confirmed. Nothing changed; do not blindly retry.");}
    finally{pending.current=false;if(live.current)setBusy(false);}
  }
  async function applySuggestion(){
    if(!suggestion||applyPending.current||locked)return;
    const current=epoch.current;applyPending.current=true;setApplying(true);setError("");setMessage("");
    const isCurrent=()=>live.current&&epoch.current===current;
    try{
      await apply(suggestion.snapshot,suggestion.result,isCurrent);
      if(isCurrent()){setSuggestion(null);setConsent(false);setMessage("Suggestions applied as one undoable edit. Review the canvas and Save manually.");}
    }catch(e){if(isCurrent())setError(e instanceof Error?e.message:"Suggestions were not applied.");}
    finally{applyPending.current=false;if(live.current)setApplying(false);}
  }
  // Display from the frozen reference, not a newer draft. Each run and all
  // optional style changes are shown as plain text, never model HTML.
  return <section className="presentation-ai-assistant learning-form" aria-label="AI Slide Assistant">
    <p>Rewrite, summarize, translate, add examples or explanations for teaching text. No images or whole-deck redesign. AI can be wrong; review every suggestion.</p>
    <label>Suggestion scope<select value={scope.kind} onChange={e=>{
      invalidate();setScope(e.target.value==="textbox"&&textboxId?{kind:"textbox",slideId,textboxId}:e.target.value==="slides"?{kind:"slides",slideIds:[]}:{kind:"slide",slideId});
    }}>
      <option value="textbox" disabled={!textboxId}>Selected textbox</option><option value="slide">Current slide</option><option value="slides">Selected slides</option>
    </select></label>
    {scope.kind==="slides"&&<fieldset><legend>Select slides ({scope.slideIds.length} selected)</legend>
      {doc.slides.map((slide,index)=><label key={slide.id}><input type="checkbox" checked={scope.slideIds.includes(slide.id)} onChange={e=>{
        invalidate();setScope({kind:"slides",slideIds:e.target.checked?[...scope.slideIds,slide.id]:scope.slideIds.filter(id=>id!==slide.id)});
      }}/>{index+1}. {slide.title} ({slide.elements.filter(e=>e.type==="text").length} textboxes)</label>)}
    </fieldset>}
    <p>{scopeError||`${count} textbox${count===1?"":"es"} selected. Limit: 20,000 text characters, 100 textboxes, 2,000 runs and 30 slides. Oversized selections reject; nothing is clipped or batched.`}</p>
    <div><label htmlFor="presentation-ai-instruction">Instruction</label><textarea id="presentation-ai-instruction" rows={4} maxLength={2000} value={instruction} placeholder="Simplify this SDLC explanation for beginners and add a small classroom example."
      onChange={e=>{invalidate();setInstruction(e.target.value);}}/></div>
    <label><input type="checkbox" checked={formatting} onChange={e=>{invalidate();setFormatting(e.target.checked);}}/>Allow simple font-size and alignment suggestions</label>
    <p>Generate sends your instruction, only the selected teaching text and stable IDs to OpenRouter; font sizes/alignment are included only if allowed. Quiz/answer keys, accounts, images, originals, slide/lesson titles and unrelated slides are excluded. Prompts/results are not saved by FORGE. Provider defaults/retention are unknown; zero-data-retention is not guaranteed. Avoid personal or confidential information.</p>
    <label><input type="checkbox" checked={consent} onChange={e=>{invalidate(false);setConsent(e.target.checked);}}/>I consent to sending this selected text to external AI for this request.</label>
    <p>Requires recorded age 18+ and administrator-approved AI access. 15 requests/day shared with coach and interview. Discard/Close only ignores local results; it does not cancel an upstream request or refund quota.</p>
    <div className="presentation-toolbar">
      <button type="button" className="primary-button" disabled={locked||busy||applying||!consent||!instruction.trim()||Boolean(scopeError)} onClick={()=>void generate()}>{busy?"Generating…":"Generate suggestions"}</button>
      <button type="button" onClick={()=>{invalidate();setMessage("Suggestions discarded locally. Your presentation was not changed.");}}>Discard</button>
    </div>
    {suggestion&&<section ref={results} tabIndex={-1} aria-label="AI suggestions" className="presentation-ai-results">
      <h3>Review before applying</h3><p>{suggestion.result.patch.explanation}</p>
      {suggestion.result.patch.changes.map((change,index)=>{
        const before=suggestion.snapshot.request.reference.find(e=>e.id===change.textboxId)!;
        const after=structuredClone(before);
        for(const edit of change.runs)after.paragraphs[edit.paragraph].runs[edit.run].text=edit.text;
        return <section key={change.textboxId}><h4>Textbox {index+1} · slide {doc.slides.findIndex(s=>s.id===change.slideId)+1}</h4>
          <strong>Before</strong><pre>{textOf(before)}</pre><strong>After</strong><pre>{textOf(after)}</pre>
          <ul>{change.runs.map(r=><li key={`${r.paragraph}:${r.run}`}>Paragraph {r.paragraph+1}, run {r.run+1}: {JSON.stringify(before.paragraphs[r.paragraph].runs[r.run].text)} → {JSON.stringify(r.text)} (existing character style retained)</li>)}
            {change.fontSize!==undefined&&<li>Font sizes: {before.paragraphs.map((p,i)=>`paragraph ${i+1}: ${p.runs.map(r=>r.size).join(", ")}px`).join("; ")} → all runs {change.fontSize}px</li>}
            {change.align!==undefined&&<li>Alignment: {before.align} → {change.align}</li>}
          </ul>
        </section>;
      })}
      <button type="button" className="primary-button" disabled={locked||applying} onClick={()=>void applySuggestion()}>{applying?"Checking…":"Apply"}</button>
    </section>}
    {(error||message)&&<p ref={notice} tabIndex={-1} role={error?"alert":"status"} className={`form-notice${error?" notice-error":""}`}>{error||message}</p>}
  </section>;
}
