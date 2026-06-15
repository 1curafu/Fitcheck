import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { EmailSignIn } from "@/components/auth/email-sign-in";

export default async function Welcome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/onboarding");

  return (
    <main className="flex flex-1 flex-col justify-between px-7 pb-10 pt-20">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <p className="mb-[22px] text-[13px] uppercase tracking-[0.34em] text-brand">
          Your AI Stylist
        </p>
        <h1 className="font-serif text-7xl/[0.92] tracking-[-0.02em] text-foreground">
          fitcheck
        </h1>
        <p className="mt-[26px] max-w-[280px] font-serif text-[21px]/[1.45] italic text-muted-foreground">
          A wardrobe that thinks. Daily looks, composed from the clothes you
          already own.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <OAuthButtons />
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-dim">
          <span className="h-px flex-1 bg-[--border]" />
          or
          <span className="h-px flex-1 bg-[--border]" />
        </div>
        <EmailSignIn />
      </div>
    </main>
  );
}
