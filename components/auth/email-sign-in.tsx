"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function EmailSignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendLink() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
        shouldCreateUser: true,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="font-serif text-2xl text-foreground">Check your inbox</p>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a sign-in link to {email}.
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
        placeholder="you@email.com"
        autoComplete="email"
        className="rounded-[12px] border border-[--input] bg-surface-1 px-4 py-[16px] text-foreground outline-none placeholder:text-muted-dim focus:border-brand"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-[12px] bg-foreground py-[18px] font-semibold tracking-[0.01em] text-canvas disabled:opacity-50"
      >
        {loading ? "Sending…" : "Email me a sign-in link"}
      </button>
      {error && <p className="text-sm text-brand">{error}</p>}
    </form>
  );
}
