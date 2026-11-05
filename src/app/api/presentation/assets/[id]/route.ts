import {NextResponse} from "next/server";
import {authorizedPresentationAsset,PRESENTATION_BUCKET} from "@/lib/presentation-assets-server";
import {database} from "@/lib/learning-server";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"};
  try{
    const url=new URL(request.url);
    const asset=await authorizedPresentationAsset((await params).id,{draft:url.searchParams.get("draft")??undefined,lesson:url.searchParams.get("lesson")??undefined});
    const {data,error}=await database().storage.from(PRESENTATION_BUCKET).download(asset.storage_path);
    if(error||!data||data.size!==asset.bytes)throw new Error("Image unavailable.");
    return new NextResponse(data,{headers:{...headers,"Content-Type":"image/png","Content-Length":String(data.size)}});
  }catch{return NextResponse.json({error:"Image unavailable."},{status:404,headers});}
}
