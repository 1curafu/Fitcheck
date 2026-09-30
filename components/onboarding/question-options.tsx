"use client";

import { useTranslations } from "next-intl";
import type { Question } from "@/lib/onboarding/questions";
import { Chip } from "@/components/ui-fitcheck/chip";

/** The next answer list after tapping `value`: single-select replaces, multi-select toggles. */
export function nextSelection(question: Question, current: readonly string[], value: string): string[] {
  if (!question.multi) return [value];
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

/**
 * One quiz question's options — shared by onboarding and the Style profile editor so the two can never
 * disagree about what an answer looks like.
 */
export function QuestionOptions({
  question,
  selected,
  onToggle,
}: {
  question: Question;
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  const t = useTranslations("onboarding");
  const optionLabel = (value: string) => t(`questions.${question.id}.options.${value}.label` as never);
  const optionDescription = (value: string) => {
    const key = `questions.${question.id}.options.${value}.desc` as never;
    return t.has(key) ? t(key) : null;
  };

  if (question.kind === "grid") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt.value)}
              className={`relative aspect-[0.86] rounded-[14px] border p-4 text-left transition-colors ${
                on ? "border-brand bg-surface-2" : "border-[--input] bg-surface-1"
              }`}
            >
              <p className="font-serif text-[19px] text-foreground-strong">{optionLabel(opt.value)}</p>
              {optionDescription(opt.value) && (
                <p className="mt-1 max-w-[100px] text-[11px] leading-snug text-muted-foreground">
                  {optionDescription(opt.value)}
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
    );
  }

  if (question.kind === "list" || question.kind === "multi") {
    return (
      <div className="flex flex-col gap-[10px]">
        {question.options.map((opt) => {
          const on = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(opt.value)}
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
                <span className="block font-medium text-foreground">{optionLabel(opt.value)}</span>
                {optionDescription(opt.value) && (
                  <span className="mt-[1px] block text-[12.5px] text-muted-foreground">
                    {optionDescription(opt.value)}
                  </span>
                )}
              </span>
              <span className={`grid size-5 place-items-center rounded-full border ${on ? "border-brand" : "border-muted-dim"}`}>
                {on && <span className="size-[10px] rounded-full bg-brand" />}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-[10px]">
      {question.options.map((opt) => (
        <Chip key={opt.value} variant="select" active={selected.includes(opt.value)} onClick={() => onToggle(opt.value)}>
          {optionLabel(opt.value)}
        </Chip>
      ))}
    </div>
  );
}
