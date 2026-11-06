"use client";
import {useEffect,useState} from "react";
import {displayEasternDay,easternDay,type StorefrontAd} from "@/lib/ads";
const empty=()=>({title:"",message:"",kind:"text",enabled:false,sort_order:0,desktop_image_url:null,mobile_image_url:null,alt_text:"",link_url:null,cta_label:"",starts_at:null,ends_at:null}) as Omit<StorefrontAd,"id"|"created_at"|"updated_at"> & Partial<Pick<StorefrontAd,"id"|"updated_at">>;
const input="mt-1 w-full rounded-xl border border-[#D8D1C8] bg-white px-3 py-2 text-sm text-[#5F554C] outline-none focus:border-[#A79B8E]";
const button="rounded-full border border-[#D8D1C8] bg-white px-4 py-2 text-sm font-semibold text-[#5F554C] disabled:opacity-40";
export default function AdsManager() {
  const [loaded,setLoaded]=useState(false);const [checking,setChecking]=useState(true);
  const [ads,setAds]=useState<StorefrontAd[]>([]);const [draft,setDraft]=useState<ReturnType<typeof empty>|null>(null);
  const [start,setStart]=useState("");const [end,setEnd]=useState("");const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");
  async function api(method:string,payload?:unknown,path="/api/admin/ads") {
    const response=await fetch(path,{method,headers:{...(payload instanceof FormData?{}:{"Content-Type":"application/json"})},body:payload===undefined?undefined:payload instanceof FormData?payload:JSON.stringify(payload),cache:"no-store"});
    const result=await response.json();if(!response.ok) {throw new Error(result.error||"Request failed.");}return result;
  }
  async function load() {const result=await api("GET");setAds(result.ads);setLoaded(true);}
  async function perform(action:()=>Promise<void>) {setBusy(true);setNotice("");try{await action();}catch(error){setNotice(error instanceof Error?error.message:"Unable to complete action.");}finally{setBusy(false);}}
  useEffect(()=>{
    let active=true;
    // Load ads directly; the Master Admin browser login remains unchanged.
    void fetch("/api/admin/ads",{cache:"no-store"}).then(async response=>{
      const result=await response.json();if(!active)return;
      if(response.ok){setAds(result.ads);setLoaded(true);}
      else setNotice(result.error||"Unable to load ads.");
    }).catch(()=>{if(active)setNotice("Unable to load ads. Check the server configuration.");})
      .finally(()=>{if(active)setChecking(false);});
    return ()=>{active=false;};
  },[]);
  if(checking)return <section className="rounded-[24px] border border-[#E6E0D8] bg-white p-6"><h2 className="text-lg font-bold">Ads / Banners</h2><p role="status" className="mt-2 text-sm text-[#8F8276]">Loading ads…</p></section>;
  function edit(ad?:StorefrontAd){setDraft(ad?{...ad}:empty());setStart(ad?displayEasternDay(ad.starts_at):"");setEnd(ad?displayEasternDay(ad.ends_at,true):"");setNotice("");}
  function change(value:Partial<ReturnType<typeof empty>>){setDraft(row=>row?{...row,...value}:row);}
  async function upload(file:File|undefined,field:"desktop_image_url"|"mobile_image_url") {if(!file)return;await perform(async()=>{const form=new FormData();form.append("file",file);const result=await api("POST",form,"/api/admin/ads/upload");change({[field]:result.url});setNotice("Artwork uploaded. Save the ad to use it.");});}
  if(!loaded)return <section className="rounded-[24px] border border-[#E6E0D8] bg-white p-6"><h2 className="text-lg font-bold">Ads / Banners</h2><p role="status" className="my-3 text-sm text-red-700">{notice}</p><button disabled={busy} onClick={()=>void perform(load)} className={button}>Retry</button></section>;
  return <section className="space-y-5 text-[#5F554C]">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Ads / Banners</h2><p className="mt-1 text-sm text-[#8F8276]">Independent advertisements. Mentioning a code here does not create a checkout coupon.</p></div><div className="flex gap-2"><button disabled={busy} onClick={()=>edit()} className={button}>New ad</button><button disabled={busy} onClick={()=>void perform(load)} className={button}>Refresh</button></div></div>
    <p role="status" className="text-sm text-[#8F8276]">{notice}</p>
    {draft && <form onSubmit={e=>{e.preventDefault();void perform(async()=>{await api(draft.id?"PUT":"POST",{...draft,starts_at:easternDay(start),ends_at:easternDay(end,true)});setDraft(null);await load();setNotice("Ad saved. Storefront changes appear within 30 seconds or on refresh.");});}} className="rounded-[24px] border border-[#E6E0D8] bg-white p-5">
      <h3 className="mb-4 font-bold">{draft.id?"Edit ad":"New ad"}</h3><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">Headline<input required maxLength={100} value={draft.title} onChange={e=>change({title:e.target.value})} className={input}/></label>
        <label className="text-xs font-semibold">Format<select value={draft.kind} onChange={e=>change({kind:e.target.value as StorefrontAd["kind"]})} className={input}><option value="text">Text / link</option><option value="image">Image</option><option value="instagram">Instagram — compact two lines</option></select></label>
        <label className="text-xs font-semibold sm:col-span-2">Supporting text<textarea maxLength={300} value={draft.message} onChange={e=>change({message:e.target.value})} className={input}/></label>
        <label className="text-xs font-semibold">Link URL<input type="url" placeholder="https://…" value={draft.link_url||""} onChange={e=>change({link_url:e.target.value||null})} className={input}/></label>
        <label className="text-xs font-semibold">Link / button label<input maxLength={60} value={draft.cta_label} onChange={e=>change({cta_label:e.target.value})} className={input}/></label>
        <label className="text-xs font-semibold">Start date — Eastern Time<input type="date" value={start} onChange={e=>setStart(e.target.value)} className={input}/></label>
        <label className="text-xs font-semibold">Last active date — Eastern Time<input type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)} className={input}/></label>
        <p className="text-xs leading-5 text-[#8F8276] sm:col-span-2">Blank dates mean no time restriction. Start is midnight; the last date includes its entire day in America/New_York.</p>
        <label className="text-xs font-semibold">Display order — lower first<input type="number" min={0} max={10000} value={draft.sort_order} onChange={e=>change({sort_order:Number(e.target.value)})} className={input}/></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.enabled} onChange={e=>change({enabled:e.target.checked})}/>Enabled</label>
        {draft.kind==="image" && <><label className="text-xs font-semibold">Desktop image — 1600 × 240<input disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0],"desktop_image_url")} className="mt-2 block w-full text-xs"/>{draft.desktop_image_url&&<><img src={draft.desktop_image_url} alt="Desktop artwork preview" className="mt-2 max-h-28 w-full rounded-xl object-contain"/><button type="button" disabled={busy} onClick={()=>change({desktop_image_url:null})} className="mt-1 text-xs underline">Clear desktop selection</button></>}</label>
        <label className="text-xs font-semibold">Mobile image — 1200 × 300<input disabled={busy} type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void upload(e.target.files?.[0],"mobile_image_url")} className="mt-2 block w-full text-xs"/>{draft.mobile_image_url&&<><img src={draft.mobile_image_url} alt="Mobile artwork preview" className="mt-2 max-h-28 w-full rounded-xl object-contain"/><button type="button" disabled={busy} onClick={()=>change({mobile_image_url:null})} className="mt-1 text-xs underline">Clear mobile selection</button></>}</label>
        <label className="text-xs font-semibold sm:col-span-2">Image alternative text<input maxLength={300} value={draft.alt_text} onChange={e=>change({alt_text:e.target.value})} className={input}/></label><p className="text-xs text-[#8F8276] sm:col-span-2">PNG, JPG or WebP, up to 4 MB. Supply both sizes to avoid cropping; one supplied image is used as a fallback on both screens.</p></>}
      </div><div className="mt-5 flex gap-2"><button disabled={busy} className="rounded-full bg-[#A79B8E] px-6 py-2 text-sm font-bold text-white disabled:opacity-40">{busy?"Working…":"Save ad"}</button><button disabled={busy} type="button" onClick={()=>setDraft(null)} className={button}>Cancel</button></div>
    </form>}
    {!ads.length && <p className="rounded-2xl border border-[#E6E0D8] bg-white p-5 text-sm">No ads yet. Create one as disabled, inspect it, then enable it when ready.</p>}
    {ads.map(ad=><article key={ad.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E6E0D8] bg-white p-4"><div><h3 className="font-bold">{ad.title}</h3><p className="mt-1 text-xs text-[#8F8276]">{ad.kind} · Order {ad.sort_order} · {ad.enabled?"Enabled":"Disabled"} · {displayEasternDay(ad.starts_at)||"Any start"} → {displayEasternDay(ad.ends_at,true)||"No end"} ET</p><p className="mt-1 text-xs text-[#8F8276]">Enabled ads appear only within their scheduled dates.</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>edit(ad)} className={button}>Edit</button><button disabled={busy} onClick={()=>void perform(async()=>{await api("PUT",{...ad,enabled:!ad.enabled});await load();})} className={button}>{ad.enabled?"Disable":"Enable"}</button><button disabled={busy} onClick={()=>{if(window.confirm(`Delete “${ad.title}”? This cannot be undone.`))void perform(async()=>{await api("DELETE",{id:ad.id,updated_at:ad.updated_at});await load();});}} className={`${button} text-red-700`}>Delete</button></div></article>)}
  </section>;
}
