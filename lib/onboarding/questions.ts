export type Choice = { value: string; swatch?: string };

export type Question = {
  id: "archetype" | "palette" | "fit" | "dress_codes" | "occasions" | "nogos";
  kind: "grid" | "list" | "multi" | "chips";
  multi: boolean;
  optional?: boolean;
  options: Choice[];
};

// Stored values remain stable across every display language.
export const QUESTIONS: Question[] = [
  {
    id: "archetype",
    kind: "grid",
    multi: false,
    options: [
      { value: "Old Money" },
      { value: "Smart Casual" },
      { value: "Preppy" },
      { value: "Streetwear" },
    ],
  },
  {
    id: "palette",
    kind: "list",
    multi: false,
    options: [
      { value: "Neutrals", swatch: "linear-gradient(90deg,#E7E0D2,#B6AB94,#3A3A3E)" },
      { value: "Earth", swatch: "linear-gradient(90deg,#C2A06B,#6E6F52,#B86A47)" },
      { value: "Navy", swatch: "linear-gradient(90deg,#2C3A4C,#EDE6D8,#7a2f2a)" },
      { value: "Mono", swatch: "linear-gradient(90deg,#0E0E10,#6a6a6e,#EDE6D8)" },
    ],
  },
  {
    id: "fit",
    kind: "list",
    multi: false,
    options: [
      { value: "Tailored", swatch: "#2C3A4C" },
      { value: "Relaxed", swatch: "#6E6F52" },
      { value: "Oversized", swatch: "#B6AB94" },
    ],
  },
  {
    id: "dress_codes",
    kind: "chips",
    multi: true,
    options: [
      { value: "Loungewear" },
      { value: "Casual" },
      { value: "Smart casual" },
      { value: "Business" },
      { value: "Black tie" },
    ],
  },
  {
    id: "occasions",
    kind: "multi",
    multi: true,
    options: [
      { value: "Work", swatch: "#2C3A4C" },
      { value: "Everyday", swatch: "#B6AB94" },
      { value: "Weekend", swatch: "#6E6F52" },
      { value: "Evening", swatch: "#B86A47" },
    ],
  },
  {
    id: "nogos",
    kind: "chips",
    multi: true,
    optional: true,
    options: [
      { value: "logos" },
      { value: "skinny" },
      { value: "bright" },
      { value: "shorts" },
      { value: "ripped" },
      { value: "double_denim" },
      { value: "graphic" },
      { value: "square_toe" },
    ],
  },
];
