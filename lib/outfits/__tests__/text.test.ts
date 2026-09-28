import { selectOutfitText } from "../text";
import type { OutfitTextSource, TranslationRow } from "../text";
const source: OutfitTextSource = { id: "look", sourceLocale: "en-US", name: "Quiet Morning", why: null };
const ready: TranslationRow = { outfit_id: "look", target_locale: "uk", source_locale: "en-US", source_name: "Quiet Morning", source_why: null, name: "Тихий ранок", why: null, status: "ready" };
test("ready translation preserves original source separately", () => {
  expect(selectOutfitText(source,"uk",ready)).toEqual({id:"look",locale:"uk",name:"Тихий ранок",why:null,translated:true,source});
});
test.each([
  { status: "pending" }, { status: "failed" }, { outfit_id: "foreign" }, { target_locale: "en-GB" },
  { source_name: "Old" }, { source_why: "Old" }, { source_locale: "en-GB" }, { name: "" }, { why: "Invented" },
])("mismatched/incomplete cache falls back to original: %j", patch => {
  expect(selectOutfitText(source,"uk",{...ready,...patch} as TranslationRow)).toMatchObject({name:source.name,why:null,translated:false});
});
test("source locale bypasses cache; changed original cannot receive stale text", () => {
  expect(selectOutfitText(source,"en-US",ready).translated).toBe(false);
  expect(selectOutfitText({...source,name:"Changed"},"uk",ready).name).toBe("Changed");
});

import { applyOutfitTexts, validatedUniqueIds, sameOutfitTextSource } from "../text";
import type { Look } from "@/lib/generator/types";
const look:Look={id:"look",name:source.name,why:"",pieces:[],anchorIndex:0,worn:true,textSource:source,textLocale:"uk",textTranslated:false};
const result={locale:"uk" as const,busyIds:[],texts:[{id:"look",locale:"uk" as const,name:"Тихий ранок",why:null,translated:true,source}]};
test("translation application keeps layout and wear and rejects wrong locale/source/ID",()=>{
 expect(applyOutfitTexts([look],result,"uk")[0]).toMatchObject({name:"Тихий ранок",worn:true,pieces:look.pieces,textSource:source});
 expect(applyOutfitTexts([look],result,"en-GB")).toEqual([look]);
 expect(applyOutfitTexts([{...look,textSource:{...source,why:"Changed"}}],result,"uk")[0].name).toBe(source.name);
 expect(applyOutfitTexts([look],{...result,texts:[{...result.texts[0],id:"foreign"}]},"uk")).toEqual([look]);
 expect(sameOutfitTextSource({...source,why:""},source)).toBe(false);
});
test("raw batch limit applies before deduplication",()=>{
 const uuid="20000000-0000-4000-8000-000000000001";
 expect(validatedUniqueIds([uuid,uuid])).toEqual([uuid]);
 expect(()=>validatedUniqueIds(Array(7).fill(uuid))).toThrow();expect(()=>validatedUniqueIds(["../look"])).toThrow();expect(()=>validatedUniqueIds([])).toThrow();
});
