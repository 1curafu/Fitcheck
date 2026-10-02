import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FREE } from "../tiers";

describe("saved outfit limit", () => {
  it("keeps the database enforcement equal to the advertised Free allowance", () => {
    const sql = readFileSync("supabase/migrations/20261002090000_saved_outfits.sql", "utf8");
    expect(Number(sql.match(/>=\s*(\d+)/)?.[1])).toBe(FREE.savedOutfits);
  });
});
