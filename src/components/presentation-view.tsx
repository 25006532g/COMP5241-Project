"use client";

import {useEffect,useRef,useState} from "react";
import type {PresentationSlide} from "@/lib/presentation";

export function assetUrl(id:string,scope:{lessonId?:string;draftId?:string}) {
  return `/api/presentation/assets/${encodeURIComponent(id)}?${scope.draftId?`draft=${encodeURIComponent(scope.draftId)}`:`lesson=${encodeURIComponent(scope.lessonId??"")}`}`;
}
// One Fabric adapter renders author thumbnails, fullscreen, review and learner views.
// The literal outline is always available, including when a private asset fails.
export function PresentationView({slide,lessonId,draftId,outline=true}:{slide:PresentationSlide;lessonId?:string;draftId?:string;outline?:boolean}) {
  const ref=useRef<HTMLCanvasElement>(null);
  const host=useRef<HTMLDivElement>(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let disposed=false;let close:(()=>void)|undefined;
    void (async()=>{
      const [{StaticCanvas},{drawSlide}]=await Promise.all([import("fabric"),import("@/lib/presentation-fabric")]);
      if(disposed||!ref.current||!host.current)return;
      const canvas=new StaticCanvas(ref.current,{width:960,height:540,enableRetinaScaling:true});
      const observer=new ResizeObserver(()=>{
        const width=host.current?.clientWidth??960;
        canvas.setDimensions({width:960,height:540});
        canvas.setDimensions({width:`${width}px`,height:`${width*540/960}px`},{cssOnly:true});
        canvas.requestRenderAll();
      });observer.observe(host.current);
      close=()=>{observer.disconnect();void canvas.dispose();};
      try{await drawSlide(canvas,slide,id=>assetUrl(id,{lessonId,draftId}),()=>!disposed);if(!disposed)setError("");}
      catch(error){if(!disposed)setError(error instanceof Error?error.message:"This slide could not be rendered completely. Check image access or reload.");}
    })().catch(()=>{if(!disposed)setError("Presentation renderer unavailable.");});
    return ()=>{disposed=true;close?.();};
  },[slide,lessonId,draftId]);
  return <div className="presentation-view">
    <div ref={host} className="presentation-surface" role="img" aria-label={slide.title}><canvas ref={ref} aria-hidden="true"/></div>
    {error&&<p role="alert">{error}</p>}
    {outline&&<details className="presentation-outline"><summary>Readable slide outline: {slide.title}</summary>
      {slide.elements.map(e=>e.type==="text"?<p key={e.id} style={{whiteSpace:"pre-wrap"}}>{e.paragraphs.map(p=>p.runs.map(r=>r.text).join("")).join("\n")}</p>:e.type==="image"?<p key={e.id}>Image: {e.alt}</p>:<p key={e.id}>{e.shape} shape</p>)}
    </details>}
  </div>;
}
