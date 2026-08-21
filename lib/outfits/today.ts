import "server-only";
import { connection } from "next/server";
import { localDateFor, localHourFor } from "./local-date";

/**
 * The user's local date, read at REQUEST time.
 *
 * ⚠️ `await connection()` is what makes this legal under Cache Components.
 * `new Date()` is an unstable value: Next refuses to prerender it, because a
 * clock read baked into a shell would be frozen at build time and then wrong
 * for every visitor after the first. The insight is
 * `blocking-prerender-current-time`, and it fires on TEN routes.
 *
 * ⚠️ **It does not appear in the build.** `npm run build` passed clean while
 * every one of those routes was de-opting at runtime — the dev overlay and the
 * dev-server log are the only places it surfaces. That is why the plan made
 * walking the app in dev a required step, and why skipping it nearly shipped
 * this.
 *
 * Deliberately NOT solved by hoisting the date to a constant or using UTC:
 * Decision 5 keys the daily drop on the user's LOCAL date, and a UTC key rolls
 * the drop over mid-evening for eastern users. The date is genuinely
 * request-time data, so marking it as such is the correct fix rather than a
 * workaround.
 */
export async function todayFor(timezone: string | null | undefined): Promise<string> {
  await connection();
  return localDateFor(new Date(), timezone ?? "UTC");
}

/** The user's local hour, same contract as `todayFor`. */
export async function hourFor(timezone: string | null | undefined): Promise<number> {
  await connection();
  return localHourFor(new Date(), timezone ?? "UTC");
}
