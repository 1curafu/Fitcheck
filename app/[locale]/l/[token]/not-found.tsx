import Link from "next/link";

export default function SharedLookNotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
      <h1 className="font-serif text-[28px]/[1.15] text-foreground">This look is no longer shared.</h1>
      <p className="text-[14px] text-muted-foreground">Looks like this, from the clothes you already own.</p>
      <Link href="/" className="grid min-h-[52px] w-full max-w-[320px] place-items-center rounded-[14px] bg-foreground text-[15px] font-semibold text-canvas">
        Get your own looks — free
      </Link>
    </main>
  );
}
