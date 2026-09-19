import { deletionDigest, deletionTombstoneName } from "../ledger.mjs";

const userId = "715ed5db-f090-4b8c-a067-640ecee36aa0";
const key = "test-only-hmac-key-with-enough-entropy";
const when = new Date("2026-09-19T08:09:10.000Z");

test("uses a stable versioned UTC path without exposing the user id", () => {
  const name = deletionTombstoneName(userId, when, key);
  expect(name).toMatch(/^deletion-ledger\/v1\/2026-09-19\/[a-f0-9]{64}\.json$/);
  expect(name).not.toContain(userId);
  expect(name).not.toContain("@");
  expect(deletionDigest(userId, key)).toHaveLength(64);
});

test("a different HMAC key cannot correlate the same account", () => {
  expect(deletionDigest(userId, key)).not.toBe(deletionDigest(userId, `${key}-rotated`));
});
