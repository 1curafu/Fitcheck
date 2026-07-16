import { cn } from "@/lib/utils";

type ChipVariant = "filter" | "select";

export function Chip({
  children,
  active = false,
  variant = "filter",
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  variant?: ChipVariant;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-[17px] py-3 text-sm font-medium transition-colors",
        // filter pills (closet) → cream fill when active
        variant === "filter" &&
          (active
            ? "bg-foreground text-canvas"
            : "border border-[--input] bg-transparent text-foreground"),
        // select chips (generate occasions, onboarding multi-selects) → brand-tint
        variant === "select" &&
          (active
            ? "border border-brand/50 bg-brand/15 text-brand-high"
            : "border border-[--input] bg-surface-1 text-muted-foreground"),
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}
