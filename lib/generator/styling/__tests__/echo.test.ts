import { echoedAccents, echoScore, withAccent } from "../echo";

// ⚠️ Fixtures are built with `withAccent`, never hand-written objects: it is the
// one place `colors` and `accent_color` become echo evidence, and it tags each
// colour with the ROLE it plays. A test that assembled the evidence itself could
// pass while the shipped path did something else.
/** One garment wearing these colours, with no accent. */
const worn = (...colours: string[]) => withAccent(colours);
/** One garment wearing `colours`, with `accent` as its one small contrast colour. */
const accented = (colours: string[], accent: string) => withAccent(colours, accent);

test("one repeated accent across two garments is the reward case", () => {
  // sky shirt, stone trousers, sneaker carrying a sky accent — ONE echo point.
  const withEcho = echoScore([worn("sky"), worn("stone"), worn("white", "sky")])!;
  const without = echoScore([worn("sky"), worn("stone"), worn("white")])!;
  expect(withEcho).toBeGreaterThan(without);
});

test("three or more echo points read as forced, not intentional", () => {
  const one = echoScore([worn("sky"), worn("stone"), worn("white", "sky")])!;
  const many = echoScore([worn("sky"), worn("sky", "stone"), worn("sky", "white"), worn("sky")])!;
  expect(many).toBeLessThan(one);
});

test("repeating a NEUTRAL is not an echo — it is just neutral", () => {
  // Two white garments is not a styling move; only accents echo.
  expect(echoScore([worn("white"), worn("white"), worn("navy")])).toBe(
    echoScore([worn("white"), worn("charcoal"), worn("navy")]),
  );
});

test("no repetition at all is neutral, not penalised", () => {
  // Was [["sky"],["stone"],["white"]] — that carries the unsupported accent
  // "sky" and now correctly returns 0.35 (an orphan accent), not 0.5. Moved to
  // an all-neutral fixture so this test still tests what its name says.
  expect(echoScore([worn("navy"), worn("stone"), worn("white")])).toBe(0.5);
});

test("null when there is nothing to compare", () => {
  expect(echoScore([])).toBeNull();
  expect(echoScore([worn("navy")])).toBeNull();
});

test("an accent nothing supports scores BELOW an outfit with no accent at all", () => {
  // White shirt, stone trousers. The blue on the sneaker echoes nothing.
  const orphan = echoScore([worn("white"), worn("stone"), worn("white", "sky")])!;
  const clean = echoScore([worn("white"), worn("stone"), worn("white", "black")])!;
  expect(orphan).toBeLessThan(clean);
});

test("but the SAME shoe against a shirt that supports it is still the reward case", () => {
  const supported = echoScore([worn("sky"), worn("stone"), worn("white", "sky")])!;
  const orphan = echoScore([worn("white"), worn("stone"), worn("white", "sky")])!;
  expect(supported).toBeGreaterThan(orphan);
  expect(supported).toBe(1);
});

test("an all-neutral outfit is still the plain 0.5 baseline, not a demerit", () => {
  // No accent is present at all — nothing to support, so nothing to fault.
  expect(echoScore([worn("white"), worn("stone"), worn("white", "black")])).toBe(0.5);
});

test("a two-tone garment does not echo with itself", () => {
  // ⚠️ The obvious assertion here is WRONG. `["sky", "sky"]` as one garment
  // dedupes to a single "sky" — an accent that nothing ELSE in the outfit
  // supports, i.e. the orphan-accent branch (0.35), NOT the no-accent
  // baseline (0.5). Listing "sky" once on that garment reaches the exact same
  // number for the exact same reason: what matters is that repeating a colour
  // WITHIN one garment must not be counted as a second garment carrying it.
  const listedTwice = echoScore([worn("sky", "sky"), worn("stone"), worn("white")]);
  const listedOnce = echoScore([worn("sky"), worn("stone"), worn("white")]);
  expect(listedTwice).toBe(listedOnce);
  expect(listedTwice).toBe(0.35);
});

test("a garment wearing its own accent colour is one garment, not two", () => {
  // The same colour in both roles on ONE piece — a navy shoe with a navy sole.
  // It is still one garment carrying navy, so there is nothing to echo with.
  expect(echoScore([accented(["navy"], "navy"), worn("stone"), worn("white")])).toBe(0.5);
  expect(echoedAccents([accented(["navy"], "navy"), worn("stone")])).toEqual([]);
});

// ── echoedAccents: the same counting, exposed by name ────────────────────────
// `lib/generator/rerank.ts` prints these on the combo line so the re-ranker is
// told WHICH accent echoes instead of being asked to spot it. Sharing the
// counting with `echoScore` is the point: the sentence shown to the user and
// the score that ranked the combo cannot disagree.

test("names the accent carried by more than one garment", () => {
  expect(echoedAccents([worn("sky"), worn("stone"), worn("white", "sky")])).toEqual(["sky"]);
});

test("says nothing when no accent repeats", () => {
  expect(echoedAccents([worn("sky"), worn("stone"), worn("white")])).toEqual([]);
});

test("neutrals are never echoes, however often they repeat", () => {
  expect(echoedAccents([worn("white"), worn("white"), worn("white")])).toEqual([]);
});

