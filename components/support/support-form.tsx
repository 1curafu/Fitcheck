"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Select } from "@/components/ui-fitcheck/select";
import { SUPPORT_EMAIL, SUPPORT_TOPICS } from "@/lib/support/contact";
import type { SupportField, SupportMessage, SupportResult } from "@/lib/support/schema";
import { SupportTurnstile } from "./turnstile";

const INPUT = "w-full rounded-xl border border-[--input] bg-surface-1 px-4 py-4 text-sm text-foreground outline-none focus:border-brand disabled:opacity-50";
const BUTTON = "min-h-11 w-full rounded-xl bg-foreground px-4 py-4 text-sm font-semibold text-canvas disabled:opacity-50";

export function SupportForm({ enabled, siteKey, onSendAction }: {
  enabled: boolean;
  siteKey: string | null;
  onSendAction: (input: unknown) => Promise<SupportResult>;
}) {
  const t = useTranslations("support");
  const [replyEmail, setReplyEmail] = useState("");
  const [topic, setTopic] = useState<SupportMessage["topic"]>("account");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<SupportResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [verificationUnavailable, setVerificationUnavailable] = useState(false);
  const [isPending, startTransition] = useTransition();
  const retryId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const lifecycle = useRef(0);
  const attemptSequence = useRef(0);
  const status = useRef<HTMLDivElement>(null);
  const fields = useRef<Partial<Record<SupportField, HTMLElement>>>({});

  useEffect(() => {
    lifecycle.current += 1;
    return () => {
      lifecycle.current += 1;
      setToken(null);
      setResult(null);
      setVerificationUnavailable(false);
    };
  }, []);
  useEffect(() => {
    if (!result || isPending) return;
    const invalid = result.status === "invalid"
      ? (["replyEmail", "topic", "message"] as const).find(field => result.fieldErrors[field]) : undefined;
    (invalid ? fields.current[invalid] : status.current)?.focus();
  }, [result, isPending]);

  const onToken = useCallback((value: string | null) => {
    setToken(value);
    if (value) setVerificationUnavailable(false);
  }, []);
  const onUnavailable = useCallback(() => { setToken(null); setVerificationUnavailable(true); }, []);
  function edit() { retryId.current = null; setResult(null); }
  function refresh() { setToken(null); setVerificationUnavailable(false); setRefreshKey(value => value + 1); }
  function send() {
    if (inFlight.current || isPending || !enabled || !siteKey || !token) return;
    inFlight.current = true;
    const epoch = lifecycle.current;
    const attempt = ++attemptSequence.current;
    const submissionId = retryId.current ?? crypto.randomUUID();
    retryId.current = submissionId;
    const payload = { replyEmail, topic, message, submissionId, challengeToken: token };
    setToken(null);
    setResult(null);
    startTransition(async () => {
      try {
        const next = await onSendAction(payload);
        if (lifecycle.current !== epoch) return;
        setResult(next);
        if (next.status === "sent") {
          setReplyEmail(""); setTopic("account"); setMessage(""); retryId.current = null;
        }
      } catch {
        if (lifecycle.current === epoch) setResult({ status: "failed", message: t("results.failed") });
      } finally {
        if (attemptSequence.current === attempt) inFlight.current = false;
        if (lifecycle.current === epoch) setRefreshKey(value => value + 1);
      }
    });
  }
  const errors = result?.status === "invalid" ? result.fieldErrors : {};
  const error = (field: SupportField) => errors[field] && <p id={`support-${field}-error`} className="mt-2 text-sm text-brand-high">{errors[field]}</p>;
  const fallback = <div className="mt-6 space-y-2 text-sm">
    <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-11 items-center text-brand underline underline-offset-4">{t("emailFallback")}</a>
    <p><Link href="/privacy" className="inline-flex min-h-11 items-center text-muted-foreground underline underline-offset-4">{t("privacyHint")}</Link></p>
  </div>;
  if (!enabled || !siteKey) return <section><p className="text-sm text-muted-foreground">{t("unavailableBody")}</p>{fallback}</section>;
  if (result?.status === "sent") return <section>
    <div ref={status} role="status" tabIndex={-1} className="outline-none">
      <h2 className="font-serif text-2xl">{t("sentTitle")}</h2><p className="mt-3 text-sm text-muted-foreground">{t("sentBody")}</p>
    </div>
    <button type="button" onClick={() => { setResult(null); refresh(); }} className={`${BUTTON} mt-6`}>{t("anotherMessage")}</button>{fallback}
  </section>;
  return <section>
    <form onSubmit={event => { event.preventDefault(); send(); }} className="space-y-5">
      <div>
        <label htmlFor="support-email" className="mb-2 block text-sm">{t("replyEmail")}</label>
        <input id="support-email" ref={node => { if (node) fields.current.replyEmail = node; }} name="replyEmail" type="email" autoComplete="email" required maxLength={254} value={replyEmail} disabled={isPending}
          aria-invalid={!!errors.replyEmail} aria-describedby={errors.replyEmail ? "support-replyEmail-error" : undefined}
          onChange={event => { edit(); setReplyEmail(event.target.value); }} className={INPUT} />{error("replyEmail")}
      </div>
      <div>
        <label htmlFor="support-topic" className="mb-2 block text-sm">{t("topic")}</label>
        <Select id="support-topic" ref={node => { if (node) fields.current.topic = node; }} name="topic" value={topic} disabled={isPending} aria-invalid={!!errors.topic} aria-describedby={errors.topic ? "support-topic-error" : undefined}
          onChange={event => { edit(); setTopic(event.target.value as SupportMessage["topic"]); }}>
          {SUPPORT_TOPICS.map(value => <option key={value} value={value}>{t(`topics.${value}`)}</option>)}
        </Select>{error("topic")}
      </div>
      <div>
        <label htmlFor="support-message" className="mb-2 block text-sm">{t("message")}</label>
        <textarea id="support-message" ref={node => { if (node) fields.current.message = node; }} name="message" rows={6} minLength={10} maxLength={4000} required value={message} disabled={isPending}
          aria-invalid={!!errors.message} aria-describedby={`support-message-hint${errors.message ? " support-message-error" : ""}`}
          onChange={event => { edit(); setMessage(event.target.value); }} className={`${INPUT} resize-y`} />
        <p id="support-message-hint" className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("messageHint")} {t("sensitiveHint")}</p>{error("message")}
      </div>
      <SupportTurnstile siteKey={siteKey} refreshKey={refreshKey} onToken={onToken} onUnavailable={onUnavailable} />
      {(result || verificationUnavailable) && (
        <div ref={status} role="status" tabIndex={-1} className="text-sm text-muted-foreground outline-none">
          {result?.message ?? t("results.verificationFailed")}
          {verificationUnavailable && (
            <button type="button" disabled={isPending} onClick={refresh} className="block min-h-11 text-brand underline underline-offset-4">
              {t("verificationRetry")}
            </button>
          )}
        </div>
      )}
      <button type="submit" disabled={isPending || !token} className={BUTTON}>{t(isPending ? "sending" : "send")}</button>
    </form>{fallback}
  </section>;
}
