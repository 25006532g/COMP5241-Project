"use client";

import {useEffect,useImperativeHandle,useRef,useState,type RefObject} from "react";
import type {Canvas,Textbox} from "fabric";
import {presentationSlideSchema,type PresentationSlide,type RunStyle} from "@/lib/presentation";
import type {AssetSource} from "@/lib/presentation-fabric";

export type CanvasHandle={
  select:(ids:string[])=>void;
  format:(patch:Partial<RunStyle>)=>void;
  toggle:(mark:"bold"|"italic"|"underline")=>void;
  editing:()=>boolean;
  flush:()=>boolean;
};
export function PresentationCanvasEditor({slide,source,onChange,onSelect,onError,handle,selection,disabled=false}:{
  slide:PresentationSlide;source:AssetSource;onChange:(slide:PresentationSlide,group?:string)=>void;
  onSelect:(ids:string[])=>void;onError:(message:string)=>void;handle:RefObject<CanvasHandle|null>;selection:string[];disabled?:boolean;
}) {
  const ref=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<Canvas|null>(null);
  const live=useRef({slide,source,onChange,onSelect,onError,disabled,selection});
  const api=useRef<CanvasHandle|null>(null);
  useImperativeHandle(handle,()=>({
    select:ids=>api.current?.select(ids),format:patch=>api.current?.format(patch),
    toggle:mark=>api.current?.toggle(mark),
    editing:()=>api.current?.editing()??false,flush:()=>api.current?.flush()??false,
  }),[]);
  const emitted=useRef("");
  const [ready,setReady]=useState(0);
  useEffect(()=>{live.current={slide,source,onChange,onSelect,onError,disabled,selection};});
  useEffect(()=>{
    let disposed=false;let close:(()=>void)|undefined;
    void(async()=>{
      const [fabric,adapter]=await Promise.all([import("fabric"),import("@/lib/presentation-fabric")]);
      if(disposed||!ref.current||!host.current)return;
      const canvas=new fabric.Canvas(ref.current,{width:960,height:540,preserveObjectStacking:true,selection:true,uniformScaling:true,uniScaleKey:undefined});
      canvasRef.current=canvas;
      let restoring=false;
      function selected(){live.current.onSelect(canvas.getActiveObjects().map(adapter.objectId).filter((id):id is string=>Boolean(id)));}
      function commit(group="") {
        if(restoring||disposed||live.current.disabled)return false;
        try {
          const next=adapter.captureSlide(canvas,live.current.slide);
          const parsed=presentationSlideSchema.safeParse(next);
          if(!parsed.success)throw new Error(parsed.error.issues[0]?.message??"Object is outside slide bounds.");
          emitted.current=JSON.stringify(next);
          live.current.slide=next;live.current.onChange(next,group);return true;
        } catch(error) {
          live.current.onError(error instanceof Error?error.message:"Invalid canvas change.");
          restoring=true;
          void adapter.drawSlide(canvas,live.current.slide,live.current.source,()=>!disposed).finally(()=>{restoring=false;});
          return false;
        }
      }
      canvas.on("selection:created",selected);canvas.on("selection:updated",selected);canvas.on("selection:cleared",selected);
      canvas.on("object:modified",()=>commit());canvas.on("text:changed",()=>commit(`text:${adapter.objectId(canvas.getActiveObject()!)}`));
      api.current={
        select(ids){const objects=canvas.getObjects().filter(o=>ids.includes(adapter.objectId(o)??""));canvas.discardActiveObject();if(objects.length===1)canvas.setActiveObject(objects[0]);else if(objects.length>1)canvas.setActiveObject(new fabric.ActiveSelection(objects,{canvas}));canvas.requestRenderAll();selected();},
        editing(){const o=canvas.getActiveObject();return o instanceof fabric.Textbox && o.isEditing;},
        flush(){return commit();},
        toggle(mark){
          const texts=canvas.getActiveObjects().filter((o):o is Textbox=>o instanceof fabric.Textbox);
          const values=texts.flatMap(o=>{
            const styles=o.isEditing&&o.selectionEnd>o.selectionStart?o.getSelectionStyles(o.selectionStart,o.selectionEnd,true):[o];
            return styles.map(s=>mark==="bold"?s.fontWeight==="bold"||s.fontWeight===700:mark==="italic"?s.fontStyle==="italic":Boolean(s.underline));
          });
          api.current?.format({[mark]:!values.every(Boolean)});
        },
        format(patch){
          const map={...(patch.font?{fontFamily:patch.font}:{}),...(patch.size?{fontSize:patch.size}:{}),...(patch.color?{fill:patch.color}:{}),
            ...(patch.bold!==undefined?{fontWeight:patch.bold?"bold":"normal"}:{}),...(patch.italic!==undefined?{fontStyle:patch.italic?"italic":"normal"}:{}),
            ...(patch.underline!==undefined?{underline:patch.underline}:{})};
          for(const o of canvas.getActiveObjects())if(o instanceof fabric.Textbox){
            const text=o as Textbox;
            if(text.isEditing && text.selectionEnd>text.selectionStart)text.setSelectionStyles(map);
            else {text.set(map);text.setSelectionStyles(map,0,text.text.length);}
            text.initDimensions();text.setCoords();
          }
          canvas.requestRenderAll();commit();
        },
      };
      const observer=new ResizeObserver(()=>{
        // Fit both dimensions with one Fabric zoom, not CSS stretching. The
        // logical 960×540 coordinates and pointer mapping remain unchanged.
        const width=Math.min(host.current?.clientWidth??960,(host.current?.clientHeight??540)*960/540);
        canvas.setDimensions({width,height:width*540/960});canvas.setZoom(width/960);canvas.requestRenderAll();
      });observer.observe(host.current);
      close=()=>{api.current=null;canvasRef.current=null;observer.disconnect();void canvas.dispose();};
      setReady(n=>n+1);
    })().catch(()=>live.current.onError("Canvas could not be loaded."));
    return ()=>{disposed=true;close?.();};
  },[]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas||!ready)return;
    // Consume even a nonmatching marker: undo must not make a later redo look
    // like an already-rendered canvas edit.
    const previousEmission=emitted.current;emitted.current="";
    if(previousEmission===JSON.stringify(slide))return;
    let current=true;
    void import("@/lib/presentation-fabric").then(async adapter=>{
      const selected=[...live.current.selection];
      await adapter.drawSlide(canvas,slide,source,()=>current);
      if(current)api.current?.select(selected);
    }).catch(error=>{if(current)onError(error instanceof Error?error.message:"Slide could not be loaded completely.");});
    return ()=>{current=false;};
  },[slide,source,ready,onError]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    canvas.selection=!disabled;canvas.skipTargetFind=disabled;
    if(disabled){
      for(const o of canvas.getObjects())if("exitEditing" in o&&(o as Textbox).isEditing)(o as Textbox).exitEditing();
      canvas.discardActiveObject();canvas.requestRenderAll();
    }
  },[disabled,ready]);
  return <div ref={host} className="presentation-surface presentation-editable" tabIndex={0} role="group"
    aria-label="Slide canvas. Double click text to edit. Use the object outline and properties for keyboard editing."
    style={disabled?{pointerEvents:"none"}:undefined}><canvas ref={ref}/></div>;
}
