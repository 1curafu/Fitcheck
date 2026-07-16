import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Kicker } from "@/components/ui-fitcheck/kicker";

// Stub — plan 10 builds the real Profile hub (Style DNA, Saved Outfits, Stats, Settings).
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, archetype")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Kicker>Profile</Kicker>
        <h1 className="font-serif text-3xl text-foreground">
          {profile?.display_name ?? "You"}
        </h1>
        {profile?.archetype && (
          <p className="text-sm text-muted-foreground">{profile.archetype}</p>
        )}
        <form action="/auth/signout" method="post">
          <button className="mt-4 rounded-[12px] border border-[--input] px-5 py-3 text-sm text-foreground">
            Sign out
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-dim">
          Style DNA · Saved Outfits · Stats · Settings — coming soon
        </p>
      </main>
      <MobileNav />
    </div>
  );
}
