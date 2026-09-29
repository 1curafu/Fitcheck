import { beforeEach, expect, it, vi } from "vitest";

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

import { revalidateEverywhere } from "../revalidate";

beforeEach(() => revalidatePath.mockClear());

it("revalidates each routed locale using the route's internal path", () => {
  revalidateEverywhere("/closet/abc");
  expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual([
    "/en-US/closet/abc",
    "/en-GB/closet/abc",
    "/uk/closet/abc",
    "/ru/closet/abc",
    "/de/closet/abc",
    "/fr/closet/abc",
    "/it/closet/abc",
    "/pt/closet/abc",
    "/es/closet/abc",
    "/nl/closet/abc",
  ]);
});

it("revalidates the root without a trailing slash", () => {
  revalidateEverywhere("/");
  expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(["/en-US", "/en-GB", "/uk", "/ru", "/de", "/fr", "/it", "/pt", "/es", "/nl"]);
});
