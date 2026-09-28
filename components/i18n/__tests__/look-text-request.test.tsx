import { act,render,waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import type { ShippedLocale } from "@/lib/i18n/locales";
import type { TranslationResult,OutfitTextSource } from "@/lib/outfits/text";
const state=vi.hoisted(()=>({request:vi.fn(),read:vi.fn(),refresh:vi.fn()}));
vi.mock("@/app/[locale]/outfits/text-actions",()=>({requestOutfitTexts:state.request,refreshOutfitTexts:state.read}));
vi.mock("@/lib/i18n/navigation",()=>({useRouter:()=>({refresh:state.refresh})}));
import { LookTextRequest } from "../look-text-request";
const source:OutfitTextSource={id:"20000000-0000-4000-8000-000000000001",sourceLocale:"en-US",name:"Quiet Morning",why:null};
const ready=(locale:ShippedLocale="uk",snapshot=source):TranslationResult=>({locale,busyIds:[],texts:[{id:source.id,locale,name:"Тихий ранок",why:null,translated:true,source:snapshot}]});
const deferred=()=>{let resolve!:(v:TranslationResult)=>void;const promise=new Promise<TranslationResult>(r=>{resolve=r;});return {promise,resolve};};
beforeEach(()=>{state.request.mockReset().mockResolvedValue({locale:"uk",texts:[],busyIds:[]});state.read.mockReset().mockResolvedValue({locale:"uk",texts:[],busyIds:[]});state.refresh.mockClear();});
afterEach(()=>vi.useRealTimers());
test("source-language view makes no request",async()=>{
 render(<LookTextRequest sources={[source]} locale="en-US"/>);await act(async()=>{});expect(state.request).not.toHaveBeenCalled();
});
test("StrictMode requests once and an empty result cannot loop",async()=>{
 render(<StrictMode><LookTextRequest sources={[source]} locale="uk"/></StrictMode>);await waitFor(()=>expect(state.request).toHaveBeenCalledOnce());await act(async()=>{});expect(state.refresh).not.toHaveBeenCalled();
});
test("ready text refreshes only the matching page; obsolete source is ignored",async()=>{
 state.request.mockResolvedValue(ready());const view=render(<LookTextRequest sources={[source]} locale="uk"/>);await waitFor(()=>expect(state.refresh).toHaveBeenCalledOnce());
 view.unmount();state.refresh.mockClear();state.request.mockResolvedValue(ready("uk",{...source,name:"Old"}));render(<LookTextRequest sources={[source]} locale="uk"/>);await act(async()=>{});expect(state.refresh).not.toHaveBeenCalled();
});
test("unmount rejects late responses",async()=>{
 const pending=deferred();state.request.mockReturnValue(pending.promise);const onReady=vi.fn();const view=render(<LookTextRequest sources={[source]} locale="uk" onReady={onReady}/>);
 await waitFor(()=>expect(state.request).toHaveBeenCalledOnce());view.unmount();await act(async()=>pending.resolve(ready()));expect(onReady).not.toHaveBeenCalled();
});
test("A→B→A discards the first A response and avoids another paid A request",async()=>{
 const a=deferred(),b=deferred();state.request.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);const onReady=vi.fn();
 const view=render(<LookTextRequest sources={[source]} locale="uk" onReady={onReady}/>);await waitFor(()=>expect(state.request).toHaveBeenCalledTimes(1));
 view.rerender(<LookTextRequest sources={[source]} locale="en-GB" onReady={onReady}/>);await waitFor(()=>expect(state.request).toHaveBeenCalledTimes(2));
 vi.useFakeTimers();view.rerender(<LookTextRequest sources={[source]} locale="uk" onReady={onReady}/>);
 await act(async()=>{a.resolve(ready());b.resolve(ready("en-GB"));});expect(onReady).not.toHaveBeenCalled();expect(state.request).toHaveBeenCalledTimes(2);
 state.read.mockResolvedValue(ready());await act(async()=>{await vi.advanceTimersByTimeAsync(9000);});expect(onReady).toHaveBeenCalledWith(ready());
});
test("busy response waits once and rereads without a second paid request",async()=>{
 vi.useFakeTimers();state.request.mockResolvedValue({locale:"uk",texts:[],busyIds:[source.id]});state.read.mockResolvedValue(ready());const onReady=vi.fn();
 const view=render(<LookTextRequest sources={[source]} locale="uk" onReady={onReady}/>);await act(async()=>{});
 await act(async()=>{await vi.advanceTimersByTimeAsync(9000);});expect(state.request).toHaveBeenCalledOnce();expect(state.read).toHaveBeenCalledOnce();expect(onReady).toHaveBeenCalledOnce();view.unmount();
});
test("long lists use sequential batches of six",async()=>{
 const first=deferred();state.request.mockReturnValueOnce(first.promise).mockResolvedValue({locale:"uk",texts:[],busyIds:[]});
 const sources=Array.from({length:8},(_,i)=>({...source,id:`20000000-0000-4000-8000-${String(i).padStart(12,"0")}`}));
 render(<LookTextRequest sources={sources} locale="uk"/>);await waitFor(()=>expect(state.request).toHaveBeenCalledOnce());expect(state.request.mock.calls[0][0].outfitIds).toHaveLength(6);
 await act(async()=>first.resolve({locale:"uk",texts:[],busyIds:[]}));expect(state.request).toHaveBeenCalledTimes(2);expect(state.request.mock.calls[1][0].outfitIds).toHaveLength(2);
});
