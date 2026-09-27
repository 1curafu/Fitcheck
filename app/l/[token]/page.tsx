import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readSharedLook, shareImageUrl } from "@/lib/share/public";
import { pieceLabel } from "@/lib/share/snapshot";

type Params = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const look = await readSharedLook(token);
  if (!look) notFound();
  const og = shareImageUrl(token, "og.jpg", look.version);
  const title = `${look.lookName} — a look on Fitcheck`;
  const description = look.reasoning ?? "A look styled from someone's own closet.";
  return {
    title: { absolute: title }, description, robots: { index: false, follow: false },
    openGraph: { type: "website", title, description, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [og] },
  };
}

export default function SharedLookPage({ params }: Params) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex items-center justify-between px-[22px] screen-top">
        <Link href="/" className="font-serif text-[22px] text-foreground">fitcheck</Link>
        <Link href="/" className="grid min-h-[44px] place-items-center text-[13px] text-muted-foreground">Sign in</Link>
      </header>
      <Suspense fallback={<div className="mx-[22px] mt-4 aspect-[4/5] animate-pulse rounded-[18px] bg-surface-1" />}>
        <SharedBody params={params} />
      </Suspense>
    </div>
  );
}

async function SharedBody({ params }: Params) {
  const { token } = await params;
  const look = await readSharedLook(token);
  if (!look) notFound();
  const { data: { user } } = await (await createClient()).auth.getUser();
  return (
    <main className="flex flex-1 flex-col gap-5 px-[22px] pb-10 pt-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shareImageUrl(token, "post.jpg", look.version)} width={1080} height={1350} alt={`${look.lookName}. ${look.reasoning ?? ""}`.trim()}
        className="h-auto w-full rounded-[18px] shadow-[inset_0_0_0_1px_var(--hairline-7)]" />
      <ol className="flex flex-col gap-1.5 text-[14px] text-foreground">
        {look.pieces.map((p) => <li key={p.n}><span className="mr-2 text-muted-foreground">{p.n}</span>{pieceLabel(p)}</li>)}
      </ol>
      <section className="mt-2 flex flex-col gap-3">
        <p className="font-serif text-[19px]/[1.3] text-foreground">Looks like this, from the clothes you already own.</p>
        <Link href={user ? "/generate" : "/"} className="grid min-h-[52px] place-items-center rounded-[14px] bg-foreground text-[15px] font-semibold text-canvas">
          {user ? "Open Fitcheck" : "Get your own looks — free"}
        </Link>
      </section>
      <footer className="mt-4 text-center text-[12px]/[1.5] text-muted-foreground">
        Shared anonymously from someone&rsquo;s closet. They can stop sharing at any time. ·{" "}
        <a className="underline underline-offset-4" href={`mailto:legal@fitcheck.space?subject=${encodeURIComponent(`Report shared look ${token}`)}`}>Report this look</a>
      </footer>
    </main>
  );
}
