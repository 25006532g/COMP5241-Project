"use server";

import {z} from "zod";
import {accessibleLesson,canEditLesson,currentUser,database,isAdmin} from "@/lib/learning-server";
import {cleanupPresentationAssets,ownedPresentationDraft,PRESENTATION_BUCKET} from "@/lib/presentation-assets-server";
import {sanitizePresentationImage} from "@/lib/presentation-images";

export async function beginPresentationDraft(lessonId?:string):Promise<{id?:string;error?:string}> {
  try{
    const user=await currentUser();
    if(lessonId){const lesson=await accessibleLesson(z.uuid().parse(lessonId),user,true);if(!lesson||!canEditLesson(user,lesson))throw new Error("You cannot edit this lesson.");}
    const {data,error}=await database().rpc("forge_begin_presentation_draft",{request_owner:user.id,request_lesson:lessonId??null});
    if(error||!z.uuid().safeParse(data).success)throw new Error("Could not start image storage. Check the presentation migration or discard old drafts.");
    return {id:data};
  }catch(error){return {error:error instanceof Error?error.message:"Image draft unavailable."};}
}
export async function uploadPresentationImage(form:FormData):Promise<{id?:string;width?:number;height?:number;error?:string}> {
  let reserved:string|undefined;
  try{
    const user=await currentUser();
    const {draft,lesson}=await ownedPresentationDraft(z.uuid().parse(form.get("draftId")),user);
    const file=form.get("image");
    if(!(file instanceof File))throw new Error("Choose a PNG/JPEG file.");
    if(file.size>4*1024*1024)throw new Error("Use an image no larger than 4 MiB.");
    const image=await sanitizePresentationImage(new Uint8Array(await file.arrayBuffer()));
    const id=crypto.randomUUID(),path=`${draft.id}/${id}.png`;
    const client=database();
    const {error:reserveError}=await client.rpc("forge_reserve_presentation_asset",{request_draft:draft.id,request_editor:user.id,request_owner:lesson?.owner_id??user.id,
      request_id:id,request_path:path,request_bytes:image.data.length,request_width:image.width,request_height:image.height});
    if(reserveError)throw new Error("Image storage limit reached or draft expired (64 MiB per draft).");
    reserved=id;
    const {error}=await client.storage.from(PRESENTATION_BUCKET).upload(path,image.data,{contentType:"image/png",upsert:false});
    if(error)throw new Error("Image upload was not confirmed. Reserved metadata is retained for cleanup.");
    const {data,error:readyError}=await client.from("forge_presentation_assets").update({status:"ready"}).eq("id",id).eq("status","pending").select("id").single();
    if(readyError||!data)throw new Error("Image upload acknowledgement failed. Retry with a new upload; this reservation will be cleaned.");
    return {id,width:image.width,height:image.height};
  }catch(error){return {error:`${error instanceof Error?error.message:"Image upload failed."}${reserved?" Unused uploads remain private until draft cleanup.":""}`};}
}
export async function discardPresentationDraft(id:string):Promise<{error?:string;success?:string}> {
  try{
    const user=await currentUser();await ownedPresentationDraft(id,user,true);
    const {error}=await database().from("forge_presentation_drafts").update({expires_at:new Date().toISOString()}).eq("id",id).eq("owner_id",user.id);
    if(error)throw new Error("Could not discard the image draft.");
    await cleanupPresentationAssets(user.id);
    return {success:"Unused private images removed. Saved lesson images are retained."};
  }catch(error){return {error:error instanceof Error?error.message:"Draft cleanup failed. Retry."};}
}
export async function cleanExpiredPresentationUploads():Promise<{error?:string;success?:string}> {
  try{const user=await currentUser();await cleanupPresentationAssets(isAdmin(user)?null:user.id);return {success:"Expired unused uploads cleaned."};}
  catch(error){return {error:error instanceof Error?error.message:"Cleanup failed."};}
}
