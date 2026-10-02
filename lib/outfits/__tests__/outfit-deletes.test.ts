import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : files(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

test("outfit replacement deletes go through the saved-look durability helper", () => {
  const bypasses: string[] = [];
  for (const file of [...files("app"), ...files("lib")]) {
    if (file === "lib/outfits/release.ts") continue;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "delete") {
        let current: ts.Expression = node.expression.expression;
        while (ts.isCallExpression(current) && ts.isPropertyAccessExpression(current.expression)) {
          if (current.expression.name.text === "from" && ts.isStringLiteral(current.arguments[0]) && current.arguments[0].text === "outfits") bypasses.push(file);
          current = current.expression.expression;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(bypasses).toEqual([]);
});

test.each(["app/[locale]/packing/[tripId]/page.tsx", "app/[locale]/packing/[tripId]/days/page.tsx"])("%s excludes released looks from trip days", file => {
  const source = readFileSync(file, "utf8");
  const query = source.match(/\.from\("outfits"\)[\s\S]*?;/)?.[0];
  expect(query).toContain('.is("released_at", null)');
});