test("a two-tone garment does not echo with itself", () => {
  expect(echoedAccents([worn("sky", "sky"), worn("stone")])).toEqual([]);
});

test("a lone garment has nothing to echo with", () => {
  expect(echoedAccents([worn("sky", "rust")])).toEqual([]);
});

test("every accent that repeats is named, not just the first", () => {
  expect(echoedAccents([worn("sky", "rust"), worn("rust"), worn("sky")]).sort()).toEqual([
    "rust",
    "sky",
  ]);
});

test("what echoScore rewards is exactly what echoedAccents names", () => {
  const echoing = [worn("sky"), worn("stone"), worn("white", "sky")];
  const plain = [worn("sky"), worn("stone"), worn("white")];
  expect(echoedAccents(echoing).length).toBeGreaterThan(0);
  expect(echoScore(echoing)!).toBeGreaterThan(echoScore(plain)!);
  expect(echoedAccents(plain)).toEqual([]);
});

// ── The note must never advertise what the score punishes ───────────────────
// `echoScore` returns 1.0 for one echo point and 0.25 — its WORST value — for
// three or more, the "matchy-matchy" failure. `echoedAccents` feeds a prompt
// line telling the model a stated echo is "worth preferring", so naming an
// over-matched outfit would have the two halves of the same model arguing.

test("a two-garment repeat is named — the rewarded kind", () => {
  const twoGarments = [worn("rust"), worn("stone"), worn("rust")];
  expect(echoedAccents(twoGarments)).toEqual(["rust"]);
  expect(echoScore(twoGarments)).toBe(1);
});

test("a three-garment repeat is 2 points, not 3 — still named", () => {
  // ⚠️ An echo POINT is one extra garment beyond the first, so one colour worn
  // by three garments is 2 points, not 3. Worth pinning: it is the natural
  // reading of "three garments in the same colour" and it is wrong, which is
  // exactly the arithmetic a future change to the ceiling has to get right.
  const threeGarments = [worn("rust"), worn("rust"), worn("rust")];
  expect(echoScore(threeGarments)).toBe(0.75);
  expect(echoedAccents(threeGarments)).toEqual(["rust"]);
});

test("two separate two-garment echoes are still named — 2 points is the ceiling", () => {
  // rust across two pieces AND sky across two: 2 echo points, scored 0.75. Past
  // the ideal but still readable, so the note stands.
  const two = [worn("rust", "sky"), worn("rust"), worn("sky")];
  expect(echoScore(two)).toBe(0.75);
  expect(echoedAccents(two).sort()).toEqual(["rust", "sky"]);
});

test("THREE echo points are not named — the scorer punishes them", () => {
  // rust across three garments (2 points) plus sky across two (1) = 3. This is
  // the real boundary: 0.25 is the WORST value echoScore returns, below even
  // the 0.5 it gives an outfit with no echo at all.
  const forced = [worn("rust", "sky"), worn("rust"), worn("rust"), worn("sky")];
  expect(echoScore(forced)).toBe(0.25);
  expect(echoedAccents(forced)).toEqual([]);
});

test("one colour across four garments is also suppressed", () => {
  const allRust = [worn("rust"), worn("rust"), worn("rust"), worn("rust")];
  expect(echoScore(allRust)).toBe(0.25);
  expect(echoedAccents(allRust)).toEqual([]);
});

test("the note is emitted exactly when the score is above the no-echo baseline", () => {
  // The invariant behind all of the above: a named echo is always one the
  // scorer rewarded relative to "no echo at all" (0.5).
  const cases = [
    [worn("rust"), worn("stone"), worn("rust")], //              1 point  -> 1.00, named
    [worn("rust", "sky"), worn("rust"), worn("sky")], //         2 points -> 0.75, named
    [worn("rust", "sky"), worn("rust"), worn("rust"), worn("sky")], // 3   -> 0.25, NOT named
    [worn("sky"), worn("stone"), worn("white")], //              0 points -> 0.35, NOT named
    [worn("white"), worn("stone"), worn("black")], //           no accent -> 0.50, NOT named
    [worn("navy"), worn("white"), accented(["white"], "navy")], // accent echo -> 1.00, named
    [worn("navy"), worn("navy"), worn("white")], //          tonal dressing -> 0.50, NOT named
  ];
  for (const c of cases) {
    expect(echoedAccents(c).length > 0).toBe(echoScore(c)! > 0.5);
  }
});

// ── withAccent: the one place colors and accent_color are combined ──────────

test("withAccent tags each colour with its role, and is a no-op without an accent", () => {
  // ⚠️ The role is the payload. It used to return a flat string[], which threw
  // the distinction away one line before the counting needed it.
  expect(withAccent(["white"], "sky")).toEqual([
    { colour: "white", role: "dominant" },
    { colour: "sky", role: "accent" },
  ]);
  const dominantOnly = [{ colour: "white", role: "dominant" }];
  expect(withAccent(["white"], null)).toEqual(dominantOnly);
  expect(withAccent(["white"], undefined)).toEqual(dominantOnly);
  expect(withAccent(["white"], "")).toEqual(dominantOnly);
});

