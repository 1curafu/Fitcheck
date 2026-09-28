import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, isShippedLocale, localizedPath } from "@/lib/i18n/locales";
import { PENDING_LOCALE_COOKIE, pendingLocaleForUser, withLocale } from "@/lib/i18n/preference";
import { resolveSignInLocale } from "@/lib/i18n/sign-in";
import { readPreferences } from "@/lib/profile/preferences";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const browsing = request.cookies.get("NEXT_LOCALE")?.value;
  const browsingLocale = isShippedLocale(browsing) ? browsing : DEFAULT_LOCALE;
  const failed = () => NextResponse.redirect(new URL(localizedPath(browsingLocale, "/?error=auth"), origin));

  // Validate the parsed origin too: URL parsing strips tabs/newlines, which can turn "/\n/evil" into "//evil".
  const rawNext = searchParams.get("next") ?? "/onboarding";
  let next = "/onboarding";
  if (rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")) {
    try {
      const destination = new URL(rawNext, origin);
      if (destination.origin === origin) next = `${destination.pathname}${destination.search}${destination.hash}`;
    } catch { /* Invalid destinations use onboarding. */ }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failed();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return failed();

    const pending = pendingLocaleForUser(request.cookies.get(PENDING_LOCALE_COOKIE)?.value, user.id);
    let preferences: unknown;
    let readFailed = false;
    try {
      const { data, error: readError } = await supabase.from("profiles").select("preferences").eq("id", user.id).single();
      if (readError) throw readError;
      preferences = data?.preferences;
    } catch { readFailed = true; }

    const { locale, save } = resolveSignInLocale(readPreferences(preferences).locale, browsing, pending);
    const response = NextResponse.redirect(new URL(localizedPath(locale, next), origin));
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });

    if (save) {
      let saved = false;
      if (!readFailed) {
        try {
          const { error: writeError } = await supabase.from("profiles").update({ preferences: withLocale(preferences, locale) }).eq("id", user.id);
          if (writeError) throw writeError;
          saved = true;
        } catch { /* A retry marker below preserves the explicit choice. */ }
      }
      if (saved) {
        if (pending) response.cookies.delete(PENDING_LOCALE_COOKIE);
      } else {
        Sentry.captureMessage("sign-in locale preference not saved", "warning");
        response.cookies.set(PENDING_LOCALE_COOKIE, `${user.id}:${locale}`, {
          path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        });
      }
    }

    try {
      const { error: metadataError } = await supabase.auth.updateUser({ data: { locale } });
      if (metadataError) throw metadataError;
    } catch { Sentry.captureMessage("sign-in locale auth metadata not saved", "warning"); }
    return response;
  }

  return failed();
}
