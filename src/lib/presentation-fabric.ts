// Client-only adapter. Fabric's JSON is never an application storage format.
import { ActiveSelection,Canvas, StaticCanvas, Textbox, Rect, Ellipse, Line, Polygon, FabricImage, type FabricObject, util } from "fabric";
import { elementSchema, paragraphs, textOf, type Presentation,type PresentationSlide, type PresentationElement, type TextElement, type RunStyle } from "./presentation";

type BoundObject = FabricObject & { elementId?:string };
export type PresentationCanvas = Canvas | StaticCanvas;
export type AssetSource = (id:string)=>string;
function runStyle(object:Textbox,style:Textbox["styles"][number][number]={}):RunStyle {
  return {font:(style.fontFamily??object.fontFamily) as RunStyle["font"],size:style.fontSize??object.fontSize,
    color:String(style.fill??object.fill),bold:(style.fontWeight??object.fontWeight)==="bold" || (style.fontWeight??object.fontWeight)===700,
    italic:(style.fontStyle??object.fontStyle)==="italic",underline:style.underline??object.underline};
}
function styledRuns(chars:string[],style:(index:number)=>RunStyle):TextElement["paragraphs"][number]["runs"] {
  const runs:TextElement["paragraphs"][number]["runs"]=[];
  chars.forEach((char,index)=>{
    const run={text:char,...style(index)},previous=runs.at(-1);
    if(previous&&JSON.stringify({...previous,text:""})===JSON.stringify({...run,text:""}))previous.text+=char;
    else runs.push(run);
  });
  return runs.length?runs:[{...style(0),text:""}];
}
export function readText(object:Textbox, original:TextElement):TextElement {
  const lines=object.text.split("\n");
  return {...original,align:object.textAlign as TextElement["align"],paragraphs:lines.map((line,lineIndex)=>{
    // Fabric stores styles at native unwrapped paragraph/grapheme indices.
    return {runs:styledRuns(util.string.graphemeSplit(line),index=>runStyle(object,object.styles[lineIndex]?.[index]))};
  })};
}
function makeTextbox(e:TextElement) {
  const first=e.paragraphs[0].runs[0];
  const styles:Textbox["styles"]={};
  e.paragraphs.forEach((p,line)=>{
    styles[line]={};let char=0;
    p.runs.forEach(r=>{
      const style={fontFamily:r.font,fontSize:r.size,fill:r.color,fontWeight:r.bold?"bold":"normal",fontStyle:r.italic?"italic":"normal",underline:r.underline};
      if(!r.text&&!char)styles[line][0]=style;
      for(const unused of util.string.graphemeSplit(r.text)){void unused;styles[line][char++]=style;}
    });
  });
  return new Textbox(textOf(e),{left:e.x,top:e.y,angle:e.rotation,originX:"left",originY:"top",strokeUniform:true,
    width:e.w,fontFamily:first.font,fontSize:first.size,fill:first.color,
    fontWeight:first.bold?"bold":"normal",fontStyle:first.italic?"italic":"normal",underline:first.underline,
    textAlign:e.align,styles,splitByGrapheme:true,lineHeight:1.16,padding:0});
}
export function textLinesForExport(e:TextElement) {
  const object=makeTextbox(e);
  const lines=object.textLines.map((text,line)=>({
    runs:styledRuns(util.string.graphemeSplit(text),char=>runStyle(object,object.getCompleteStyleDeclaration(line,char))),
    paragraphEnd:object.isEndOfWrapping(line),
  }));
  const lineHeight=object.lineHeight;object.dispose();
  return {lines,lineHeight};
}
// One measurement engine for canvas, inspector, save and export. Round width
// before measuring; round required height UP so reconstruction cannot overflow.
export function fitTextElement(e:TextElement):TextElement {
  const object=makeTextbox(e);
  const fitted={...e,w:Math.max(e.w,object.width),h:Math.max(e.h,Math.ceil(object.height*100)/100)};
  object.dispose();
  // Keep the text/style change recoverable when its required geometry is invalid.
  // Rendering stays intrinsic; save/export will explain the actual off-slide text.
  return elementSchema.safeParse(fitted).success?fitted:e;
}
export function fitSlideText(slide:PresentationSlide):PresentationSlide {
  return {...slide,elements:slide.elements.map(e=>e.type==="text"?fitTextElement(e):e)};
}
export function textLayoutError(slide:PresentationSlide):string {
  for(const e of slide.elements)if(e.type==="text"){
    const object=makeTextbox(e);
    const valid=elementSchema.safeParse({...e,w:Math.max(e.w,object.width),h:Math.max(e.h,object.height)}).success;
    object.dispose();
    if(!valid)return `Textbox on "${slide.title}" requires text outside the slide. Reduce font size, increase width, or move the textbox. Nothing was exported/saved.`;
  }
  return "";
}
export async function makeObject(e:PresentationElement,source:AssetSource):Promise<BoundObject> {
  const position={left:e.x,top:e.y,angle:e.rotation,originX:"left" as const,originY:"top" as const,strokeUniform:true};
  let object:BoundObject;
  if(e.type==="text") {
    object=makeTextbox(e);
    object.set({height:Math.max(e.h,object.height)});
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
  canvas.clear();canvas.backgroundColor=slide.background;
  objects.forEach(o=>canvas.add(o));canvas.requestRenderAll();
}
export async function validateTextLayout(doc:Presentation) {
  const fitted={...doc,slides:doc.slides.map(fitSlideText)};
  for(const s of fitted.slides){
    const error=textLayoutError(s);if(error)throw new Error(error);
  }
  return fitted;
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
    const width=o.width*o.scaleX,height=original.type==="text"?original.h*o.scaleY:o.height*o.scaleY;
    let e:PresentationElement={...original,x:Math.round(o.left*100)/100,y:Math.round(o.top*100)/100,w:Math.round(width*100)/100,h:Math.round(height*100)/100,rotation:o.angle};
    if(e.type==="text" && o instanceof Textbox) {
      e=readText(o,e);
      // Textbox uses width for wrapping; scale text sizes on resize instead of saving Fabric scales.
      if(o.scaleX!==1 || o.scaleY!==1) e={...e,paragraphs:e.paragraphs.map(p=>({runs:p.runs.map(r=>({...r,size:r.size*o.scaleY}))}))};
      e=fitTextElement(e);
      if(o.scaleX!==1||o.scaleY!==1||o.width!==e.w){
        // Bake a transform once, using the very same canonical wrap width.
        // Otherwise a second capture scales the reserved height again, and the
        // next inspector font edit is multiplied by a leftover Fabric scale.
        const canonical=makeTextbox(e);
        o.set({width:canonical.width,scaleX:1,scaleY:1,styles:canonical.styles,fontSize:canonical.fontSize,
          fontFamily:canonical.fontFamily,fontWeight:canonical.fontWeight,fontStyle:canonical.fontStyle,
          fill:canonical.fill,underline:canonical.underline});
        o.initDimensions();canonical.dispose();
      }
      o.set({height:Math.max(e.h,o.calcTextHeight())});o.setCoords();
    }
    return e;
  });
  if(selected.length===1 && active)canvas.setActiveObject(active);
  else if(selected.length>1)canvas.setActiveObject(new ActiveSelection(selected,{canvas}));
  return {...slide,elements};
}
export function replaceText(element:TextElement,text:string) {return {...element,paragraphs:paragraphs(text,element.paragraphs[0].runs[0])};}
