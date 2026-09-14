import Link from "next/link";
import { Kicker } from "@/components/ui-fitcheck/kicker";
import type { LegalDocument } from "@/lib/legal/types";

/**
 * One layout for both legal pages. Pure, static, no session read — so the
 * whole page prerenders as a shell and nothing here can leak a user.
 */
export function LegalDocumentView({ doc, other }: { doc: LegalDocument; other: { href: string; label: string } }) {
  return (
    <main className="screen-top flex flex-1 flex-col px-7 pb-16">
      <Link href="/" className="mb-8 text-[13px] text-muted-foreground">
        ← Fitcheck
      </Link>
      <Kicker>Updated {doc.updated}</Kicker>
      <h1 className="mt-2 font-serif text-[34px] leading-[1.05] tracking-[-0.01em] text-foreground">
        {doc.title}
      </h1>
      <p className="mt-5 text-[15px] leading-[1.55] text-value">{doc.intro}</p>

      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-9">
          <h2 className="font-serif text-[21px] leading-[1.2] text-foreground">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="mt-3 text-[14.5px] leading-[1.6] text-muted-foreground">
              {p}
            </p>
          ))}
          {s.bullets && (
            <ul className="mt-3 flex flex-col gap-2">
              {s.bullets.map((b) => (
                <li key={b} className="flex gap-2 text-[14.5px] leading-[1.6] text-muted-foreground">
                  <span aria-hidden className="text-muted-dim">·</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <p className="mt-12 text-[13px] text-muted-dim">
        See also the <Link href={other.href} className="underline underline-offset-2 text-muted-foreground">{other.label}</Link>.
      </p>
    </main>
  );
}
