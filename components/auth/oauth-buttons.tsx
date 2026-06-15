"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function OAuthButtons() {
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: "google") {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${location.origin}/auth/callback?next=/onboarding` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => void signIn("google")}
        className="flex items-center justify-center gap-2 rounded-[12px] bg-foreground py-[18px] font-semibold tracking-[0.01em] text-canvas"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1S8.7 6 12 6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 3.3 14.7 2.3 12 2.3 6.9 2.3 2.7 6.5 2.7 11.6S6.9 21 12 21c5.4 0 9-3.8 9-9.1 0-.6-.07-1.1-.16-1.6z" />
        </svg>
        Continue with Google
      </button>
      {error && <p className="text-sm text-brand">{error}</p>}
    </div>
  );
}
