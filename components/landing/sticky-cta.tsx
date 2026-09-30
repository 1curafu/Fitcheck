"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CtaLink } from "./cta-link";

/** Phone only: shown once the hero CTA has scrolled away, hidden again when the final CTA is on screen. */
export function StickyCta({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const final = document.getElementById("final-cta");
    if (!hero || !final || !("IntersectionObserver" in window)) return;
    let heroGone = false, finalSeen = false;
    const update = () => setShow(heroGone && !finalSeen);
    const a = new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; update(); });
    const b = new IntersectionObserver(([e]) => { finalSeen = e.isIntersecting; update(); });
    a.observe(hero);
    b.observe(final);
    return () => { a.disconnect(); b.disconnect(); };
  }, []);
  return (
    <div aria-hidden={!show} inert={!show}
      className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(237,230,216,0.07)] bg-[rgba(14,14,16,0.9)] px-[22px] pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[12px] transition-transform duration-300 motion-reduce:transition-none md:hidden",
        show ? "translate-y-0" : "translate-y-[110%]")}>
      <CtaLink label={label} className="w-full" tabIndex={show ? undefined : -1} />
    </div>
  );
}
