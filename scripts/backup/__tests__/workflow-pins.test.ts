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

describe("production credentials", () => {
  const workflows = resolve(dirname(fileURLToPath(import.meta.url)), "../../../.github/workflows");
  const files = readdirSync(workflows).filter((file) => /\.ya?ml$/.test(file));
  const productionSecret = /secrets\.(SUPABASE_DB_URL|SUPABASE_S3_SECRET_ACCESS_KEY|RESTIC_PASSWORD|B2_BACKUP_APPLICATION_KEY)\b/;

  test("at least the backup and drift workflows use them", () => {
    const users = files.filter((file) => productionSecret.test(readFileSync(join(workflows, file), "utf8")));
    expect(users).toEqual(expect.arrayContaining(["backup.yml", "migration-drift.yml"]));
  });

  test.each(files)("%s only lets production secrets meet code from main", (file) => {
    const text = readFileSync(join(workflows, file), "utf8");
    if (!productionSecret.test(text)) return;
    expect(text, `${file} uses production secrets without a main-only job guard`).toMatch(
      /^\s+if: github\.ref == 'refs\/heads\/main'$/m,
    );
    expect(text, `${file} must not run production secrets on pull_request events`).not.toMatch(/^\s*pull_request/m);
  });
});
