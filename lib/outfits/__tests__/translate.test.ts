vi.mock("server-only",()=>({}));
const state=vi.hoisted(()=>({ create:vi.fn(), options:vi.fn(), telemetry:vi.fn() }));
vi.mock("@anthropic-ai/sdk",()=>({default:class { messages={create:state.create}; constructor(options:unknown) {state.options(options);} }}));
vi.mock("@sentry/nextjs",()=>({captureMessage:state.telemetry}));
import { translateOutfitText } from "../translate";
import type { TranslationClaim } from "../text";
const claim:TranslationClaim={source:{id:"a",sourceLocale:"en-US",name:"Quiet Morning",why:null},targetLocale:"uk",leaseToken:"lease"};
const second={...claim,source:{...claim.source,id:"b",why:"Blue cotton shirt."}};
const reply=(rows:unknown)=>({content:[{type:"text",text:JSON.stringify({texts:rows})}],usage:{input_tokens:12,output_tokens:34}});
beforeEach(()=>{vi.stubEnv("FITCHECK_STUB_AI","");state.create.mockReset();state.options.mockClear();state.telemetry.mockClear();});
afterEach(()=>vi.unstubAllEnvs());
test("reordered exact IDs are accepted with bounded provider settings",async()=>{
 state.create.mockResolvedValue(reply([{id:"b",name:"Синій день",why:"Блакитна бавовняна сорочка."},{id:"a",name:"Тихий ранок",why:null}]));
 expect(await translateOutfitText([claim,second])).toEqual([{id:"b",name:"Синій день",why:"Блакитна бавовняна сорочка."},{id:"a",name:"Тихий ранок",why:null}]);
 expect(state.options).toHaveBeenCalledWith({timeout:8000,maxRetries:0});
 expect(state.create.mock.calls[0][0]).toMatchObject({model:"claude-haiku-4-5",max_tokens:4096});
 expect(state.create.mock.calls[0][0].messages[0].content).toContain("Ukrainian");
 expect(JSON.stringify(state.telemetry.mock.calls)).not.toMatch(/Quiet Morning|Blue cotton/);
});
test.each([
 [],[{id:"foreign",name:"x",why:null}],[{id:"a",name:"x",why:null},{id:"a",name:"x",why:null}],
].map(rows=>({rows})))("missing, foreign or duplicate ID sets fail: %j",async ({rows})=>{
 state.create.mockResolvedValue(reply(rows));await expect(translateOutfitText([claim])).rejects.toThrow("Invalid translation IDs");
});
test.each([
 {id:"a",name:null,why:null},{id:"a",name:" ",why:null},{id:"a",name:"x".repeat(121),why:null},
 {id:"a",name:"x",why:"Invented why"},
])("invalid/null/oversized output fails: %j",async row=>{
 state.create.mockResolvedValue(reply([row]));await expect(translateOutfitText([claim])).rejects.toThrow();
});
test("nullable reasoning is source-bound and why has a length cap",async()=>{
 state.create.mockResolvedValue(reply([{id:"b",name:"x",why:null}]));await expect(translateOutfitText([second])).rejects.toThrow();
 state.create.mockResolvedValue(reply([{id:"b",name:"x",why:"x".repeat(1001)}]));await expect(translateOutfitText([second])).rejects.toThrow();
});
test("name is clamped on a word boundary",async()=>{
 state.create.mockResolvedValue(reply([{id:"a",name:"Quiet Morning with the blue cotton shirt and white sneakers",why:null}]));
 expect((await translateOutfitText([claim]))[0].name.length).toBeLessThanOrEqual(40);
});
test("mixed targets, overlong batches and duplicate inputs never call provider",async()=>{
 await expect(translateOutfitText([claim,{...second,targetLocale:"en-GB"}])).rejects.toThrow();
 await expect(translateOutfitText(Array(7).fill(claim))).rejects.toThrow();
 await expect(translateOutfitText([claim,claim])).rejects.toThrow();expect(state.create).not.toHaveBeenCalled();
});
test("bad JSON and timeout reject without emitting prose diagnostics",async()=>{
 state.create.mockResolvedValue({content:[{type:"text",text:"bad JSON"}],usage:{input_tokens:0,output_tokens:1}});await expect(translateOutfitText([claim])).rejects.toThrow();
 state.create.mockRejectedValue(new Error("Timeout"));await expect(translateOutfitText([claim])).rejects.toThrow("Timeout");
 expect(JSON.stringify(state.telemetry.mock.calls)).not.toContain("bad JSON");
});
test.each(["en-US","en-GB","uk"] as const)("stub uses the same parser in %s",async targetLocale=>{
 vi.stubEnv("FITCHECK_STUB_AI","1");const rows=await translateOutfitText([{...claim,targetLocale}]);
 expect(rows[0]).toMatchObject({id:"a",why:null});expect(rows[0].name).toBeTruthy();expect(state.create).not.toHaveBeenCalled();
});

test("legacy empty reasoning stays empty while its name can translate",async()=>{
 state.create.mockResolvedValue(reply([{id:"a",name:"Тихий ранок",why:""}]));
 expect(await translateOutfitText([{...claim,source:{...claim.source,why:""}}])).toEqual([{id:"a",name:"Тихий ранок",why:""}]);
});
