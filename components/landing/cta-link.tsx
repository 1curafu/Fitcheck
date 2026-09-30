import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/** Every landing CTA goes here — the page view of /sign-in IS the funnel's "CTA click" step (spec §8). */
export const SIGN_IN_HREF = "/sign-in";

export function CtaLink({ label, id, className, tabIndex }: { label: string; id?: string; className?: string; tabIndex?: number }) {
  return (
    <Link id={id} href={SIGN_IN_HREF} tabIndex={tabIndex}
      className={cn("group inline-flex min-h-14 items-center justify-center gap-2.5 rounded-[12px] bg-foreground px-[26px] text-[16px] font-semibold tracking-[0.01em] text-canvas transition-colors duration-200 hover:bg-foreground-strong focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-brand motion-reduce:transition-none", className)}>
      {label}
      <ArrowRight aria-hidden size={16} className="transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:transition-none" />
    </Link>
  );
}
