import sharp from "sharp";
export const MAX_IMAGE_BYTES=4*1024*1024;
export async function sanitizePresentationImage(bytes:Uint8Array) {
  if(bytes.length<12 || bytes.length>MAX_IMAGE_BYTES)throw new Error("Use a PNG/JPEG image no larger than 4 MiB.");
  const png=Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!png&&!jpeg)throw new Error("Only signed PNG/JPEG files are accepted. SVG and remote URLs are not supported.");
  const image=sharp(bytes,{limitInputPixels:16_000_000,animated:false,failOn:"warning"});
  const meta=await image.metadata();
  if(!meta.width||!meta.height||meta.width>8000||meta.height>8000||(meta.pages??1)!==1||
    meta.width*meta.height>16_000_000||meta.format!==(png?"png":"jpeg"))throw new Error("Use a single image up to 8,000px per side and 16 megapixels.");
  // No withMetadata(): EXIF, GPS, XMP, ICC and original names are not retained.
  const {data,info}=await image.rotate().toColourspace("srgb").png({compressionLevel:9}).toBuffer({resolveWithObject:true});
  if(data.length>MAX_IMAGE_BYTES)throw new Error("The sanitized image exceeds 4 MiB. Resize it before uploading.");
  return {data,width:info.width,height:info.height,mime:"image/png" as const};
}
