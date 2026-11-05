// Client-only adapter. Fabric's JSON is never an application storage format.
import { ActiveSelection,Canvas, StaticCanvas, Textbox, Rect, Ellipse, Line, Polygon, FabricImage, type FabricObject, util } from "fabric";
import { defaultRun, paragraphs, textOf, type Presentation,type PresentationSlide, type PresentationElement, type TextElement, type RunStyle } from "./presentation";

type BoundObject = FabricObject & { elementId?:string };
export type PresentationCanvas = Canvas | StaticCanvas;
export type AssetSource = (id:string)=>string;
export function readText(object:Textbox, original:TextElement):TextElement {
  const lines=object.text.split("\n");
  return {...original,align:object.textAlign as TextElement["align"],paragraphs:lines.map((line,lineIndex)=>{
    const runs:TextElement["paragraphs"][number]["runs"]=[];
    for(const [index,char] of util.string.graphemeSplit(line).entries()) {
      // Fabric maps wrapped visual lines back to native unwrapped paragraph indices.
      const style=object.styles[lineIndex]?.[index]??{};
      const run={text:char,font:(style.fontFamily??object.fontFamily) as RunStyle["font"],size:style.fontSize??object.fontSize,
        color:String(style.fill??object.fill),bold:(style.fontWeight??object.fontWeight)==="bold" || (style.fontWeight??object.fontWeight)===700,
        italic:(style.fontStyle??object.fontStyle)==="italic",underline:style.underline??object.underline};
      const previous=runs.at(-1);
      if(previous && JSON.stringify({...previous,text:""})===JSON.stringify({...run,text:""}))previous.text+=char;
      else runs.push(run);
    }
    return {runs:runs.length?runs:[{...defaultRun,text:""}]};
  })};
}
export async function makeObject(e:PresentationElement,source:AssetSource):Promise<BoundObject> {
  const position={left:e.x,top:e.y,angle:e.rotation,originX:"left" as const,originY:"top" as const,strokeUniform:true};
  let object:BoundObject;
  if(e.type==="text") {
    const first=e.paragraphs[0].runs[0];
    const styles:Textbox["styles"]={};
    e.paragraphs.forEach((p,line)=>{
      styles[line]={};let char=0;
      p.runs.forEach(r=>{for(const unused of util.string.graphemeSplit(r.text)){
        void unused; styles[line][char++]={fontFamily:r.font,fontSize:r.size,fill:r.color,fontWeight:r.bold?"bold":"normal",fontStyle:r.italic?"italic":"normal",underline:r.underline};
      }});
    });
    object=new Textbox(textOf(e),{...position,width:e.w,fontFamily:first.font,fontSize:first.size,fill:first.color,
      fontWeight:first.bold?"bold":"normal",fontStyle:first.italic?"italic":"normal",underline:first.underline,
      textAlign:e.align,styles,splitByGrapheme:true,lineHeight:1.16,padding:0});
  } else if(e.type==="image") {
    object=await FabricImage.fromURL(source(e.assetId),{},position);
    object.set({scaleX:e.w/object.width,scaleY:e.h/object.height,lockScalingFlip:true});
    object.setControlsVisibility({mt:false,mb:false,ml:false,mr:false});
  } else {
    const style={...position,fill:e.fill,stroke:e.stroke,strokeWidth:e.strokeWidth};
    if(e.shape==="ellipse") object=new Ellipse({...style,rx:e.w/2,ry:e.h/2});
    else if(e.shape==="line")object=new Line([0,0,e.w,e.h],{...style,fill:undefined});
    else if(e.shape==="arrow")object=new Polygon([{x:0,y:e.h*.35},{x:e.w*.7,y:e.h*.35},{x:e.w*.7,y:0},{x:e.w,y:e.h*.5},{x:e.w*.7,y:e.h},{x:e.w*.7,y:e.h*.65},{x:0,y:e.h*.65}],style);
    else object=new Rect({...style,width:e.w,height:e.h,rx:e.shape==="roundedrect"?16:0,ry:e.shape==="roundedrect"?16:0});
  }
  object.elementId=e.id;
  object.set({cornerColor:"#147d64",borderColor:"#147d64",transparentCorners:false,minScaleLimit:.02});
  return object;
}
export async function drawSlide(canvas:PresentationCanvas,slide:PresentationSlide,source:AssetSource,isCurrent=()=>true) {
  const results=await Promise.allSettled(slide.elements.map(e=>makeObject(e,source)));
  const objects=results.flatMap(r=>r.status==="fulfilled"?[r.value]:[]);
  if(results.some(r=>r.status==="rejected")){objects.forEach(o=>o.dispose());throw new Error("An image could not be loaded.");}
  if(!isCurrent()){objects.forEach(o=>o.dispose());return;}
  for(const [i,e]of slide.elements.entries())if(e.type==="text"&&objects[i].height>e.h+.5){
    objects.forEach(o=>o.dispose());throw new Error(`Textbox on "${slide.title}" exceeds its height. Increase Height, reduce font size, or split the text.`);
  }
  canvas.clear();canvas.backgroundColor=slide.background;
  objects.forEach(o=>canvas.add(o));canvas.requestRenderAll();
}
export async function validateTextLayout(doc:Presentation) {
  for(const s of doc.slides)for(const e of s.elements)if(e.type==="text"){
    const object=await makeObject(e,()=>{throw new Error("Text validation cannot load images.");});
    const height=object.height;object.dispose();
    if(height>e.h+.5)throw new Error(`Textbox on "${s.title}" exceeds its height. Increase Height, reduce font size, or split the text. Nothing was exported/saved.`);
  }
}
export function objectId(o:FabricObject){return (o as BoundObject).elementId;}
export function captureSlide(canvas:Canvas,slide:PresentationSlide):PresentationSlide {
  // Temporarily discard the ActiveSelection: group-relative coordinates are not storage coordinates.
  const active=canvas.getActiveObject();
  const selected=canvas.getActiveObjects();
  if(selected.length>1)canvas.discardActiveObject();
  const elements=canvas.getObjects().map(o=>{
    const original=slide.elements.find(e=>e.id===objectId(o));
    if(!original)throw new Error("Unknown canvas object.");
    const width=o.width*o.scaleX,height=o.height*o.scaleY;
    let e:PresentationElement={...original,x:Math.round(o.left*100)/100,y:Math.round(o.top*100)/100,w:Math.round(width*100)/100,h:Math.round(height*100)/100,rotation:o.angle};
    if(e.type==="text" && o instanceof Textbox) {
      e=readText(o,e);
      // Textbox uses width for wrapping; scale text sizes on resize instead of saving Fabric scales.
      if(o.scaleX!==1 || o.scaleY!==1) e={...e,paragraphs:e.paragraphs.map(p=>({runs:p.runs.map(r=>({...r,size:r.size*o.scaleY}))}))};
    }
    return e;
  });
  if(selected.length===1 && active)canvas.setActiveObject(active);
  else if(selected.length>1)canvas.setActiveObject(new ActiveSelection(selected,{canvas}));
  return {...slide,elements};
}
export function replaceText(element:TextElement,text:string) {return {...element,paragraphs:paragraphs(text,element.paragraphs[0].runs[0])};}
