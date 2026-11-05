import { presentationSchema, type Presentation } from "./presentation";

// All coordinates are native slide units (72px/in at 960x540). Never screenshots.
export async function presentationPptx(document:Presentation,resolve:(id:string)=>Promise<string>) {
  const doc=presentationSchema.parse(document);
  const {validateTextLayout}=await import("@/lib/presentation-fabric");
  await validateTextLayout(doc);
  const {default:PptxGenJS}=await import("pptxgenjs");
  const pptx=new PptxGenJS();
  pptx.defineLayout({name:"FORGE",width:960/72,height:540/72});pptx.layout="FORGE";
  pptx.author="Forge lesson author";pptx.subject="Presentation slides (quiz excluded)";
  const images=new Map<string,string>();
  for(const s of doc.slides)for(const e of s.elements)if(e.type==="image"&&!images.has(e.assetId)){
    const data=await resolve(e.assetId);
    if(!/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data))throw new Error(`Missing or unsupported image: ${e.alt}`);
    images.set(e.assetId,data);
  }
  for(const s of doc.slides){
    const slide=pptx.addSlide();slide.background={color:s.background.slice(1)};
    for(const e of s.elements){
      // Fabric/canonical rotation pivots at top-left; OOXML pivots at center.
      // Translate the center so the rotated visual position is unchanged.
      const radians=e.rotation*Math.PI/180;
      const bounds={x:(e.x+Math.cos(radians)*e.w/2-Math.sin(radians)*e.h/2-e.w/2)/72,
        y:(e.y+Math.sin(radians)*e.w/2+Math.cos(radians)*e.h/2-e.h/2)/72,
        w:e.w/72,h:e.h/72,rotate:((e.rotation%360)+360)%360};
      if(e.type==="text"){
        const runs=e.paragraphs.flatMap((p,index)=>[
          ...p.runs.map(r=>({text:r.text,options:{fontFace:r.font,fontSize:r.size,color:r.color.slice(1),bold:r.bold,italic:r.italic,underline:r.underline?{style:"sng" as const}:undefined}})),
          ...(index<e.paragraphs.length-1?[{text:"\n",options:{}}]:[]),
        ]);
        slide.addText(runs,{...bounds,margin:0,align:e.align,valign:"top",breakLine:false,paraSpaceAfter:0,lang:"zh-CN"});
      } else if(e.type==="image")slide.addImage({...bounds,data:images.get(e.assetId)!,altText:e.alt});
      else {
        const shape={rect:pptx.ShapeType.rect,roundedrect:pptx.ShapeType.roundRect,ellipse:pptx.ShapeType.ellipse,line:pptx.ShapeType.line,arrow:pptx.ShapeType.rightArrow}[e.shape];
        if(!shape)throw new Error("Unsupported shape; export was cancelled.");
        slide.addShape(shape,{...bounds,fill:{color:e.fill.slice(1)},line:{color:e.stroke.slice(1),width:e.strokeWidth}});
      }
    }
  }
  return pptx.write({outputType:"blob"}) as Promise<Blob>;
}
export async function fetchAssetData(url:string):Promise<string> {
  const response=await fetch(url,{credentials:"same-origin",cache:"no-store"});
  if(!response.ok)throw new Error("An image is unavailable. PPTX export was cancelled.");
  const blob=await response.blob();
  if(!["image/png","image/jpeg"].includes(blob.type) || blob.size>4*1024*1024)throw new Error("Unsupported image response.");
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Could not read the image."));reader.readAsDataURL(blob);});
}
