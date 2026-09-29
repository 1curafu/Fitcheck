import { readFileSync, readdirSync } from "node:fs";

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = `${dir}/${e.name}`;
    if (e.isDirectory()) return e.name === "__tests__" ? [] : sources(path);
    return /\.(ts|tsx)$/.test(e.name) ? [path] : [];
  });
}

test("no route sends a signed-out visitor to the marketing page instead of sign-in", () => {
  const offenders = sources("app/[locale]").filter((f) => /redirect\(\{\s*href:\s*"\/(\?[^"]*)?"/.test(readFileSync(f, "utf8")));
  expect(offenders).toEqual([]);
});
