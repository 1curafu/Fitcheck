import { cn } from "@/lib/utils";

export function Kicker({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "brand";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "uppercase",
        variant === "brand"
          ? "text-[13px] tracking-[0.34em] text-brand"
          : "text-[11px] tracking-[0.22em] text-muted-dim",
        className,
      )}
    >
      {children}
    </span>
  );
}
