"use client";

import { motion } from "motion/react";
import { useState, type CSSProperties } from "react";
import type { Look } from "@/lib/generator/types";
import { staggerOrder } from "@/lib/generator/layout";

// Synchronous first-read (unlike motion's effect-based useReducedMotion) so the base
// state is correct on the very first render — the outfit is never invisible under reduce.
function usePrefersReducedMotion(): boolean {
  const [reduce] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  return reduce;
}

export function FlatLay({ look }: { look: Look }) {
  const reduce = usePrefersReducedMotion();
  const order = staggerOrder(look.pieces.map((p) => p.slot)); // anchor-first indices

  return (
    <div
      className="relative flex-1 overflow-hidden rounded-[16px] border border-[rgba(237,230,216,0.07)] [background:radial-gradient(120%_100%_at_50%_20%,#211f22,#141315)]"
      style={{ minHeight: 200 }}
    >
      {look.pieces.map((p, i) => {
        const s = p.slot;
        // left/top/width/height/z are inline in BOTH paths; transform + opacity differ:
        const base: CSSProperties = {
          position: "absolute",
          left: `${s.xPct}%`,
          top: `${s.yPct}%`,
          width: `${s.wPct}%`,
          height: `${s.hPct}%`,
          zIndex: s.z,
          filter: "drop-shadow(0 14px 18px rgba(0,0,0,.55))",
        };

        // Reduced motion (D1): plain, VISIBLE image — never gate visibility on an animation.
        if (reduce) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.itemId}
              src={p.cutoutUrl}
              alt={p.name ?? p.subcategory ?? p.category}
              className="object-contain"
              style={{ ...base, transform: `rotate(${s.rotationDeg}deg)`, opacity: 1 }}
            />
          );
        }

        // Motion: re-lay stagger, anchor-first, 45ms apart. rotate lives in the motion
        // transform (not style) so it isn't clobbered by the animated translateY.
        return (
          <motion.img
            key={p.itemId}
            src={p.cutoutUrl}
            alt={p.name ?? p.subcategory ?? p.category}
            className="object-contain"
            style={base}
            initial={{ opacity: 0, y: 10, rotate: s.rotationDeg }}
            animate={{ opacity: 1, y: 0, rotate: s.rotationDeg }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: order.indexOf(i) * 0.045 }}
          />
        );
      })}
    </div>
  );
}
