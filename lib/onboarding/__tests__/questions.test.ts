import { expect, it } from "vitest";
import enUS from "@/messages/en-US.json";
import { QUESTIONS } from "../questions";

it("every question and stored option value has English display copy", () => {
  const messages = (enUS as { onboarding?: { questions?: Record<string, unknown> } }).onboarding?.questions;
  for (const question of QUESTIONS) {
    const copy = messages?.[question.id] as {
      kicker?: string;
      title?: string;
      sub?: string;
      cta?: string;
      options?: Record<string, { label?: string }>;
    } | undefined;
    expect(copy?.kicker, `${question.id}.kicker`).toBeTruthy();
    expect(copy?.title, `${question.id}.title`).toBeTruthy();
    expect(copy?.sub, `${question.id}.sub`).toBeTruthy();
    expect(copy?.cta, `${question.id}.cta`).toBeTruthy();
    for (const option of question.options) {
      expect(copy?.options?.[option.value]?.label, `${question.id}.${option.value}`).toBeTruthy();
    }
  }
});
