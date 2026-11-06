import { createClient } from "@supabase/supabase-js";

// Ads routes intentionally have no server authentication in this version.
export function adsDatabase() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL and the private SUPABASE_SERVICE_ROLE_KEY.");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function adsReply(value: unknown,status=200) {
  return Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
}
export function imageExtension(bytes: Uint8Array,mime: string) {
  if(mime==="image/png" && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return "png";
  if(mime==="image/jpeg" && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "jpg";
  if(mime==="image/webp" && new TextDecoder().decode(bytes.slice(0,4))==="RIFF" && new TextDecoder().decode(bytes.slice(8,12))==="WEBP") return "webp";
  throw new Error("Choose a valid PNG, JPG or WebP image.");
}
