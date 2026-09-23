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
    version: "0.3.7",
    date: "2026-09-23",
    headline: "Quieter work behind the scenes to keep your data safe.",
    added: ["Every update now checks that its database changes really arrived"],
    fixed: ["A database change can no longer go missing without us noticing"],
  },
  {
    version: "0.3.6",
    date: "2026-09-23",
    headline: "Removing a piece now tells you exactly what happens.",
    added: ["Removing a piece asks first, and explains what's kept and what's not"],
    fixed: ["The cookie notice no longer covers the back button on a piece or a look"],
  },
  {
    version: "0.3.5",
    date: "2026-09-23",
    headline: "Account deletion is more dependable behind the scenes.",
    added: ["If deleting your account ever fails, we now find out straight away"],
    fixed: ["A failed account deletion now tells us exactly which step to fix"],
  },
  {
    version: "0.3.4",
    date: "2026-09-23",
    headline: "Your backups now bring everything back — photos included.",
    added: ["Recovery from a backup is now tested from start to finish"],
    fixed: [
      "A recovered backup now restores access to your photos",
      "New sign-ups work straight after a recovery",
    ],
  },
  {
    version: "0.3.3",
    date: "2026-09-22",
    headline: "Deleting your account now leaves nothing behind.",
    added: ["Account deletion now double-checks that no photo is left behind"],
    fixed: [
      "A photo uploading on another device while you delete is removed too",
      "A restored backup can no longer keep photos from a deleted account",
    ],
  },
  {
    version: "0.3.2",
    date: "2026-09-20",
    headline: "Your account, your call — deletion is now in Settings.",
    added: [
      "Delete your account and live data directly from Settings",
      "Fitcheck now keeps encrypted recovery backups if something goes wrong",
    ],
    fixed: ["A recovered backup can no longer bring back a deleted account"],
  },
  {
    version: "0.3.1",
    date: "2026-09-17",
    headline: "Cleaner cutouts, and Rotate where you can see it.",
    added: ["The Rotate button now sits on the photo, so you watch it turn"],
    fixed: [
      "Gaps between a sleeve and the body no longer come out as white patches",
      "Retake no longer looks like a rotate button",
      "This card shows up after an update on the home-screen app too",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-17",
    headline: "Adding clothes is faster, and they come out the right way up.",
    added: [
      "Background removal now runs in under a second — and downloads 5× less",
      "Photographed sideways? It's turned upright for you — and there's a Rotate button",
      "Privacy policy and terms, written in plain language, linked where they matter",
    ],
    fixed: [
      "White garments on pale backgrounds no longer lose their edges",
      "Trouser hems and shirt cuffs keep their shape in the cutout",
    ],
  },
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
