const state=vi.hoisted(()=>({user:{id:"owner"} as {id:string}|null, ensure:vi.fn(),readSources:vi.fn(),read:vi.fn(),client:{}}));
vi.mock("@/lib/supabase/server",()=>({createClient:async()=>({...state.client,auth:{getUser:async()=>({data:{user:state.user}})}})}));
vi.mock("@/lib/outfits/text-store",()=>({ensureOutfitTexts:state.ensure,readOwnedOutfitSources:state.readSources,readOutfitTexts:state.read}));
import { requestOutfitTexts,refreshOutfitTexts } from "../text-actions";
const id="20000000-0000-4000-8000-000000000001";
beforeEach(()=>{state.user={id:"owner"};state.ensure.mockReset().mockResolvedValue({locale:"uk",texts:[],busyIds:[]});state.readSources.mockReset().mockResolvedValue([]);state.read.mockReset().mockResolvedValue([]);});
test("signed-out cannot claim or read anything",async()=>{
 state.user=null;for(const action of [requestOutfitTexts,refreshOutfitTexts])await expect(action({outfitIds:[id],locale:"uk"})).rejects.toThrow("Not authenticated");
 expect(state.ensure).not.toHaveBeenCalled();expect(state.readSources).not.toHaveBeenCalled();
});
test.each([{outfitIds:["bad"],locale:"uk"},{outfitIds:[id],locale:"ru"},{outfitIds:[],locale:"uk"},{outfitIds:Array(7).fill(id),locale:"uk"}])("invalid request rejected: %j",async input=>{
 for(const action of [requestOutfitTexts,refreshOutfitTexts])await expect(action(input)).rejects.toThrow();expect(state.ensure).not.toHaveBeenCalled();expect(state.readSources).not.toHaveBeenCalled();
});
test("explicit target works on default route; duplicates dedupe and a supplied userId has no authority",async()=>{
 await requestOutfitTexts({outfitIds:[id,id],locale:"uk",userId:"foreign"} as Parameters<typeof requestOutfitTexts>[0]);
 expect(state.ensure).toHaveBeenCalledWith(expect.objectContaining({auth:expect.anything()}),[id],"uk");
});
test("refresh rereads owned originals and only selects cache",async()=>{
 state.readSources.mockResolvedValue([{id,sourceLocale:"en-US",name:"Original",why:null}]);
 expect(await refreshOutfitTexts({outfitIds:[id],locale:"uk"})).toEqual({locale:"uk",texts:[],busyIds:[]});
 expect(state.read).toHaveBeenCalledWith(expect.anything(),[{id,sourceLocale:"en-US",name:"Original",why:null}],"uk");expect(state.ensure).not.toHaveBeenCalled();
});
