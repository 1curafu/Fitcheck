"use client";
import { useEffect,useRef } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import type { ShippedLocale } from "@/lib/i18n/locales";
import { sameOutfitTextSource,type OutfitTextSource,type TranslationResult,type OutfitText } from "@/lib/outfits/text";
import { requestOutfitTexts,refreshOutfitTexts } from "@/app/[locale]/outfits/text-actions";

type Props={sources:OutfitTextSource[];locale:ShippedLocale;onReady?:(result:TranslationResult)=>void};
export function LookTextRequest({sources,locale,onReady}:Props) {
  const {refresh}=useRouter();
  const callback=useRef(onReady);
  useEffect(()=>{callback.current=onReady;},[onReady]);
  const requested=useRef(new Set<string>());
  const requestKey=JSON.stringify({locale,sources:sources.filter(source=>source.sourceLocale!==locale)});
  useEffect(()=>{
    const snapshot=JSON.parse(requestKey) as {locale:ShippedLocale;sources:OutfitTextSource[]};
    if(!snapshot.sources.length) return;
    let cancelled=false;
    let stopWaiting:(()=>void)|undefined;
    const waitOnce=()=>new Promise<void>(resolve=>{
      const timer=setTimeout(resolve,9000);
      stopWaiting=()=>{clearTimeout(timer);resolve();};
    });
    const run=async()=>{
      // StrictMode's first setup is cancelled before any paid request starts.
      await Promise.resolve();
      if(cancelled) return;
      const previouslyRequested=requested.current.has(requestKey);
      requested.current.add(requestKey);
      const ready:OutfitText[]=[];
      const collect=(result:TranslationResult,batch:OutfitTextSource[])=>{
        if(result.locale!==snapshot.locale) return;
        for(const text of result.texts) {
          if(text.translated&&text.locale===snapshot.locale&&batch.some(source=>text.id===source.id&&sameOutfitTextSource(text.source,source))) ready.push(text);
        }
      };
      try {
        // Returning A→B→A rereads the first A's completed cache, without paying again.
        if(previouslyRequested) {await waitOnce();if(cancelled)return;}
        for(let i=0;i<snapshot.sources.length;i+=6) {
          if(cancelled) return;
          const batch=snapshot.sources.slice(i,i+6);
          const input={outfitIds:batch.map(s=>s.id),locale:snapshot.locale};
          const result=await (previouslyRequested?refreshOutfitTexts(input):requestOutfitTexts(input));
          if(cancelled) return;
          collect(result,batch);
          const busy=result.busyIds.filter(id=>input.outfitIds.includes(id));
          if(busy.length) {
            await waitOnce();if(cancelled)return;
            collect(await refreshOutfitTexts({...input,outfitIds:busy}),batch);
          }
        }
      } catch { /* Keep the visible original; a later intentional visit can retry. */ }
      if(cancelled||!ready.length) return;
      const result={locale:snapshot.locale,texts:ready,busyIds:[]};
      if(callback.current) callback.current(result); else refresh();
    };
    void run();
    return ()=>{cancelled=true;stopWaiting?.();};
  },[requestKey,refresh]);
  return null;
}
