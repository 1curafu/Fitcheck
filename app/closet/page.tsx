import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Stub — plan 05 builds the real closet (masonry grid, filters, item detail).
export default async function ClosetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, archetype, palette, fit, dress_codes, occasions, nogos, formality_min, formality_max")
    .eq("id", user.id)
    .single();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-dim">
        The Closet
      </p>
      <h1 className="font-serif text-4xl text-foreground">Coming soon</h1>
      {profile?.archetype ? (
        <div className="max-w-[300px] space-y-1 text-sm text-muted-foreground">
          <p>
            Welcome{profile.display_name ? `, ${profile.display_name}` : ""}. Your
            style profile is saved:
          </p>
          <p className="text-foreground">
            {profile.archetype} · {profile.palette} · {profile.fit}
          </p>
          <p>Dress codes: {profile.dress_codes?.join(", ")}</p>
          <p>Occasions: {profile.occasions?.join(", ")}</p>
          {profile.nogos?.length ? <p>No-gos: {profile.nogos.join(", ")}</p> : null}
          <p>
            Formality band: {profile.formality_min}–{profile.formality_max}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Complete onboarding to begin.</p>
      )}
      <form action="/auth/signout" method="post">
        <button className="mt-4 rounded-[12px] border border-[--input] px-5 py-3 text-sm text-foreground">
          Sign out
        </button>
      </form>
    </main>
  );
}
