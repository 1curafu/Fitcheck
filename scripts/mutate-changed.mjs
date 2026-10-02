// Runs Stryker only on lib/ and action files changed against origin/develop (or the ref given as the first argument).
import { execFileSync } from "node:child_process";

const base = process.argv[2] ?? "origin/develop";
const changed = execFileSync("git", ["diff", "--name-only", "--diff-filter=AM", `${base}...HEAD`], { encoding: "utf8" })
  .split("\n")
  .filter((f) => /^(lib\/.*\.ts|app\/.*\/actions\.ts)$/.test(f) && !f.includes("__tests__") && !f.endsWith(".test.ts"));

if (!changed.length) {
  console.log(`No mutable lib/ or action files changed against ${base}.`);
  process.exit(0);
}
console.log(`Mutating ${changed.length} file(s):\n${changed.join("\n")}`);
execFileSync("npx", ["stryker", "run", "--mutate", changed.map(file => file.replace(/[\[\]]/g, bracket => bracket === "[" ? "[[]" : "[]]")).join(",")], { stdio: "inherit" });