test("withAccent normalises, so every consumer compares like for like", () => {
  expect(withAccent([" White "], "SKY")).toEqual([
    { colour: "white", role: "dominant" },
    { colour: "sky", role: "accent" },
  ]);
});

// ── An accent is a ROLE, not a palette class ─────────────────────────────────
// `isNeutral` answers "can this colour anchor an outfit?" — the question behind
// the 3-colour harmony ceiling. Echo asks a different question: "does this small
// colour pick something else up?" The research defines an accent positionally —
// base colours at the bottom, the accent on top — and its worked example is "a
// thread of sky blue in the pocket square picked up by a sky blue shirt". It
// never restricts accents to non-neutral colours, so neither does this rule.

test("a navy accent picking up a navy garment IS an echo, neutral or not", () => {
  const echoing = [worn("navy"), worn("white"), accented(["white"], "navy")];
  const plain = [worn("navy"), worn("white"), worn("white")];
  expect(echoScore(echoing)!).toBeGreaterThan(echoScore(plain)!);
  expect(echoScore(echoing)).toBe(1);
  expect(echoedAccents(echoing)).toEqual(["navy"]);
});

test("two navy GARMENTS are tonal dressing, not an echo — still unrewarded", () => {
  // Monochrome is a different mechanism with its own rule (texture variation);
  // rewarding it here would make every wardrobe of navy and white look like a
  // deliberate colour story.
  const tonal = [worn("navy"), worn("navy"), worn("white")];
  expect(echoScore(tonal)).toBe(0.5);
  expect(echoedAccents(tonal)).toEqual([]);
});

test("the rule is general — every menswear neutral echoes from the accent slot", () => {
  // ⚠️ NOT a navy special case. A small brown detail on a white sneaker echoes a
  // brown jacket for exactly the same reason.
  for (const colour of ["brown", "camel", "tan", "denim"]) {
    const echoing = [worn(colour), worn("white"), accented(["white"], colour)];
    expect(echoedAccents(echoing)).toEqual([colour]);
    expect(echoScore(echoing)).toBe(1);
  }
});

test("two neutral ACCENTS echo each other — the role is what counts, on both sides", () => {
  const twoAccents = [
    accented(["white"], "navy"),
    worn("stone"),
    accented(["white"], "navy"),
  ];
  expect(echoedAccents(twoAccents)).toEqual(["navy"]);
});

test("an unsupported NEUTRAL accent is not the orphan case — nothing was spent", () => {
  // ⚠️ The deliberate asymmetry. The 0.35 orphan branch asks "was a LOUD colour
  // spent for no work?", which is a question about the colour, not the role — a
  // navy logo on a white sneaker is not a statement nothing supports, it is
  // quiet, which is precisely why the palette calls navy neutral. So the reward
  // keys off the role and the penalty keeps keying off the palette.
  expect(echoScore([worn("rust"), worn("stone"), accented(["white"], "navy")]))
    .toBe(0.35); // rust is the orphan here, not navy
  expect(echoScore([worn("white"), worn("stone"), accented(["white"], "navy")]))
    .toBe(0.5);
});

test("a neutral dominant repeated across the outfit still counts once the accent is in play", () => {
  // navy top + navy trousers + navy-accented shoe: navy is now genuinely in
  // three of three pieces. The colour is in play (an accent put it there), so
  // the "how much of the outfit does it occupy?" arithmetic applies unchanged —
  // 2 echo points, 0.75, past the ideal but still readable.
  const tonalPlusAccent = [
    worn("navy"),
    worn("navy"),
    accented(["white"], "navy"),
  ];
  expect(echoScore(tonalPlusAccent)).toBe(0.75);
});

// ---------------------------------------------------------------------------
// An accent that repeats its own garment's colour is not a placement.
// ---------------------------------------------------------------------------

test("an accent equal to its own garment's dominant does NOT unlock an echo", () => {
  // Same outfit twice: navy top, navy trousers, white shoe. Tonal dressing.
  // The only difference is a redundant accent tag on the top.
  const plain = [withAccent(["navy"]), withAccent(["navy"]), withAccent(["white"])];
  const selfTagged = [withAccent(["navy"], "navy"), withAccent(["navy"]), withAccent(["white"])];
  expect(echoScore(selfTagged)).toBe(echoScore(plain));
  expect(echoedAccents(selfTagged)).toEqual([]);
});

test("a navy accent on a WHITE shoe still echoes a navy top — the rule that matters is unaffected", () => {
  const combo = [withAccent(["navy"]), withAccent(["white"]), withAccent(["white"], "navy")];
  expect(echoedAccents(combo)).toEqual(["navy"]);
  expect(echoScore(combo)).toBe(1);
});

test("withAccent drops a redundant accent rather than tagging it", () => {
  expect(withAccent(["navy", "white"], "navy")).toEqual([
    { colour: "navy", role: "dominant" },
    { colour: "white", role: "dominant" },
  ]);
  // Case and whitespace are normalised before the comparison.
  expect(withAccent(["Navy"], " navy ")).toEqual([{ colour: "navy", role: "dominant" }]);
});
