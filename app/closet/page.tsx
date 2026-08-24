import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signItemImages, displayPath } from "@/lib/storage/signed";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import { MobileNav } from "@/components/shell/mobile-nav";
import { ClosetGrid } from "@/components/closet/closet-grid";

/**
 * The Closet, split into a prerendered SHELL and a streamed body.
 *
 * Everything outside `<Suspense>` is the shell: it is prerendered at build
 * time, prefetched when a link to this route comes into view, and therefore
 * cached on the ROUTE key — so it may contain nothing that belongs to any
 * particular user. Here that is the header, the capture button and the nav.
 *
 * ⚠️ Reading the session (`supabase.auth.getUser()` → `cookies()`) is what
 * blocks a shell, so it moved inside `<ClosetBody>`. Next enforces the
 * important half of this at build time: `cookies()` inside a `use cache` scope
 * is a hard error, so the session can never be baked into a cached fragment.
 * `e2e/shell-privacy.spec.ts` guards the rest.
 */
export default function ClosetPage() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <main className="screen-top flex flex-1 flex-col gap-5 pb-8">
        <Suspense fallback={<ClosetHeader />}>
          <ClosetBody />
        </Suspense>
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

/**
 * The shell's header, and the fallback while the real one streams.
 *
 * `count` is omitted rather than shown as 0: a prefetched shell that says
 * "0 Pieces" and then corrects itself to "22 Pieces" reads as a bug. The
 * kicker holds its space so the title does not jump when the count arrives.
 */
function ClosetHeader({ count }: { count?: number }) {
  return (
    <header className="flex items-end justify-between px-6">
      <div>
        <Kicker>{count == null ? " " : `${count} Pieces`}</Kicker>
        <h1 className="font-serif text-3xl text-foreground">The Closet</h1>
      </div>
    </header>
  );
}

async function ClosetBody() {
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
  const signed = await signItemImages(rows.map((i) => displayPath(i)));
  const grid = rows.map((i) => ({
    ...i,
    name: i.name ?? i.subcategory ?? i.category,
    brand: i.brand,
    imageUrl: signed.get(displayPath(i)) ?? "",
  }));

  return (
    <>
      <ClosetHeader count={grid.length} />
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
    </>
  );
}
