import {randomUUID} from "node:crypto";
import {adsDatabase,adsReply,imageExtension} from "@/lib/ads-server";
export const runtime="nodejs";
export async function POST(request:Request) {
  if(Number(request.headers.get("content-length")||0)>5*1024*1024) return adsReply({error:"Image must be smaller than 4 MB."},413);
  try {
    const form=await request.formData(),file=form.get("file");
    if(!(file instanceof File) || file.size===0 || file.size>4*1024*1024) return adsReply({error:"Choose an image smaller than 4 MB."},400);
    const bytes=new Uint8Array(await file.arrayBuffer());const extension=imageExtension(bytes,file.type);
    const path=`ads/${randomUUID()}.${extension}`,db=adsDatabase();
    const {error}=await db.storage.from("storefront-ads").upload(path,bytes,{contentType:file.type,upsert:false,cacheControl:"3600"});
    if(error) return adsReply({error:"Upload failed. Confirm the public storefront-ads bucket exists and accepts PNG/JPG/WebP up to 4 MB."},400);
    return adsReply({url:db.storage.from("storefront-ads").getPublicUrl(path).data.publicUrl});
  }catch(error) {return adsReply({error:error instanceof Error?error.message:"Upload failed."},400);}
}
