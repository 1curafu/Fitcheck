import { expect, it } from "vitest";
import { trustedOrigin } from "../urls";

it.each([
  ["https://fitcheck.space", "https://fitcheck.space"],
  ["http://localhost:3000", "http://localhost:3000"],
  ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
  ["https://fitcheck-git-feat-x-1curafus-projects.vercel.app", "https://fitcheck-git-feat-x-1curafus-projects.vercel.app"],
  ["https://evil.example", "https://fitcheck.space"],
  ["https://fitcheck.space.evil.example", "https://fitcheck.space"],
  [null, "https://fitcheck.space"],
])("%s → %s", (origin, want) => expect(trustedOrigin(origin)).toBe(want));
