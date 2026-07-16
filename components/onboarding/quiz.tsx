"use client";

import { useState, useTransition } from "react";
import { QUESTIONS } from "@/lib/onboarding/questions";
import { saveStyleProfile } from "@/app/onboarding/actions";
import { Chip } from "@/components/ui-fitcheck/chip";
import { Kicker } from "@/components/ui-fitcheck/kicker";

type Answers = Record<string, string[]>;

export function Quiz() {
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

  function toggle(value: string) {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (!q.multi) return { ...prev, [q.id]: [value] }; // single-select replaces
      return {
        ...prev,
        [q.id]: cur.includes(value)
          ? cur.filter((v) => v !== value)
          : [...cur, value],
      };
    });
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
        await saveStyleProfile({
          archetype: (answers.archetype ?? [""])[0],
          palette: (answers.palette ?? [""])[0],
          fit: (answers.fit ?? [""])[0],
          dress_codes: answers.dress_codes ?? [],
          occasions: answers.occasions ?? [],
          nogos: answers.nogos ?? [],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <main className="flex flex-1 flex-col px-6 pb-7 pt-14">
      {/* progress */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-2xl leading-none text-muted-foreground disabled:opacity-30"
          aria-label="Back"
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

      <Kicker className="mb-[10px] block">{q.kicker}</Kicker>
      <h1 className="mb-1 font-serif text-3xl/[1.12] text-foreground">
        {q.title}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{q.sub}</p>

      {q.kind === "grid" && (
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`relative aspect-[0.86] rounded-[14px] border p-4 text-left transition-colors ${
                  on ? "border-brand bg-surface-2" : "border-[--input] bg-surface-1"
                }`}
              >
                <p className="font-serif text-[19px] text-foreground-strong">
                  {opt.label}
                </p>
                {opt.desc && (
                  <p className="mt-1 max-w-[100px] text-[11px] leading-snug text-muted-foreground">
                    {opt.desc}
                  </p>
                )}
                {on && (
                  <span className="absolute right-3 top-3 grid size-[22px] place-items-center rounded-full bg-brand text-[13px] font-bold text-canvas">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {(q.kind === "list" || q.kind === "multi") && (
        <div className="flex flex-col gap-[10px]">
          {q.options.map((opt) => {
            const on = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`flex items-center gap-[14px] rounded-[12px] border px-[18px] py-[17px] text-left transition-colors ${
                  on ? "border-brand bg-surface-2" : "border-[--input] bg-surface-1"
                }`}
              >
                {opt.swatch && (
                  <span
                    className="size-[30px] shrink-0 rounded-[8px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
                    style={{ background: opt.swatch }}
                  />
                )}
                <span className="flex-1">
                  <span className="block font-medium text-foreground">
                    {opt.label}
                  </span>
                  {opt.desc && (
                    <span className="mt-[1px] block text-[12.5px] text-muted-foreground">
                      {opt.desc}
                    </span>
                  )}
                </span>
                <span
                  className={`grid size-5 place-items-center rounded-full border ${
                    on ? "border-brand" : "border-muted-dim"
                  }`}
                >
                  {on && <span className="size-[10px] rounded-full bg-brand" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {q.kind === "chips" && (
        <div className="flex flex-wrap gap-[10px]">
          {q.options.map((opt) => (
            <Chip
              key={opt.value}
              variant="select"
              active={selected.includes(opt.value)}
              onClick={() => toggle(opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex-1" />
      {error && <p className="mt-4 text-center text-sm text-brand">{error}</p>}
      <button
        onClick={next}
        disabled={!canNext || pending}
        className={`mt-6 rounded-[12px] py-[17px] text-center font-semibold transition-opacity ${
          canNext ? "bg-foreground text-canvas" : "bg-foreground/10 text-muted-dim"
        }`}
      >
        {pending ? "Saving…" : q.cta}
      </button>
    </main>
  );
}
