"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { QUESTIONS, type Question, type QuestionId } from "@/lib/onboarding/questions";
import { toStyleProfileInput, type StyleProfileDraft } from "@/lib/onboarding/style-profile";
import { QuestionOptions, nextSelection } from "@/components/onboarding/question-options";

type Answers = Record<QuestionId, string[]>;

function toAnswers(p: StyleProfileDraft): Answers {
  return {
    archetype: p.archetype ? [p.archetype] : [],
    palette: p.palette ? [p.palette] : [],
    fit: p.fit ? [p.fit] : [],
    dress_codes: p.dress_codes,
    occasions: p.occasions,
    nogos: p.nogos,
  };
}

/** Order-insensitive, so undoing a change reads as unchanged. */
const signature = (a: Answers) => JSON.stringify(QUESTIONS.map((q) => [...a[q.id]].sort()));

/**
 * The six onboarding answers, editable after onboarding (quiz part 1). The same option renderers as the quiz;
 * no sheet, so nothing to close on navigation.
 */
export function StyleProfileEditor({
  profile,
  onSaveAction,
}: {
  profile: StyleProfileDraft;
  onSaveAction: (input: unknown) => Promise<void>;
}) {
  const t = useTranslations("styleProfile");
  const tQuiz = useTranslations("onboarding");
  const tSettings = useTranslations("settings");
  const [baseline, setBaseline] = useState(() => toAnswers(profile));
  const [answers, setAnswers] = useState(baseline);
  /**
   * ⚠️ Follow fresh server data. Next keeps this route mounted (React Activity), so state initialised once from
   * props went stale: a profile changed on another device showed old answers, and saving overwrote it. When the
   * saved answers change under us, adopt them — unless the user has unsaved edits, which stay (Save is then
   * judged against the NEW saved answers). Derived state during render, not an effect, so nothing flashes.
   */
  const [seenProfile, setSeenProfile] = useState(() => signature(toAnswers(profile)));
  const profileNow = signature(toAnswers(profile));
  if (profileNow !== seenProfile) {
    setSeenProfile(profileNow);
    const fresh = toAnswers(profile);
    if (signature(answers) === signature(baseline)) setAnswers(fresh);
    setBaseline(fresh);
  }
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  // Same reason as the sheets elsewhere: a hidden route keeps its state, so leaving must not leave "Saved" behind.
  useEffect(
    () => () => {
      setStatus("idle");
    },
    [],
  );

  // What the user has NOW, read when a save resolves — a save that finishes after a newer edit must not claim "Saved".
  const latest = useRef(answers);
  useEffect(() => {
    latest.current = answers;
  }, [answers]);

  const dirty = signature(answers) !== signature(baseline);
  const complete = QUESTIONS.every((q) => q.optional || answers[q.id].length > 0);

  function toggle(q: Question, value: string) {
    setStatus("idle");
    setAnswers((prev) => ({ ...prev, [q.id]: nextSelection(q, prev[q.id], value) }));
  }

  function save() {
    const sent = answers;
    startTransition(async () => {
      try {
        await onSaveAction(toStyleProfileInput(sent));
        setBaseline(sent);
        setStatus(signature(latest.current) === signature(sent) ? "saved" : "idle");
      } catch {
        setStatus("error");
      }
    });
  }

  return (
    <div className="flex-1 overflow-y-auto px-[22px] pb-[120px] pt-[10px]">
      <p className="text-[13px] text-muted-foreground">{t("intro")}</p>

      {QUESTIONS.map((q) => (
        <section key={q.id} aria-labelledby={`style-${q.id}`} className="mt-8">
          <h2 id={`style-${q.id}`} className="font-serif text-[22px]/[1.15] text-foreground">
            {tQuiz(`questions.${q.id}.title` as never)}
          </h2>
          <p className="mb-4 mt-1 text-[13px] text-muted-foreground">{tQuiz(`questions.${q.id}.sub` as never)}</p>
          <QuestionOptions question={q} selected={answers[q.id]} onToggle={(v) => toggle(q, v)} />
        </section>
      ))}

      {/* Always rendered: a live region inserted together with its text is not reliably announced. */}
      <p role="status" className={`mt-6 min-h-[1.25rem] text-center text-[13px] ${status === "error" ? "text-brand-high" : "text-muted-foreground"}`}>
        {status === "saved" ? t("saved") : status === "error" ? tSettings("saveFailed") : null}
      </p>
      {!complete && (
        <p id="style-incomplete" className="mt-2 text-center text-[12.5px] text-muted-foreground">
          {t("incomplete")}
        </p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={!dirty || !complete || pending}
        aria-describedby={complete ? undefined : "style-incomplete"}
        className={`mt-4 w-full rounded-[12px] py-[17px] text-center font-semibold transition-opacity ${
          dirty && complete ? "bg-foreground text-canvas" : "bg-foreground/10 text-muted-dim"
        }`}
      >
        {pending ? t("saving") : t("save")}
      </button>
    </div>
  );
}
