"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  archetype: z.string().min(1),
  palette: z.string().min(1),
  fit: z.string().min(1),
  dress_codes: z.array(z.string()).min(1),
  occasions: z.array(z.string()).min(1),
  nogos: z.array(z.string()), // optional — may be empty
});

// dress code → formality 1..5, used to derive the generator's band
const RANK: Record<string, number> = {
  Loungewear: 1,
  Casual: 2,
  "Smart casual": 3,
  Business: 4,
  "Black tie": 5,
};

export async function saveStyleProfile(input: unknown) {
  const data = Schema.parse(input);
  const ranks = data.dress_codes.map((c) => RANK[c] ?? 3);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      formality_min: Math.min(...ranks),
      formality_max: Math.max(...ranks),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw error;

  // The first-5-items capture (plan 04) will live at /onboarding/capture.
  redirect("/closet");
}
