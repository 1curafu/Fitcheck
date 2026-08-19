import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TEST_USER, seedTestUser } from "./seed";

/**
 * Service-role helpers for the specs that need to change the world.
 *
 * ⚠️ Anything that mutates MUST restore, and the suite runs `workers: 1` /
 * `fullyParallel: false` so that is safe. Playwright shares one seeded user; a
 * spec that leaves the tier on `free` would silently change what every later
 * spec asserts.
 */
export function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function testUserId(): Promise<string> {
  const { data } = await admin().auth.admin.listUsers();
  const found = data.users.find((u) => u.email === TEST_USER.email);
  if (!found) throw new Error("the seeded test user is missing — did global.setup run?");
  return found.id;
}

/** Flip the tier so gated surfaces can be photographed from both sides. */
export async function setTier(tier: "free" | "pro"): Promise<void> {
  const { error } = await admin().from("profiles").update({ tier }).eq("id", await testUserId());
  if (error) throw new Error(`setting tier=${tier} failed: ${error.message}`);
}

/** Remove every wear, so the zero-wear branch renders. Restore with `reseed`. */
export async function clearWears(): Promise<void> {
  const { error } = await admin().from("wear_logs").delete().eq("user_id", await testUserId());
  if (error) throw new Error(`clearing wears failed: ${error.message}`);
}

/** Put the world back exactly as `global.setup` left it. */
export async function reseed(): Promise<void> {
  await seedTestUser({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  });
}
