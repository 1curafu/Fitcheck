import Link from "next/link";

/**
 * The back control on a pushed packing screen.
 *
 * ⚠️ Rendered by the SHELL and by the body, in the same place, because it is
 * the only thing on these screens that is genuinely static. The first version
 * put a `ScreenHeader` (back control + title) in the shell while the body
 * rendered its own headline — so both painted instantly and then VANISHED when
 * the body arrived. That is the Profile lesson repeating: a shell must contain
 * what the body will show, or nothing at all.
 */
export function PackingBack({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Back"
      className="grid size-[34px] shrink-0 place-items-center rounded-full bg-surface-2 text-[18px] text-foreground shadow-[inset_0_0_0_1px_var(--hairline-5)]"
    >
      ‹
    </Link>
  );
}
