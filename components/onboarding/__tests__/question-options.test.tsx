import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QUESTIONS } from "@/lib/onboarding/questions";
import { QuestionOptions, nextSelection } from "../question-options";

const q = (id: string) => QUESTIONS.find((x) => x.id === id)!;

test("single-select replaces, multi-select toggles", () => {
  expect(nextSelection(q("palette"), ["Earth"], "Navy")).toEqual(["Navy"]);
  expect(nextSelection(q("nogos"), ["logos"], "shorts")).toEqual(["logos", "shorts"]);
  expect(nextSelection(q("nogos"), ["logos", "shorts"], "logos")).toEqual(["shorts"]);
});

test.each(["archetype", "palette", "nogos"])("%s options are pressable buttons that report their state", async (id) => {
  const onToggle = vi.fn();
  const question = q(id);
  const first = question.options[0].value;
  render(<QuestionOptions question={question} selected={[first]} onToggle={onToggle} />);
  const buttons = screen.getAllByRole("button");
  expect(buttons).toHaveLength(question.options.length);
  expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
  expect(buttons[1]).toHaveAttribute("aria-pressed", "false");
  await userEvent.click(buttons[1]);
  expect(onToggle).toHaveBeenCalledWith(question.options[1].value);
});
