import { expect, it } from "vitest";
import { messagesFor } from "../messages";

it("en-GB falls back to en-US for every key it does not override", async () => {
  const us = await messagesFor("en-US");
  const gb = await messagesFor("en-GB");
  expect(Object.keys(gb)).toEqual(Object.keys(us));
  expect(gb.notFound.title).toBe(us.notFound.title);
});
it("Ukrainian has its own strings", async () => {
  const uk = await messagesFor("uk");
  expect(uk.notFound.title).not.toBe((await messagesFor("en-US")).notFound.title);
});
