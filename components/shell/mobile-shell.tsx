import { Suspense } from "react";
import { Grain } from "./grain";
import { CookieNotice } from "./cookie-notice";
import { WideFlag } from "./wide-flag";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    // 440px unless WideFlag (the landing only) overrides --shell-max.
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[var(--shell-max,440px)] flex-col overflow-x-clip bg-canvas">
      <Suspense fallback={null}>
        <WideFlag />
      </Suspense>
      <Grain />
      {/* Not user-specific — safe in the shell. Whichever screen a visitor
          lands on first, they see it once. First in the flow, so it pushes
          the screen down rather than covering any part of it. */}
      <CookieNotice />
      {children}
    </div>
  );
}
