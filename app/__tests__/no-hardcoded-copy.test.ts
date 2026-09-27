import { readFileSync, readdirSync } from "node:fs";
import ts from "typescript";
import { expect, it } from "vitest";

/** Remove entries as each area is extracted; Task 21 requires an empty list. */
export const PENDING = [
  "app/[locale]/closet/page.tsx", "app/[locale]/closet/removed/", "app/[locale]/closet/[itemId]/", "components/closet/",
  "app/[locale]/generate/", "components/generate/", "components/weather/",
  "app/[locale]/outfits/", "components/outfits/", "app/[locale]/l/",
  "app/[locale]/calendar/", "components/diary/", "app/[locale]/stats/", "components/stats/", "app/[locale]/profile/", "components/profile/",
  "app/[locale]/settings/", "components/settings/", "components/billing/",
  "app/[locale]/packing/", "components/packing/",
];

const COPY_PROPS = new Set(["aria-label", "placeholder", "title", "alt", "label", "aria-description"]);
const LETTERS = /\p{L}{2,}/u;

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : filesUnder(path);
    return entry.isFile() && path.endsWith(".tsx") && !path.endsWith(".test.tsx") ? [path] : [];
  });
}

function offences(file: string): string[] {
  const src = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && LETTERS.test(node.text)) out.push(node.text.trim());
    if (ts.isJsxAttribute(node) && COPY_PROPS.has(node.name.getText()) && node.initializer) {
      const value = ts.isStringLiteral(node.initializer)
        ? node.initializer.text
        : ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isStringLiteral(node.initializer.expression)
          ? node.initializer.expression.text
          : null;
      if (value && LETTERS.test(value)) out.push(`${node.name.getText()}="${value}"`);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

it("no user-facing copy is hard-coded outside the folders still pending extraction", () => {
  const pending = process.env.FITCHECK_COPY_INVENTORY ? [] : PENDING;
  const found = [...filesUnder("app/[locale]"), ...filesUnder("components")]
    .filter((file) => !pending.some((prefix) => file.startsWith(prefix)))
    .flatMap((file) => offences(file).map((copy) => `${file}: ${copy}`));
  expect(found).toEqual([]);
});

it.skip("every folder has been extracted (Task 21 unskips)", () => {
  expect(PENDING).toEqual([]);
});
