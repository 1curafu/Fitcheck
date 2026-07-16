import Link from "next/link";
import { Surface } from "@/components/ui-fitcheck/surface";

export function ItemCard({
  id,
  name,
  brand,
  imageUrl,
  height,
}: {
  id: string;
  name: string;
  brand?: string | null;
  imageUrl: string;
  height: number;
}) {
  return (
    <Link href={`/closet/${id}`} className="mb-3 block break-inside-avoid">
      <Surface className="overflow-hidden">
        <div style={{ height }} className="bg-surface-2">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={name} className="size-full object-contain p-5" />
          ) : null}
        </div>
        <div className="px-3 pb-3 pt-2">
          {brand && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-dim">
              {brand}
            </p>
          )}
          <p className="font-serif text-[15px] text-foreground">{name}</p>
        </div>
      </Surface>
    </Link>
  );
}
