"use client";
import {PresentationView} from "@/components/presentation-view";
import {newSlide,newText} from "@/lib/presentation";
import {presentationPptx} from "@/lib/presentation-export";
export default function PackagingGate(){
  const slide={...newSlide(),elements:[newText("中文")]};
  return <><PresentationView slide={slide}/><button onClick={()=>void presentationPptx({schemaVersion:1,width:960,height:540,slides:[slide]},async()=>{throw new Error("No images");})}>Export packaging gate</button></>;
}
