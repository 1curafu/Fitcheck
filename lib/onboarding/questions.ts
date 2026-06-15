export type Choice = { value: string; label: string; desc?: string; swatch?: string };

export type Question = {
  id: "archetype" | "palette" | "fit" | "dress_codes" | "occasions" | "nogos";
  kind: "grid" | "list" | "multi" | "chips";
  multi: boolean;
  optional?: boolean;
  kicker: string;
  title: string;
  sub: string;
  cta: string;
  options: Choice[];
};

// The prototype's 6 questions, verbatim (styling/project/Fitcheck.dc.html).
export const QUESTIONS: Question[] = [
  {
    id: "archetype",
    kind: "grid",
    multi: false,
    kicker: "Question 1 of 6",
    title: "Which closet feels like yours?",
    sub: "Pick the one you gravitate toward.",
    cta: "Continue",
    options: [
      { value: "Old Money", label: "Old Money", desc: "Heritage, tailored, quiet" },
      { value: "Smart Casual", label: "Smart Casual", desc: "Knit, chino, ease" },
      { value: "Preppy", label: "Preppy", desc: "Oxford, polo, collegiate" },
      { value: "Streetwear", label: "Streetwear", desc: "Relaxed, tonal, sneaker-led" },
    ],
  },
  {
    id: "palette",
    kind: "list",
    multi: false,
    kicker: "Question 2 of 6",
    title: "Your colour instinct?",
    sub: "We tune recommendations to it.",
    cta: "Continue",
    options: [
      { value: "Neutrals", label: "Quiet Neutrals", desc: "Cream, stone, charcoal", swatch: "linear-gradient(90deg,#E7E0D2,#B6AB94,#3A3A3E)" },
      { value: "Earth", label: "Earth & Tobacco", desc: "Camel, olive, rust", swatch: "linear-gradient(90deg,#C2A06B,#6E6F52,#B86A47)" },
      { value: "Navy", label: "Ivy Navy", desc: "Navy, white, oxblood", swatch: "linear-gradient(90deg,#2C3A4C,#EDE6D8,#7a2f2a)" },
      { value: "Mono", label: "Full Monochrome", desc: "Black, grey, white", swatch: "linear-gradient(90deg,#0E0E10,#6a6a6e,#EDE6D8)" },
    ],
  },
  {
    id: "fit",
    kind: "list",
    multi: false,
    kicker: "Question 3 of 6",
    title: "How should it sit?",
    sub: "Your default silhouette.",
    cta: "Continue",
    options: [
      { value: "Tailored", label: "Tailored", desc: "Cut close, sharp lines", swatch: "#2C3A4C" },
      { value: "Relaxed", label: "Relaxed", desc: "Room to move, drape", swatch: "#6E6F52" },
      { value: "Oversized", label: "Considered Oversized", desc: "Volume, on purpose", swatch: "#B6AB94" },
    ],
  },
  {
    id: "dress_codes",
    kind: "chips",
    multi: true,
    kicker: "Question 4 of 6",
    title: "Where do you live on the scale?",
    sub: "Select every dress code you actually wear.",
    cta: "Continue",
    options: [
      { value: "Loungewear", label: "Loungewear" },
      { value: "Casual", label: "Casual" },
      { value: "Smart casual", label: "Smart casual" },
      { value: "Business", label: "Business" },
      { value: "Black tie", label: "Black tie" },
    ],
  },
  {
    id: "occasions",
    kind: "multi",
    multi: true,
    kicker: "Question 5 of 6",
    title: "What do you dress for?",
    sub: "Select all that apply.",
    cta: "Continue",
    options: [
      { value: "Work", label: "Work", desc: "Office, meetings", swatch: "#2C3A4C" },
      { value: "Everyday", label: "Everyday", desc: "Errands, coffee, life", swatch: "#B6AB94" },
      { value: "Weekend", label: "Weekend", desc: "Off-duty, relaxed", swatch: "#6E6F52" },
      { value: "Evening", label: "Evening", desc: "Dinner, drinks, dates", swatch: "#B86A47" },
    ],
  },
  {
    id: "nogos",
    kind: "chips",
    multi: true,
    optional: true,
    kicker: "Question 6 of 6",
    title: "Anything off the table?",
    sub: "Your no-gos — we'll never put these in a look.",
    cta: "Finish profile",
    options: [
      { value: "logos", label: "Big logos" },
      { value: "skinny", label: "Skinny fit" },
      { value: "bright", label: "Bright colours" },
      { value: "shorts", label: "Shorts" },
      { value: "ripped", label: "Ripped denim" },
      { value: "double_denim", label: "Double denim" },
      { value: "graphic", label: "Graphic tees" },
      { value: "square_toe", label: "Square-toe shoes" },
    ],
  },
];
