import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, test } from "vitest";

const enabled = process.env.FITCHECK_LOCAL_DB_TESTS === "1";
type Claim = { source: { id: string }; status: string; leaseToken: string | null };
const claims = (result: { data: unknown; error: unknown }) => {
  if (result.error) throw new Error("Local translation RPC failed");
  return (result.data as Claim[]).filter(row => row.status === "claimed");
};

describe.runIf(enabled)("local translation concurrency", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let secondTab: SupabaseClient;
  let foreign: SupabaseClient;
  const userIds: string[] = [];
  const ids = Array.from({ length: 61 }, () => randomUUID());
  let ownerId: string;
  const utcDay = () => new Date().toISOString().slice(0, 10);
  const readReserved = async (userId: string, day: string) => {
    const { data, error } = await admin.from("outfit_translation_days").select("reserved").eq("user_id", userId).eq("day", day).single();
    if (error) throw new Error("Cannot read local translation reservations");
    return data.reserved as number;
  };
  beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) || new URL(url).protocol !== "http:") {
      throw new Error("Translation integration tests require loopback HTTP Supabase");
    }
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key || !serviceKey) throw new Error("Local test credentials missing");
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    admin = createClient(url, serviceKey, options);
    const provision = async () => {
      const password = randomUUID();
      const email = `translation-${randomUUID()}@example.test`;
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error || !data.user) throw new Error("Cannot create disposable local translation fixture");
      userIds.push(data.user.id);
      const client = createClient(url, key, options);
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error) throw new Error("Cannot sign in disposable local translation fixture");
      return { client, id: data.user.id, email, password };
    };
    const a = await provision(); const b = await provision();
    owner = a.client; foreign = b.client; ownerId = a.id;
    secondTab = createClient(url, key, options);
    if ((await secondTab.auth.signInWithPassword({ email: a.email, password: a.password })).error) throw new Error("Cannot sign in second local tab");
    const inserted = await admin.from("outfits").insert(ids.map(id => ({ id, user_id: ownerId, look_name: "Quiet Morning", ai_reasoning: null, text_locale: "en-US", occasion: "everyday" })));
    if (inserted.error) throw new Error("Cannot seed local translation looks");
  }, 20_000);
  afterAll(async () => {
    for (const id of userIds) {
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error) throw new Error("Cannot clean disposable local translation fixture");
    }
  });
  test("two independent tabs reserve once; foreign owner can neither claim nor finish", async () => {
    const request = { p_outfit_ids: [ids[0]], p_locale: "uk" };
    const [a,b] = await Promise.all([owner.rpc("claim_outfit_text_translations", request), secondTab.rpc("claim_outfit_text_translations", request)]);
    const work = [...claims(a), ...claims(b)];
    expect(work).toHaveLength(1);
    expect(await readReserved(ownerId, utcDay())).toBe(1);
    const foreignRead = await foreign.rpc("claim_outfit_text_translations", request);
    expect(foreignRead.error).toBeNull(); expect(foreignRead.data).toEqual([]);
    const stolen = await foreign.rpc("finish_outfit_text_translations", { p_locale: "uk", p_results: [{ outfitId: ids[0], leaseToken: work[0].leaseToken, status: "ready", name: "Stolen", why: null }] });
    expect(stolen.error).toBeNull(); expect(stolen.data).toEqual([]);
  });
  test("concurrent sixth-id batches cannot exceed the 60/day account limit", async () => {
    for (let i=1;i<55;i+=6) {
      const result = await owner.rpc("claim_outfit_text_translations", { p_outfit_ids: ids.slice(i,i+6), p_locale: "uk" });
      expect(claims(result)).toHaveLength(6);
    }
    expect(await readReserved(ownerId,utcDay())).toBe(55);
    const [a,b] = await Promise.all([
      owner.rpc("claim_outfit_text_translations", { p_outfit_ids: ids.slice(55,61), p_locale: "uk" }),
      secondTab.rpc("claim_outfit_text_translations", { p_outfit_ids: ids.slice(55,61), p_locale: "uk" }),
    ]);
    expect([...claims(a),...claims(b)]).toHaveLength(5);
    expect(await readReserved(ownerId,utcDay())).toBe(60);
    expect((a.data as Claim[]).concat(b.data as Claim[]).some(row => row.status === "limited")).toBe(true);
  });
});
