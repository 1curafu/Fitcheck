import { loadDailyLooks, saveDailyLooks } from "../daily";
import { saveStyledLooks } from "../styled-store";
import { saveTripLooks } from "@/lib/packing/store";
import type { LookDraft, WeatherPayload } from "@/lib/generator/types";
import type { ScheduledDay } from "@/lib/packing/schedule";

vi.mock("server-only", () => ({}));
const provider = vi.hoisted(() => vi.fn());
vi.mock("../translate", () => ({ translateOutfitText: provider }));
const db = vi.hoisted(() => ({ cache: [] as Record<string, unknown>[], from: vi.fn(), inserted: [] as Record<string, unknown>[], rows: [] as Record<string, unknown>[] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));

beforeEach(() => {
  db.inserted = []; db.rows = []; db.cache = []; provider.mockClear();
  db.from.mockImplementation((table: string) => {
    let inserted: Record<string, unknown>[] | undefined;
    const q: Record<string, unknown> = {};
    for (const method of ["select", "eq", "is", "not", "order", "delete", "in"]) q[method] = () => q;
    q.insert = (rows: Record<string, unknown> | Record<string, unknown>[]) => {
      inserted = Array.isArray(rows) ? rows : [rows];
      if (table === "outfits") db.inserted.push(...inserted);
      return q;
    };
    const result = () => ({ data: inserted ? inserted.map((r, i) => ({ ...r, id: "id-" + i })) : table === "outfit_text_translations" ? db.cache : db.rows, error: null });
    q.single = async () => ({ ...result(), data: result().data[0] });
    q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
    return q;
  });
});

const weather = {} as WeatherPayload;
const draft: LookDraft = { name: "Тихий ранок", why: "Блакитна сорочка пасує до штанів.", pieces: [], anchorIndex: 0 };

test.each(["daily", "styled", "trip"])("%s saves original prose with its source locale", async kind => {
  if (kind === "daily") await saveDailyLooks("owner", "everyday", "2026-09-28", weather, [draft], "uk");
  if (kind === "styled") await saveStyledLooks("owner", "item", "everyday", "2026-09-28", weather, [draft], "uk");
  if (kind === "trip") await saveTripLooks("owner", "trip", [{ day: { date: "2026-09-28", occasion: "everyday" }, itemIds: [], wearIndex: {} }] as ScheduledDay[], [draft], "uk");
  expect(db.inserted[0]).toMatchObject({ user_id: "owner", text_locale: "uk", look_name: draft.name, ai_reasoning: draft.why });
});

test("legacy caller defaults provenance to English", async () => {
  await saveDailyLooks("owner", "everyday", "2026-09-28", weather, [draft]);
  expect(db.inserted[0].text_locale).toBe("en-US");
});

test("a missing trip narration preserves localized provenance with its day fallback", async () => {
  await saveTripLooks("owner", "trip", [{ day: { date: "2026-09-28", occasion: "everyday" }, itemIds: [], wearIndex: {} }] as ScheduledDay[], [], "uk");
  expect(db.inserted[0]).toMatchObject({ look_name: "День 1", ai_reasoning: "", text_locale: "uk" });
});

test("read projection preserves nullable original reasoning and requested display locale", async () => {
  db.rows = [{ id: "outfit", look_name: "Quiet Morning", ai_reasoning: null, text_locale: "en-US", layout: {}, wear_logs: [] }];
  const looks = await loadDailyLooks("owner", "everyday", "2026-09-28", "uk");
  expect(looks?.[0]).toMatchObject({ why: "", textLocale: "uk", textTranslated: false,
    textSource: { id: "outfit", sourceLocale: "en-US", name: "Quiet Morning", why: null } });
});

const original = { id: "outfit", look_name: "Quiet Morning", ai_reasoning: null, text_locale: "en-US", layout: { anchorIndex: 2, pieces: [{itemId: "piece", slot: {xPct: 1}}] }, wear_logs: [{worn_on: "2026-09-27"}] };
const cached = { outfit_id: "outfit", target_locale: "uk", source_locale: "en-US", source_name: "Quiet Morning", source_why: null, name: "Тихий ранок", why: null, status: "ready" };
test("historical daily reader overlays exact cached text, preserving layout and wear", async () => {
 db.rows = [original]; db.cache = [cached];
 const result = await loadDailyLooks("owner", "everyday", "2026-09-27", "uk");
 expect(result?.[0]).toMatchObject({lookName: "Тихий ранок", why: "", textTranslated: true, anchorIndex: 2, pieces: original.layout.pieces, worn: true, textSource: {name: "Quiet Morning", why: null}});
 expect(provider).not.toHaveBeenCalled();
});
test("obsolete cache leaves original visible and never starts translation", async () => {
 db.rows = [original]; db.cache = [{...cached, source_name: "Old original"}];
 expect((await loadDailyLooks("owner", "everyday", "2026-09-27", "uk"))?.[0].lookName).toBe("Quiet Morning");
 expect(provider).not.toHaveBeenCalled();
});
