import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { displayPath, signItemImages } from "@/lib/storage/signed";
import { OnboardingCapture } from "@/components/capture/onboarding-capture";

export default function OnboardingCapturePage() {
  // The session read is what blocks a shell, so it moves behind a boundary
  // and the route's chrome prerenders and prefetches without it.
  return (
    <Suspense fallback={null}>
      <CaptureBody />
    </Suspense>
  );
}

async function CaptureBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Seed the five saved slots with the user's latest items, including after a reload.
  const { data: items, count } = await supabase
    .from("items")
    .select("name, subcategory, category, image_url, cutout_url, thumb_url", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const rows = (items ?? []).reverse();
  const path = (item: (typeof rows)[number]) => displayPath(item, "thumb");
  const signed = await signItemImages(rows.map(path));
  const initialImages = rows.map((item) => ({
    src: signed.get(path(item)) ?? null,
    name: item.name ?? item.subcategory ?? item.category,
  }));

  return <OnboardingCapture initialCount={count ?? 0} initialImages={initialImages} />;
}
