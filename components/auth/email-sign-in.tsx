"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function EmailSignIn() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
          shouldCreateUser: true,
        },
      });
      if (error) setError(t("failed"));
      else setSent(true);
    } catch {
      setError(t("failed"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="font-serif text-2xl text-foreground">{t("checkInbox")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("sentBody", { email })}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void sendLink();
      }}
      className="flex flex-col gap-3"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("emailPlaceholder")}
        autoComplete="email"
        className="rounded-[12px] border border-[--input] bg-surface-1 px-4 py-[16px] text-foreground outline-none placeholder:text-muted-dim focus:border-brand"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-[12px] bg-foreground py-[18px] font-semibold tracking-[0.01em] text-canvas disabled:opacity-50"
      >
        {loading ? t("sending") : t("emailLink")}
      </button>
      {error && <p className="text-sm text-brand">{error}</p>}
    </form>
  );
}
