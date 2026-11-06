"use client";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabaseClient";
import type {PublicAd} from "@/lib/ads";
export function usePublicAds() {
  const [ads,setAds]=useState<PublicAd[]>([]);
  useEffect(()=>{
    let live=true,sequence=0;let refreshTimer:ReturnType<typeof setTimeout>|undefined,expiryTimer:ReturnType<typeof setTimeout>|undefined;
    async function refresh(){const id=++sequence;clearTimeout(refreshTimer);const started=performance.now();try{
      const {data,error}=await supabase.rpc("get_storefront_ads");if(!live||id!==sequence)return;if(error||!data||!Array.isArray(data.ads))throw new Error();
      const clock=Date.parse(data.server_now)+(performance.now()-started);if(!Number.isFinite(clock))throw new Error();
      const received=performance.now();const rows=data.ads as PublicAd[];clearTimeout(expiryTimer);
      function expire(){if(!live)return;const now=clock+performance.now()-received;const visible=rows.filter(ad=>!ad.ends_at||Date.parse(ad.ends_at)>now);setAds(visible);const ends=visible.filter(ad=>ad.ends_at).map(ad=>Date.parse(ad.ends_at!));if(ends.length)expiryTimer=setTimeout(expire,Math.min(2147483647,Math.max(1,Math.ceil(Math.min(...ends)-now)+1)));}
      expire();const next=Date.parse(data.next_change_at);refreshTimer=setTimeout(refresh,Math.max(100,Math.min(30000,Number.isFinite(next)?next-clock+25:30000)));
    }catch{if(live&&id===sequence)refreshTimer=setTimeout(refresh,30000);}}
    const focus=()=>{if(!document.hidden)void refresh();};void refresh();window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);
    return()=>{live=false;sequence++;clearTimeout(refreshTimer);clearTimeout(expiryTimer);window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus);};
  },[]);
  return ads;
}
