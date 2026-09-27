import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || file === "lib/i18n" ? [] : sourceFiles(file);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}

const files = ["app", "components", "lib"].flatMap(sourceFiles);
const LOCALE_FREE = /^app\/(api|auth|billing\/return)\//;

it("uses locale-aware links, navigation and revalidation on routed surfaces", () => {
  const offenders = files.filter((file) => !LOCALE_FREE.test(file)).filter((file) => {
    const source = readFileSync(file, "utf8");
    return /from "next\/link"/.test(source) ||
      /import\s*{[^}]*\b(useRouter|usePathname|redirect)\b[^}]*}\s*from "next\/navigation"/.test(source) ||
      /\brevalidatePath\(/.test(source);
  });
  expect(offenders).toEqual([]);
});
