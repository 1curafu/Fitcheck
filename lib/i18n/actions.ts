"use server";

import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isShippedLocale } from "./locales";
import { PENDING_LOCALE_COOKIE, pendingLocaleForUser, withLocale } from "./preference";

export async function setLocale(locale: string): Promise<{ status: "ok" }> {
  if (!isShippedLocale(locale)) throw new Error("Unsupported locale");
  const jar = await cookies();
  jar.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "ok" };

  try {
    const { data, error: readError } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
    if (readError) throw readError;
    const { error } = await supabase.from("profiles").update({ preferences: withLocale(data?.preferences, locale) }).eq("id", user.id);
    if (error) throw error;
    if (pendingLocaleForUser(jar.get(PENDING_LOCALE_COOKIE)?.value, user.id)) jar.delete(PENDING_LOCALE_COOKIE);
  } catch {
    jar.set(PENDING_LOCALE_COOKIE, `${user.id}:${locale}`, {
      path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    Sentry.captureMessage("locale preference not saved", "warning");
    return { status: "ok" };
  }

  try {
    const { error } = await supabase.auth.updateUser({ data: { locale } });
    if (error) throw error;
  } catch { Sentry.captureMessage("locale auth metadata not saved", "warning"); }
  return { status: "ok" };
}
