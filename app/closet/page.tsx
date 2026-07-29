import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ClosetGrid } from "@/components/closet/closet-grid";

export default async function ClosetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const rows = items ?? [];
  const signed = await signItemImages(rows.map(displayPath));
  const grid = rows.map((i) => ({
    ...i,
    name: i.name ?? i.subcategory ?? i.category,
    brand: i.brand,
    imageUrl: signed.get(displayPath(i)) ?? "",
  }));

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-5 py-8">
        <header className="flex items-end justify-between px-6">
          <div>
            <Kicker>{grid.length} Pieces</Kicker>
            <h1 className="font-serif text-3xl text-foreground">The Closet</h1>
          </div>
        </header>

        {grid.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <p className="text-sm text-muted-foreground">Your closet is empty.</p>
            <Link
              href="/closet/upload"
              className="rounded-[12px] bg-foreground px-6 py-3 text-sm font-semibold text-canvas"
            >
              Add your first piece
            </Link>
          </div>
        ) : (
          <ClosetGrid items={grid} />
        )}
      </main>
      {/* Design :192-194 — capture is the closet's primary action, so it gets
          the most prominent element on the screen: a 60px rust circle floating
          clear of the tab pill. It used to be the LEAST prominent thing here, a
          small cream `+` in the header. The camera glyph also says *how* a piece
          gets added. This is the screen's one rust element (DESIGN.md, the One
          Rust Rule) — which is why the nav's active tab is cream, not rust. */}
      <Link
        href="/closet/upload"
        aria-label="Add a piece"
        className="fixed bottom-[108px] right-[22px] z-[85] grid size-[60px] place-items-center rounded-full bg-brand text-[#1a0f09] shadow-[0_12px_28px_rgba(184,106,71,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
      >
        <Camera size={26} strokeWidth={1.8} />
      </Link>
      <MobileNav />
    </div>
  );
}
