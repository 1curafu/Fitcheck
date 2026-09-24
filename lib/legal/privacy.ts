import { OPERATOR, type LegalDocument } from "./types";

/**
 * ⚠️ Every third party named here is one the code sends data to, and the test
 * checks the reverse: a new SDK in package.json that handles user data must be
 * named here before it ships. Written in plain language on purpose — a policy
 * nobody can read protects nobody.
 *
 * ⚠️ A DRAFT for a lawyer to read before subscriptions go live. It describes
 * what the app does accurately; whether it satisfies every clause of the FADP
 * and GDPR is a legal opinion this file cannot give.
 */
export const PRIVACY: LegalDocument = {
  title: "Privacy Policy",
  updated: "2026-09-24",
  intro:
    "Fitcheck photographs your wardrobe and suggests outfits from it. That means it holds photos of your clothes and a little about you. This page says exactly what, why, who else touches it, and how to make us delete it.",
  sections: [
    {
      heading: "Who is responsible",
      paragraphs: [
        `${OPERATOR.name}, operating from ${OPERATOR.country}, is the controller of your data. For anything on this page, write to ${OPERATOR.email}.`,
        "Swiss data protection law (the FADP) applies. If you are in the EU or EEA, the GDPR applies to you as well, and every right listed below is yours under both.",
      ],
    },
    {
      heading: "What we collect",
      paragraphs: ["Only what the app needs to do its job. Nothing is collected for advertising, and nothing is sold."],
      bullets: [
        "Your account: your email address, and if you sign in with Google, the name and profile picture Google shares.",
        "Your style answers from the short quiz: how you like to dress, what you would rather not wear.",
        "Your wardrobe: the photos you upload, the cut-out versions we make of them, and the tags describing each piece — colour, fabric, formality and so on. You can edit every tag.",
        "If a photo you upload shows you wearing the item, we store that photo as you took it. We keep the original only so the cut-out can be re-made with better tools later; it is never sent to the AI, never used to identify you, and never shown to anyone but you.",
        "Your looks: the outfits the app suggests, the ones you favourite, and the days you say you wore one.",
        "Your location, only if you give it: a city or coordinates and a time zone, so the weather in your looks is your weather. You can clear it in Settings.",
        "If you subscribe to Pro: your Stripe customer ID, your subscription's status and renewal date, and when you confirmed that Pro should start immediately. Card details go to Stripe and Link and never reach us.",
        "Technical details when something breaks: the error, the page, and the browser. Not your name, and not what you typed.",
      ],
    },
    {
      heading: "Why we use it",
      paragraphs: [
        "To run the service you signed up for — tagging your clothes, building looks, remembering what you wore. Under the GDPR this is performance of a contract.",
        "To keep the app working and find bugs. Under the GDPR this is our legitimate interest, and it is limited to error reports.",
        "To sell you Pro and keep it switched on while you pay for it. Contract again, plus the bookkeeping the law requires.",
        "Nothing else. No profiling beyond styling your own wardrobe, no advertising, no sharing with data brokers.",
      ],
    },
    {
      heading: "Who else sees it",
      paragraphs: [
        "We use a small number of companies to run Fitcheck. Each receives only what its job needs, and is bound by a data-processing agreement.",
      ],
      bullets: [
        "Supabase (EU, Frankfurt) — stores your account, photos and everything above. Your data lives in the EU.",
        "Anthropic (USA) — the AI that tags your clothes. It receives the cut-out photo of a garment to describe it, and short text descriptions of pieces — never photos — to reason about outfits. Anthropic does not train its models on data sent through its API.",
        "OpenWeather — receives your coordinates to return a forecast. Nothing else.",
        "Google — only if you choose to sign in with Google.",
        "Resend (USA) — sends the sign-in email.",
        "Stripe — handles payment for Pro; with Link, the only parties that see card details.",
        "Link (Stripe) — sells Fitcheck Pro to you as merchant of record: it takes your payment, charges VAT and sends receipts, under its own terms and privacy policy. Deleting your Fitcheck account cancels your subscription; Link and Stripe keep the payment records the law requires.",
        "Sentry (EU) — receives error reports, so we can fix what broke.",
        "Vercel — hosts the app, and counts page views without cookies or any identifier stored on your device. Like any host it also sees the requests your browser makes.",
      ],
    },
    {
      heading: "Data leaving Europe",
      paragraphs: [
        "Anthropic, Resend, Google and Stripe are based in, or process data through, the United States. Transfers to them rest on the EU–US Data Privacy Framework where the provider is certified, and on the European Commission's Standard Contractual Clauses otherwise, which Switzerland recognises with its own addendum. Where they offer it, Google and Stripe handle Swiss and EU users through their European entities.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "For as long as you have an account. Delete your account in Settings; a successful deletion removes your live data immediately. You can also write to legal@fitcheck.space if you need help with deletion.",
        "Encrypted backups may retain deleted data for no more than 30 days before they expire. Error reports are kept for 90 days. Legally required payment records are kept by Link and Stripe for as long as tax law requires; our copy of your billing status goes when your account does.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        `Delete your account in Settings, or write to ${OPERATOR.email} if you need help. We respond to other rights requests within 30 days. You can:`,
      ],
      bullets: [
        "See everything we hold about you, and get a copy in a machine-readable form.",
        "Correct anything wrong — most of it you can correct yourself, in the app.",
        "Have your account and everything in it deleted.",
        "Object to, or ask us to restrict, any processing based on legitimate interest.",
        "Complain to a supervisory authority: the Federal Data Protection and Information Commissioner in Switzerland, or the authority in your EU country.",
      ],
    },
    {
      heading: "Cookies and storage on your device",
      paragraphs: [
        "Fitcheck sets only the cookies it needs to keep you signed in. There are no advertising or tracking cookies, which is why you are shown a notice rather than asked for consent.",
        "The app also keeps a few small preferences in your browser's own storage — for example, which release notes you have already dismissed. These never leave your device.",
      ],
    },
    {
      heading: "Age",
      paragraphs: ["Fitcheck is for people aged 16 and over. If you are younger, please do not create an account."],
    },
    {
      heading: "Changes",
      paragraphs: [
        "When this page changes in any way that matters, the date at the top moves and the app tells you on your next visit. The current version is always at fitcheck.space/privacy.",
      ],
    },
  ],
};
