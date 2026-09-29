import { revalidatePath } from "next/cache";
import { SHIPPED_LOCALES } from "./locales";

/** Rewrites resolve to these internal route paths, so invalidate each shipped locale's page. */
export function revalidateEverywhere(path: string): void {
  for (const locale of SHIPPED_LOCALES) {
    revalidatePath(path === "/" ? `/${locale}` : `/${locale}${path}`);
  }
}
