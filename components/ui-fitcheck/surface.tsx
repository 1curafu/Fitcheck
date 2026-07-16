import { cn } from "@/lib/utils";

export function Surface({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-surface-1 rounded-[14px] shadow-[inset_0_0_0_1px_rgba(237,230,216,0.07)]",
        className,
      )}
      {...props}
    />
  );
}
