import { Grain } from "./grain";
import { CookieNotice } from "./cookie-notice";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (

    <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-x-clip bg-canvas">
      <Grain />
      {children}
      {/* Not user-specific — safe in the shell. Whichever screen a visitor
          lands on first, they see it once. */}
      <CookieNotice />
    </div>
  );
}
