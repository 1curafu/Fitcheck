import { describe, expect, test } from "vitest";
import { selectSnapshotsToForget } from "../retention.mjs";

type Snapshot = { short_id: string; time: string };

const NOW = new Date("2026-09-18T12:00:00.000Z");

function snapshot(short_id: string, time: string): Snapshot {
  return { short_id, time };
}

describe("selectSnapshotsToForget", () => {
  test("keeps every snapshot younger than 14 days", () => {
    const snapshots = [
      snapshot("today", "2026-09-18T02:30:00.000Z"),
      snapshot("day-13-newer", "2026-09-05T00:00:00.000Z"),
      snapshot("day-13-older", "2026-09-04T13:00:00.000Z"),
    ];

    expect(selectSnapshotsToForget(snapshots, NOW)).toEqual([]);
  });

  test("from day 14 through day 30 keeps only the newest snapshot in each ISO week", () => {
    const snapshots = [
      snapshot("week-36-older", "2026-09-01T02:30:00.000Z"),
      snapshot("week-36-newest", "2026-09-04T02:30:00.000Z"),
      snapshot("week-35-older", "2026-08-25T02:30:00.000Z"),
      snapshot("week-35-newest", "2026-08-30T02:30:00.000Z"),
      snapshot("exactly-day-30", "2026-08-19T12:00:00.000Z"),
    ];

    expect(selectSnapshotsToForget(snapshots, NOW)).toEqual([
      "week-36-older",
      "week-35-older",
    ]);
  });

  test("forgets every snapshot older than 30 days even when it is the only one in its week", () => {
    const snapshots = [
      snapshot("exactly-day-30", "2026-08-19T12:00:00.000Z"),
      snapshot("past-cutoff", "2026-08-19T11:59:59.999Z"),
      snapshot("much-older", "2026-05-01T02:30:00.000Z"),
    ];

    expect(selectSnapshotsToForget(snapshots, NOW)).toEqual([
      "past-cutoff",
      "much-older",
    ]);
  });

  test("forgets an isolated snapshot one millisecond beyond the legal cutoff", () => {
    expect(
      selectSnapshotsToForget(
        [snapshot("past-cutoff", "2026-08-19T11:59:59.999Z")],
        NOW,
      ),
    ).toEqual(["past-cutoff"]);
  });

  test("uses wall-clock time rather than the newest snapshot as the retention anchor", () => {
    const snapshots = [
      snapshot("newest-but-expired", "2026-08-10T02:30:00.000Z"),
      snapshot("older", "2026-08-01T02:30:00.000Z"),
    ];

    expect(selectSnapshotsToForget(snapshots, NOW)).toEqual([
      "newest-but-expired",
      "older",
    ]);
  });

  test.each([
    ["future", snapshot("future", "2026-09-18T12:00:00.001Z")],
    ["invalid timestamp", snapshot("invalid", "not-a-date")],
    ["missing id", { short_id: "", time: "2026-09-01T02:30:00.000Z" }],
  ])("rejects a %s instead of silently weakening retention", (_label, badSnapshot) => {
    expect(() => selectSnapshotsToForget([badSnapshot], NOW)).toThrow();
  });

  test("rejects an invalid current time", () => {
    expect(() => selectSnapshotsToForget([], new Date("invalid"))).toThrow(
      "current time",
    );
  });
});
