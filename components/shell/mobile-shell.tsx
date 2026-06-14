import { Grain } from "./grain";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-canvas">
      <Grain />
      {children}
    </div>
  );
}
