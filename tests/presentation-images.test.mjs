import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {sanitizePresentationImage} from "../src/lib/presentation-images.ts";
test("private images validate signature/dimensions, re-encode and strip metadata without remote parsers",async()=>{
  const source=await sharp({create:{width:120,height:60,channels:3,background:"#ff0000"}}).withMetadata({orientation:6}).jpeg().toBuffer();
  const clean=await sanitizePresentationImage(source);
  const meta=await sharp(clean.data).metadata();
  assert.equal(meta.format,"png");assert.equal(meta.width,60);assert.equal(meta.height,120);
  assert.equal(meta.exif,undefined);assert.equal(meta.icc,undefined);assert.equal(meta.xmp,undefined);
  for(const bytes of [Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),Buffer.alloc(4*1024*1024+1),Buffer.from([255,216,255,...Array(20).fill(0)])]){
    await assert.rejects(()=>sanitizePresentationImage(bytes));
  }
  const huge=await sharp({create:{width:8001,height:1,channels:3,background:"#fff"}}).png().toBuffer();
  await assert.rejects(()=>sanitizePresentationImage(huge),/8,000px/);
});
