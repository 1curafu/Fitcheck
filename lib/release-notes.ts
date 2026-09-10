/**
 * What each release changed, in the user's language.
 *
 * ⚠️ Hand-written, never derived from commit subjects. Ours name files,
 * functions and weights — "stop sampling an arbitrary frame of a transition" is
 * true and means nothing to someone getting dressed. A test rejects entries that
 * leak that vocabulary.
 *
 * ⚠️ The newest entry's `version` MUST equal package.json's, and a test enforces
 * it. Bumping the app without writing notes would show users the previous
 * release's words, which is worse than showing nothing.
 *
 * Keep lines short. This is a card someone dismisses on the way to their looks,
 * not a changelog page.
 */
export type ReleaseNote = {
  version: string;
  /** ISO date, for ordering. Not shown. */
  date: string;
  /** One line, the reason to care about this release. */
  headline: string;
  added: string[];
  fixed: string[];
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "0.2.0",
    date: "2026-09-09",
    headline: "Your looks just got smarter.",
    added: [
      "Dresses and jumpsuits — a one-piece is a full look now",
      "Bags, watches and a second accessory can join a look",
      "Outfits weigh fabric against fabric: linen with wool, silk with leather",
      "Shoes are judged against what you wear them with, not on their own",
    ],
    fixed: [
      "A dress no longer gets trainers when it asked for something smarter",
      "Sneakers with tailoring only where that actually works",
      "A bag or watch that picks up a colour is finally noticed",
      "Two heavy knits together no longer read as one good idea",
    ],
  },
];

/** The release the app is running. */
export const CURRENT_RELEASE = RELEASE_NOTES[0];
