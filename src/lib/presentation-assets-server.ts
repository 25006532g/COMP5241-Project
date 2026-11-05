import "server-only";
import {z} from "zod";
import {accessibleLesson,canEditLesson,currentUser,database,type LessonRow} from "./learning-server";
import {assetIds,type Presentation} from "./presentation";
import {collectRows} from "./learning";

export const PRESENTATION_BUCKET="forge-presentation-images";
export async function ownedPresentationDraft(id:string,user:Awaited<ReturnType<typeof currentUser>>,allowExpired=false) {
  const {data,error}=await database().from("forge_presentation_drafts").select("*").eq("id",z.uuid().parse(id)).eq("owner_id",user.id).maybeSingle();
  if(error||!data||!allowExpired&&Date.parse(data.expires_at)<Date.now())throw new Error("Image draft expired or unavailable. Reopen the lesson before uploading.");
  let lesson:LessonRow|null=null;
  if(data.lesson_id){lesson=await accessibleLesson(data.lesson_id,user,true);if(!lesson||!canEditLesson(user,lesson))throw new Error("You cannot edit this lesson.");}
  return {draft:data,lesson};
}
export async function validatePresentationAssets(doc:Presentation,draftId:unknown,user:Awaited<ReturnType<typeof currentUser>>,lesson?:LessonRow) {
  const ids=assetIds(doc);if(!ids.length&&!draftId)return;
  const draft=draftId?(await ownedPresentationDraft(z.uuid().parse(draftId),user)).draft:undefined;
  if(draft?(draft.lesson_id??undefined)!==lesson?.id:!lesson)throw new Error("Image draft does not match this lesson.");
  if(!ids.length)return;
  const data=await collectRows((start,end)=>database().from("forge_presentation_assets").select("id,draft_id,width,height,status").in("id",ids).order("id").range(start,end));
  if(data.length!==ids.length)throw new Error("One or more images are unavailable. Nothing was saved.");
  const previous=new Set(lesson&&"format" in lesson.content?assetIds({schemaVersion:1,width:960,height:540,slides:lesson.content.slides}):[]);
  const origins=lesson?await collectRows((start,end)=>database().from("forge_presentation_drafts").select("id,lesson_id").in("id",[...new Set(data.map(a=>a.draft_id))]).eq("lesson_id",lesson.id).order("id").range(start,end)):[];
  const allowedOrigins=new Set(origins.map(d=>d.id));
  for(const image of data){
    if(image.status!=="ready" || image.draft_id!==draft?.id&&!previous.has(image.id)&&!allowedOrigins.has(image.draft_id))throw new Error("Image is not authorized for this lesson/draft.");
    for(const s of doc.slides)for(const e of s.elements)if(e.type==="image"&&e.assetId===image.id&&Math.abs(e.ratio-image.width/image.height)>.001)throw new Error("Image dimensions do not match the stored asset.");
  }
}
export async function bindPresentationDraft(draftId:unknown,userId:string,lessonId:string) {
  if(!draftId)return;
  const {data,error}=await database().from("forge_presentation_drafts").update({lesson_id:lessonId,expires_at:new Date(Date.now()+7*86400000).toISOString()})
    .eq("id",z.uuid().parse(draftId)).eq("owner_id",userId).select("id").single();
  if(error||!data)throw new Error("Image draft binding was not confirmed. Reopen the saved lesson before continuing.");
}
export async function authorizedPresentationAsset(id:string,scope:{draft?:string;lesson?:string}) {
  const user=await currentUser();const assetId=z.uuid().parse(id);
  if(scope.draft){
    await ownedPresentationDraft(scope.draft,user);
    const {data,error}=await database().from("forge_presentation_assets").select("*").eq("id",assetId).eq("status","ready").maybeSingle();
    if(error||!data)throw new Error("Image unavailable.");
    // Existing lesson assets can be viewed while editing in a new draft.
    if(data.draft_id!==scope.draft){
      const {lesson}=await ownedPresentationDraft(scope.draft,user);
      const {data:origin}=await database().from("forge_presentation_drafts").select("lesson_id").eq("id",data.draft_id).maybeSingle();
      if(!lesson||origin?.lesson_id!==lesson.id&&(!("format" in lesson.content)||!assetIds({schemaVersion:1,width:960,height:540,slides:lesson.content.slides}).includes(assetId)))throw new Error("Image unavailable.");
    }
    return data;
  }
  const lesson=await accessibleLesson(z.uuid().parse(scope.lesson),user,true);
  if(!lesson||!("format" in lesson.content)||!assetIds({schemaVersion:1,width:960,height:540,slides:lesson.content.slides}).includes(assetId))throw new Error("Image unavailable.");
  const {data,error}=await database().from("forge_presentation_assets").select("*").eq("id",assetId).eq("status","ready").maybeSingle();
  if(error||!data)throw new Error("Image unavailable.");
  return data;
}

// Cleanup is explicit and retryable. The SQL claim excludes every persisted
// reference and marks assets deleting before blob removal, blocking racing saves.
export async function cleanupPresentationAssets(ownerId:string|null,accountDeletion=false) {
  const client=database();
  const {data,error}=await client.rpc("forge_claim_presentation_cleanup",{request_owner:ownerId,deleting_account:accountDeletion});
  if(error||!Array.isArray(data))throw new Error("Image cleanup unavailable. Ask an administrator to check the presentation migration.");
  for(const asset of data){
    const {error:removeError}=await client.storage.from(PRESENTATION_BUCKET).remove([asset.storage_path]);
    if(removeError)throw new Error("Private image cleanup failed. Retry; metadata is retained for cleanup.");
    const {error:rowError}=await client.from("forge_presentation_assets").delete().eq("id",asset.id).eq("status","deleting");
    if(rowError)throw new Error("Image cleanup is incomplete. Retry.");
  }
}
