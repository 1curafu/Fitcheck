"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

import { useState, useTransition } from "react";
import { QUESTIONS } from "@/lib/onboarding/questions";
import { saveStyleProfile } from "@/app/[locale]/onboarding/actions";
import { QuestionOptions, nextSelection } from "./question-options";
import { toStyleProfileInput } from "@/lib/onboarding/style-profile";
import { Kicker } from "@/components/ui-fitcheck/kicker";

type Answers = Record<string, string[]>;

export function Quiz() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const q = QUESTIONS[step];
  const selected = answers[q.id] ?? [];
  const total = QUESTIONS.length;
  const isLast = step === total - 1;
  const progress = Math.round(((step + 1) / total) * 100);
  const canNext = q.optional ? true : selected.length > 0;
  const questionKey = (field: "kicker" | "title" | "sub" | "cta") =>
    `questions.${q.id}.${field}` as never;

  function toggle(value: string) {
    setAnswers((prev) => ({ ...prev, [q.id]: nextSelection(q, prev[q.id] ?? [], value) }));
  }

  function next() {
    if (!canNext) return;
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveStyleProfile(toStyleProfileInput(answers));
      } catch {
        setError(t("saveFailed"));
      }
    });
  }

  return (
    <main className="screen-top flex flex-1 flex-col px-6 pb-7">
      {/* progress */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-2xl leading-none text-muted-foreground disabled:opacity-30"
          aria-label={common("back")}
        >
          ‹
        </button>
        <div className="h-[2px] flex-1 overflow-hidden rounded bg-foreground/10">
          <div
            className="h-full rounded bg-brand transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="min-w-[34px] text-right text-[11px] tracking-[0.16em] text-muted-dim">
          {step + 1} / {total}
        </span>
      </div>

      <Kicker className="mb-[10px] block">{t(questionKey("kicker"))}</Kicker>
      <h1 className="mb-1 font-serif text-3xl/[1.12] text-foreground">
        {t(questionKey("title"))}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{t(questionKey("sub"))}</p>

      <QuestionOptions question={q} selected={selected} onToggle={toggle} />

      <div className="flex-1" />
      {error && <p className="mt-4 text-center text-sm text-brand">{error}</p>}
      <button
        onClick={next}
        disabled={!canNext || pending}
        className={`mt-6 rounded-[12px] py-[17px] text-center font-semibold transition-opacity ${
          canNext ? "bg-foreground text-canvas" : "bg-foreground/10 text-muted-dim"
        }`}
      >
        {pending ? t("saving") : t(questionKey("cta"))}
      </button>
      {/* On the FIRST step only: this is the moment an account becomes real,
          and the Terms say continuing is agreement — so the agreement has to be
          in view where it is made, not only on a sign-in screen the user has
          already left. */}
      {step === 0 && (
        <p className="mt-3 text-center text-[11px] text-muted-dim">
          {t("agreementLead")}{" "}
          <Link href="/terms" className="text-muted-foreground underline underline-offset-2">{t("terms")}</Link>
          {" "}{t("and")}{" "}
          <Link href="/privacy" className="text-muted-foreground underline underline-offset-2">{t("privacy")}</Link>.
        </p>
      )}
    </main>
  );
}
