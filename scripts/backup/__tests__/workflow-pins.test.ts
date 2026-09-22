import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const workflows = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.github/workflows");

describe("GitHub Actions pinning", () => {
  const files = readdirSync(workflows).filter((file) => /\.ya?ml$/.test(file));

  test("finds the workflows", () => {
    expect(files).toEqual(expect.arrayContaining(["backup.yml", "ci.yml"]));
  });

  test.each(files)("%s pins every third-party action to a full commit SHA", (file) => {
    const uses = [...readFileSync(join(workflows, file), "utf8").matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map(
      ([, target]) => target!,
    );
    expect(uses.length).toBeGreaterThan(0);
    for (const target of uses) {
      if (target.startsWith("./")) continue;
      expect(target, `${file}: ${target}`).toMatch(/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/);
    }
  });
});
