import { describe, expect, it } from "vitest";
import { planExpiry } from "../plan.mjs";

const now = new Date("2026-11-01T00:00:00Z");
describe("planExpiry", () => {
  it("expires shares published over 30 days ago and drafts older than a day, keeps live ones", () => {
    const r = planExpiry({ now, folders: [], rows: [
      { token: "live", ready_at: "2026-10-20T00:00:00Z", created_at: "2026-10-20T00:00:00Z" },
      { token: "old", ready_at: "2026-09-30T00:00:00Z", created_at: "2026-09-30T00:00:00Z" },
      { token: "draft-stale", ready_at: null, created_at: "2026-10-30T00:00:00Z" },
      { token: "draft-fresh", ready_at: null, created_at: "2026-10-31T12:00:00Z" },
    ] });
    expect(r.expire.sort()).toEqual(["draft-stale", "old"]);
  });
  it("purges folders with no row once they are a day old", () => {
    const r = planExpiry({ now, rows: [{ token: "live", ready_at: "2026-10-20T00:00:00Z", created_at: "2026-10-20T00:00:00Z" }], folders: [
      { name: "live", modTime: "2026-10-01T00:00:00Z" }, { name: "ghost", modTime: "2026-10-01T00:00:00Z" },
      { name: "ghost-new", modTime: "2026-10-31T20:00:00Z" },
    ] });
    expect(r.orphans).toEqual(["ghost"]);
  });
  it("expires a published share immediately after its 30-day window", () => {
    const r = planExpiry({ now, folders: [], rows: [
      { token: "boundary", ready_at: "2026-10-01T23:59:00Z", created_at: "2026-10-01T23:59:00Z" },
    ] });
    expect(r.expire).toEqual(["boundary"]);
  });
  it("refuses anything that is not a token", () => {
    expect(() => planExpiry({ now, rows: [], folders: [{ name: "../x", modTime: "2026-01-01T00:00:00Z" }] })).toThrow("Unexpected folder");
  });
  it("keeps an old draft when its owner has just started refreshing it", () => {
    const r = planExpiry({ now, folders: [], rows: [
      { token: "refreshing", ready_at: null, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-10-31T23:00:00Z" },
    ] });
    expect(r.expire).toEqual([]);
  });
  it("retries cleanup for a share already claimed for purging", () => {
    const r = planExpiry({ now, folders: [], rows: [
      { token: "claimed", ready_at: "2026-10-31T00:00:00Z", created_at: "2026-10-31T00:00:00Z",
        updated_at: "2026-10-31T00:00:00Z", purging_at: "2026-10-31T20:00:00Z" },
    ] });
    expect(r.expire).toEqual(["claimed"]);
  });
});
