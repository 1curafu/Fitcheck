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
  ru: async () => (await import("@/messages/ru.json")).default as Tree,
  de: async () => (await import("@/messages/de.json")).default as Tree,
  fr: async () => (await import("@/messages/fr.json")).default as Tree,
  it: async () => (await import("@/messages/it.json")).default as Tree,
  pt: async () => (await import("@/messages/pt.json")).default as Tree,
  es: async () => (await import("@/messages/es.json")).default as Tree,
  nl: async () => (await import("@/messages/nl.json")).default as Tree,
};

/** Every locale sits on top of en-US, so a missing key shows English, never a raw key. */
export async function messagesFor(locale: ShippedLocale): Promise<Messages> {
  return merge(enUS as Tree, await LOADERS[locale]()) as Messages;
}
