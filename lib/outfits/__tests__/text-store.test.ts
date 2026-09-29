vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({translate:vi.fn(),telemetry:vi.fn()}));
vi.mock("../translate",()=>({translateOutfitText:state.translate}));
vi.mock("@sentry/nextjs",()=>({captureMessage:state.telemetry}));
import { ensureOutfitTexts, readOutfitTexts, readOwnedOutfitSources, type TextClient } from "../text-store";
const id="20000000-0000-4000-8000-000000000001";
const source={id,sourceLocale:"en-US" as const,name:"Quiet Morning",why:null};
const token="50000000-0000-4000-8000-000000000001";
const row={id,text_locale:"en-US",look_name:"Quiet Morning",ai_reasoning:null};
function fakeDb(opts:{claimError?:boolean;providerFinishRejected?:boolean;cacheError?:boolean;status?:string;changed?:boolean}={}) {
 let ready=false;
 const from=vi.fn((table:string)=>{
  const q={select:()=>q,in:()=>q,eq:()=>q,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:table==="outfits"?[opts.changed?{...row,look_name:"Changed"}:row]:ready?[{outfit_id:id,target_locale:"uk",source_locale:"en-US",source_name:"Quiet Morning",source_why:null,name:"Тихий ранок",why:null,status:"ready"}]:[],error:opts.cacheError&&table!=="outfits"?{}:null}).then(resolve)};
  return q;
 });
 const rpc=vi.fn(async(name:string,args:Record<string,unknown>)=>{
  if(name.startsWith("claim"))return {data:[{source,status:opts.status??"claimed",leaseToken:token}],error:opts.claimError?{}:null};
  if((args.p_results as Array<{status:string}>)[0]?.status==="ready"&&!opts.providerFinishRejected)ready=true;
  return {data:opts.providerFinishRejected?[]:[id],error:null};
 });return {client:{from,rpc} as unknown as TextClient,from,rpc};
}
beforeEach(()=>{state.translate.mockReset().mockResolvedValue([{id,name:"Тихий ранок",why:null}]);state.telemetry.mockClear();});
test("claims, completes, rereads and never updates originals or generation events",async()=>{
 const db=fakeDb();const result=await ensureOutfitTexts(db.client,[id],"uk");
 expect(result.texts[0]).toMatchObject({name:"Тихий ранок",translated:true,source});
 expect(db.rpc.mock.calls.map(c=>c[0])).toEqual(["claim_outfit_text_translations","finish_outfit_text_translations"]);
 expect(db.from.mock.calls.every(([table])=>["outfits","outfit_text_translations"].includes(table))).toBe(true);
});
test("provider failure marks every lease failed and returns original",async()=>{
 state.translate.mockRejectedValue(new Error("Sensitive provider response"));const db=fakeDb();
 expect((await ensureOutfitTexts(db.client,[id],"uk")).texts[0].name).toBe(source.name);
 expect(db.rpc.mock.calls[1][1]).toMatchObject({p_results:[{outfitId:id,leaseToken:token,status:"failed"}]});
 expect(JSON.stringify(state.telemetry.mock.calls)).not.toMatch(/Sensitive|Quiet Morning/);
});
test("successful provider with stale completion returns freshly reread original",async()=>{
 const db=fakeDb({providerFinishRejected:true,changed:true});const result=await ensureOutfitTexts(db.client,[id],"uk");
 expect(state.translate).toHaveBeenCalledOnce();expect(result.texts[0]).toMatchObject({name:"Changed",translated:false});
});
test("failed claim cannot call provider",async()=>{
 const db=fakeDb({claimError:true});expect((await ensureOutfitTexts(db.client,[id],"uk")).texts[0].name).toBe(source.name);expect(state.translate).not.toHaveBeenCalled();
});
test.each(["source","ready","busy","cooldown","limited"])("%s never enters paid provider",async status=>{
 const db=fakeDb({status});const result=await ensureOutfitTexts(db.client,[id],"uk");expect(state.translate).not.toHaveBeenCalled();expect(result.busyIds).toEqual(status==="busy"?[id]:[]);
});
test("read-only cache failure falls back without claiming work",async()=>{
 const db=fakeDb({cacheError:true});expect((await readOutfitTexts(db.client,[source],"uk"))[0].translated).toBe(false);expect(db.rpc).not.toHaveBeenCalled();expect(state.translate).not.toHaveBeenCalled();
 expect(await readOwnedOutfitSources(db.client,[id])).toEqual([source]);
});
