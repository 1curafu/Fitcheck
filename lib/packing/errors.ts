/**
 * Thrown when a free user reaches for packing mode. The screen offers the
 * upgrade sheet rather than an error.
 *
 * ⚠️ Lives here rather than in `app/packing/actions.ts` because a `"use server"`
 * file may only export async functions — a class exported from one breaks the
 * build, and the message says so only at build time.
 */
export class PackingLockedError extends Error {
  constructor() {
    super("Packing mode is a Pro feature");
    this.name = "PackingLockedError";
  }
}
