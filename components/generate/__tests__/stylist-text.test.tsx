import { act,render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import uk from "@/messages/uk.json";
import type { Look,WeatherPayload } from "@/lib/generator/types";
import type { TranslationResult } from "@/lib/outfits/text";
const state=vi.hoisted(()=>({generate:vi.fn(),request:vi.fn(),read:vi.fn(),refresh:vi.fn()}));
vi.mock("@/app/[locale]/generate/actions",()=>({generate:state.generate,predictDefaultOccasion:async()=>({occasion:"everyday",reason:"generator.reason.everyday"}),saveLocation:vi.fn(),logOccasionOverride:vi.fn()}));
vi.mock("@/app/[locale]/outfits/text-actions",()=>({requestOutfitTexts:state.request,refreshOutfitTexts:state.read}));
vi.mock("@/lib/weather/geolocate",()=>({permissionState:async()=>"prompt",getCurrentPosition:vi.fn(),GeoError:class extends Error{}}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:state.refresh})}));
vi.mock("../stylist-view",()=>({StylistView:(props:{looks:Look[];refineOpen:boolean;onOpenRefine:()=>void;onRegenerate:()=>void})=><div>{props.looks.map(look=><h1 key={look.id}>{look.name}</h1>)}{props.refineOpen&&<p>Refine stays open</p>}<button onClick={props.onOpenRefine}>Refine</button><button onClick={props.onRegenerate}>Regenerate</button></div>}));
import { Stylist } from "../stylist";
const id="20000000-0000-4000-8000-000000000001";
const source={id,sourceLocale:"en-US" as const,name:"Quiet Morning",why:null};
const look:Look={id,name:source.name,why:"",pieces:[],anchorIndex:0,worn:true,textSource:source,textLocale:"uk",textTranslated:false};
const result:TranslationResult={locale:"uk",texts:[{id,locale:"uk",source,translated:true,name:"Тихий ранок",why:null}],busyIds:[]};
const deferred=()=>{let resolve!:(r:TranslationResult)=>void;const promise=new Promise<TranslationResult>(r=>{resolve=r;});return {promise,resolve};};
beforeEach(()=>{
 (globalThis as {__intl?:{locale:string;messages:object}}).__intl={locale:"uk",messages:uk};
 state.generate.mockReset().mockResolvedValue({status:"ok",weather:{} as WeatherPayload,looks:[look]});state.request.mockReset().mockResolvedValue({locale:"uk",texts:[],busyIds:[]});state.read.mockReset().mockResolvedValue({locale:"uk",texts:[],busyIds:[]});
});
test("translation updates the look while keeping Refine state",async()=>{
 const pending=deferred();state.request.mockReturnValue(pending.promise);render(<Stylist/>);await screen.findByRole("heading",{name:source.name});
 await userEvent.click(screen.getByRole("button",{name:"Refine"}));await act(async()=>pending.resolve(result));
 expect(screen.getByRole("heading",{name:"Тихий ранок"})).toBeInTheDocument();expect(screen.getByText("Refine stays open")).toBeInTheDocument();
});
test("an old source cannot overwrite a regenerated look",async()=>{
 const pending=deferred();state.request.mockReturnValueOnce(pending.promise);render(<Stylist/>);await waitFor(()=>expect(state.request).toHaveBeenCalledOnce());
 state.generate.mockResolvedValue({status:"ok",weather:{} as WeatherPayload,looks:[{...look,name:"Changed",textSource:{...source,name:"Changed"}}]});
 await userEvent.click(screen.getByRole("button",{name:"Regenerate"}));await screen.findByRole("heading",{name:"Changed"});
 await act(async()=>pending.resolve(result));expect(screen.getByRole("heading",{name:"Changed"})).toBeInTheDocument();
});
