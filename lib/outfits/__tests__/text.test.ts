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
