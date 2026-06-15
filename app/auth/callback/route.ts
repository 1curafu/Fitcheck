import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Open-redirect guard: only allow same-origin relative paths (reject "//evil",
  // "/\\evil", and absolute URLs). new URL(next, origin) keeps it on our origin.
  const rawNext = searchParams.get("next") ?? "/onboarding";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
