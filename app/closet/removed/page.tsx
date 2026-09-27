import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { displayPath, signItemImages } from "@/lib/storage/signed";
import { ClosetGrid } from "@/components/closet/closet-grid";
import { ScreenHeader } from "@/components/shell/screen-header";
import { MobileNav } from "@/components/shell/mobile-nav";

export const metadata: Metadata = { title: "Removed pieces" };

/**
 * Pieces taken out of the closet (archived). Each opens its own page, where it can be put back (spec 2026-09-26).
 * The shell is only the title bar: nothing user-specific may be prerendered (Decision 6).
 */
export default function RemovedPiecesPage() {
  // Same wrapper as app/closet/page.tsx, so the nav and safe areas behave identically.
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-5 pb-8">
        <ScreenHeader title="Removed pieces" backHref="/closet" />
        <Suspense fallback={null}>
          <RemovedBody />
        </Suspense>
      </main>
      <MobileNav />
    </div>
  );
}

async function RemovedBody() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("archived", true)
    .order("created_at", { ascending: false });
  const rows = items ?? [];

  // "thumb" on both lines, or the lookup silently misses (see app/closet/page.tsx).
  const path = (i: (typeof rows)[number]) => displayPath(i, "thumb");
  const signed = await signItemImages(rows.map(path));
  const grid = rows.map((i) => ({
    ...i,
    name: i.name ?? i.subcategory ?? i.category,
    brand: i.brand,
    imageUrl: signed.get(path(i)) ?? "",
  }));

  if (grid.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-sm text-muted-foreground">Nothing removed.</p>
        <Link href="/closet" className="inline-grid min-h-[44px] place-items-center px-2 text-sm text-foreground underline underline-offset-4">
          Back to your closet
        </Link>
      </div>
    );
  }
  return (
    <ClosetGrid items={grid} archived />
  );
}
