import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Kicker } from "@/components/ui-fitcheck/kicker";

// Placeholder — Plan 08 builds the OOTD diary (daily wear log, streaks, no-repeat calendar).
export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Kicker>Diary</Kicker>
        <h1 className="font-serif text-3xl/[1.12] text-foreground">
          Your outfit diary
        </h1>
        <p className="max-w-[34ch] text-sm text-muted-foreground">
          Log what you wear each day, build streaks, and never repeat the same
          fit in a week.
        </p>
        <p className="mt-2 text-xs text-muted-dim">Coming soon</p>
      </main>
      <MobileNav />
    </div>
  );
}
