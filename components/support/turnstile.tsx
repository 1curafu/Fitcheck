"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { STUB_SITE_KEY } from "@/lib/support/contact";

type TurnstileApi = {
  render(container: HTMLElement, options: {
    sitekey: string; action: "support"; theme: "dark"; size: "flexible"; language: string;
    "response-field": false; callback: (token: string) => void;
    "expired-callback": () => void; "error-callback": () => void;
  }): string;
  remove(widgetId: string): void;
};

export function SupportTurnstile(props: {
  siteKey: string;
  refreshKey: number;
  onToken: (token: string | null) => void;
  onUnavailable: () => void;
}) {
  const t = useTranslations("support");
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const startupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onToken: props.onToken, onUnavailable: props.onUnavailable });
  const [ready, setReady] = useState(false);
  const { siteKey, refreshKey } = props;

  useEffect(() => { callbacks.current = { onToken: props.onToken, onUnavailable: props.onUnavailable }; });
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const clearToken = () => { if (live) callbacks.current.onToken(null); };
    const unavailable = () => {
      if (!live) return;
      clearToken(); callbacks.current.onUnavailable();
    };
    if (siteKey === STUB_SITE_KEY) {
      callbacks.current.onToken(`${STUB_SITE_KEY}:${crypto.randomUUID()}`);
      return () => { live = false; callbacks.current.onToken(null); };
    }
    if (!ready) {
      const timer = setTimeout(unavailable, 10000);
      startupTimer.current = timer;
      return () => { live = false; clearTimeout(timer); startupTimer.current = null; callbacks.current.onToken(null); };
    }
    const api = (window as Window & { turnstile?: TurnstileApi }).turnstile;
    if (!api || !container.current) {
      unavailable();
      return () => { live = false; callbacks.current.onToken(null); };
    }
    let widgetId: string | undefined;
    try {
      widgetId = api.render(container.current, {
        sitekey: siteKey, action: "support", theme: "dark", size: "flexible",
        language: locale.split("-")[0], "response-field": false,
        callback: token => { if (live) callbacks.current.onToken(token); },
        "expired-callback": clearToken, "error-callback": unavailable,
      });
    } catch { unavailable(); }
    return () => {
      live = false;
      callbacks.current.onToken(null);
      if (widgetId) {
        try { api.remove(widgetId); } catch { /* Already removed/hidden. */ }
      }
    };
  }, [ready, siteKey, refreshKey, locale]);

  return (
    <>
      <div ref={container} role="group" aria-label={t("verificationLabel")} className="min-w-0" />
      {siteKey !== STUB_SITE_KEY && (
        <Script
          id="fitcheck-support-turnstile"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setReady(true)}
          onError={() => {
            if (active.current) {
              if (startupTimer.current) clearTimeout(startupTimer.current);
              callbacks.current.onToken(null); callbacks.current.onUnavailable();
            }
          }}
        />
      )}
    </>
  );
}
