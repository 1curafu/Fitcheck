"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { shareExpiry } from "@/lib/share/snapshot";

type Link = { token: string; lookName: string; readyAt: string | null; createdAt: string };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

/** Every link the user has shared, so one whose look is gone (reroll, another day) can still be stopped (spec §0 A1). */
export function SharedLinks({ links, stop }: { links: Link[]; stop: (token: string) => Promise<{ status: string; message?: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Date.now() is an impure read; the lazy useState initializer runs it exactly once, at mount, which is the
  // pattern React itself documents for capturing "the moment this component first rendered" (react-hooks/purity).
  const [now] = useState(() => Date.now());
  if (links.length === 0) return <p className="text-[13px] text-muted-foreground">No shared links.</p>;
  return (
    <>
      <ul aria-label="Shared links" className="flex flex-col">
        {links.map((l) => {
          const expiry = l.readyAt ? shareExpiry(l.readyAt) : null;
          const status = !expiry ? "Not published" : expiry.getTime() <= now ? "Expired" : `Expires ${day(expiry)}`;
          return (
            <li key={l.token} className="flex items-center justify-between gap-3 py-3 not-last:border-b not-last:border-[var(--hairline-2)]">
              <div className="min-w-0">
                <div className="truncate text-[14px] text-foreground">{l.lookName}</div>
                <div className="text-[12px] text-muted-foreground">Shared {day(new Date(l.createdAt))} · {status}</div>
              </div>
              <button type="button" disabled={pending}
                onClick={() => start(async () => {
                  const r = await stop(l.token);
                  if (r.status === "error") setError(r.message ?? "Couldn't stop sharing. Try again.");
                  else router.refresh();
                })}
                className="min-h-[44px] shrink-0 text-[13px] text-muted-foreground underline underline-offset-4">
                Stop sharing
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p role="status" className="mt-2 text-[13px] text-foreground">{error}</p>}
    </>
  );
}
