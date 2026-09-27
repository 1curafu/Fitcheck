import type { ShippedLocale } from "./locales";
import enUS from "@/messages/en-US.json";

export type Messages = typeof enUS;
type Tree = { [k: string]: string | Tree };

function merge(base: Tree, over: Tree): Tree {
  const out: Tree = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = typeof v === "object" && typeof base[k] === "object" ? merge(base[k] as Tree, v) : v;
  }
  return out;
}

const LOADERS: Record<ShippedLocale, () => Promise<Tree>> = {
  "en-US": async () => ({}),
  "en-GB": async () => (await import("@/messages/en-GB.json")).default as Tree,
  uk: async () => (await import("@/messages/uk.json")).default as Tree,
};

/** Every locale sits on top of en-US, so a missing key shows English, never a raw key. */
export async function messagesFor(locale: ShippedLocale): Promise<Messages> {
  return merge(enUS as Tree, await LOADERS[locale]()) as Messages;
}
