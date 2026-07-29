import { cn } from "@/lib/utils";

export function Surface({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        // `.surface-card` (globals.css @layer components) carries the design's
        // card gradient AND its inset hairline. It replaced a flat
        // `bg-surface-1` + a hard-coded 0.07 ring: the design never fills a
        // raised surface with a solid colour, and drawing one flattened the
        // depth that the directional gradient provides.
        //
        // Do not re-add a `bg-*` utility here or at a call site — utilities sit
        // after components in Tailwind v4's layer order, so it would win and
        // silently restore the flat fill.
        "surface-card rounded-[14px]",
        className,
      )}
      {...props}
    />
  );
}
