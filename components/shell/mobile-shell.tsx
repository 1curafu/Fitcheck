import { Grain } from "./grain";
import { CookieNotice } from "./cookie-notice";
import { ShellFrame } from "./shell-frame";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <ShellFrame>
      <Grain />
      {/* Not user-specific — safe in the shell. Whichever screen a visitor
          lands on first, they see it once. First in the flow, so it pushes
          the screen down rather than covering any part of it. */}
      <CookieNotice />
      {children}
    </ShellFrame>
  );
}
