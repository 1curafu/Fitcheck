import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Wrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1160px] px-[22px] md:px-10", className)}>{children}</div>;
}

export function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-[rgba(237,230,216,0.07)] py-[84px]">
      <Wrap>{children}</Wrap>
    </section>
  );
}

export function SectionHead({ id, kicker, title, body }: { id: string; kicker: string; title: string; body?: string }) {
  return (
    <div className="mb-11 grid max-w-[640px] content-start gap-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{kicker}</p>
      <h2 id={id} className="font-serif text-[clamp(32px,7vw,46px)] leading-[1.08] tracking-[-0.015em] text-foreground-strong text-balance">{title}</h2>
      {body && <p className="max-w-[52ch] text-[17px] text-muted-foreground">{body}</p>}
    </div>
  );
}

export function TierBadge({ tier, label }: { tier: "pro" | "free"; label: string }) {
  return (
    <span className={cn("whitespace-nowrap rounded-full px-2 py-[5px] text-[9.5px] font-semibold uppercase tracking-[0.2em]",
      tier === "pro" ? "text-brand-high shadow-[inset_0_0_0_1px_rgba(184,106,71,0.5)]" : "text-muted-foreground shadow-[inset_0_0_0_1px_rgba(237,230,216,0.12)]")}>
      {label}
    </span>
  );
}

export function Tick({ rust = false }: { rust?: boolean }) {
  return <Check aria-hidden size={14} strokeWidth={2.4} className={cn("mt-1 shrink-0", rust ? "text-brand" : "text-muted-foreground")} />;
}
