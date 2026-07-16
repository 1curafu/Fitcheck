import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Kicker } from "@/components/ui-fitcheck/kicker";

// Placeholder — Plan 06 builds the real generator
// (rules filter → TS scoring → Haiku re-rank → 3 outfit cards with reasoning).
export default async function GeneratePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Kicker>Stylist</Kicker>
        <h1 className="font-serif text-3xl/[1.12] text-foreground">
          Today&apos;s Looks
        </h1>
        <p className="max-w-[34ch] text-sm text-muted-foreground">
          Three outfits from your own closet — matched to occasion and weather,
          each with a one-line reason why it works.
        </p>
        <p className="mt-2 text-xs text-muted-dim">Coming soon</p>
      </main>
      <MobileNav />
    </div>
  );
}
