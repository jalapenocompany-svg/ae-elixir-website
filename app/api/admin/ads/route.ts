import {adsDatabase,adsReply} from "@/lib/ads-server";
import {validateAd} from "@/lib/ads";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request) {
  try {
    const {data,error}=await adsDatabase().from("storefront_ads").select("*").order("sort_order").order("created_at").limit(201);
    if(error) throw new Error("Unable to load ads. Confirm the ads SQL setup and server configuration.");
    if(data.length>200) throw new Error("More than 200 ads exist. Archive unused ads before continuing.");
    return adsReply({ads:data});
  } catch(error) {return adsReply({error:error instanceof Error?error.message:"Unable to load ads."},503);}
}
async function write(request:Request,method:"POST"|"PUT"|"DELETE") {
  try {
    if(Number(request.headers.get("content-length")||0)>20000) return adsReply({error:"Ad request is too large."},413);
    const raw=await request.text();if(raw.length>20000) return adsReply({error:"Ad request is too large."},413);
    const body=JSON.parse(raw);const db=adsDatabase();
    if(method==="POST") {
      const payload=validateAd(body);
      const {data,error}=await db.from("storefront_ads").insert(payload).select("*").single();
      if(error) return adsReply({error:"Ad could not be created. Check its fields and database setup."},400);
      return adsReply({ad:data},201);
    }
    if(typeof body.id!=="string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.updated_at!=="string" || !Number.isFinite(Date.parse(body.updated_at))) return adsReply({error:"Missing saved ad identity. Reload the list."},400);
    const query=method==="DELETE"?db.from("storefront_ads").delete():db.from("storefront_ads").update(validateAd(body));
    const {data,error}=await query.eq("id",body.id).eq("updated_at",body.updated_at).select("id");
    if(error) return adsReply({error:"Ad could not be saved. Check its fields."},400);
    if(!data?.length) return adsReply({error:"This ad changed or was removed elsewhere. Reload before editing."},409);
    return adsReply({success:true});
  } catch(error) {return adsReply({error:error instanceof SyntaxError?"Invalid request.":error instanceof Error?error.message:"Unable to save ad."},400);}
}
export const POST=(request:Request)=>write(request,"POST");
export const PUT=(request:Request)=>write(request,"PUT");
export const DELETE=(request:Request)=>write(request,"DELETE");
