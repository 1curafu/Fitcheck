import { OPERATOR, type LegalDocument } from "./types";

/**
 * ⚠️ A DRAFT for a lawyer to read before subscriptions go live. The
 * subscription section in particular — withdrawal rights, VAT, jurisdiction
 * for EU consumers — is where a Swiss operator selling into the EU most needs
 * professional eyes. It is written to be accurate about what the app does and
 * fair to the person reading it; that is the part this file can promise.
 */
export const TERMS: LegalDocument = {
  title: "Terms of Service",
  updated: "2026-09-15",
  intro:
    "These are the terms for using Fitcheck. They are short because the deal is simple: you bring your wardrobe, we suggest what to wear, and you stay in charge of your own clothes and your own data.",
  sections: [
    {
      heading: "Who you are dealing with",
      paragraphs: [
        `Fitcheck is operated by ${OPERATOR.name} from ${OPERATOR.country}. Questions, notices and complaints go to ${OPERATOR.email}.`,
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "You need to be at least 16 to use Fitcheck. Keep your sign-in email under your control; anything done from your account is yours to answer for. One account per person.",
      ],
    },
    {
      heading: "Your clothes, your photos",
      paragraphs: [
        "Everything you upload stays yours. You give us permission to store it, cut the background out of it, describe it with tags, send it to the AI that does the describing, and show it back to you in outfits — and for nothing else. That permission ends when you delete the item or your account.",
        "Upload only photos you have the right to use. Your own wardrobe is the point; other people's photos, and other people, are not.",
      ],
    },
    {
      heading: "What the suggestions are",
      paragraphs: [
        "Fitcheck's looks are suggestions made by software from the tags on your clothes and the weather. They are usually good and sometimes wrong. They are not a promise that an outfit suits an occasion, a dress code, or you. Look in the mirror before you leave the house.",
        "The tags the AI writes for a garment are a first draft. You can correct any of them, and the app improves when you do.",
      ],
    },
    {
      heading: "Free and paid",
      paragraphs: [
        "The free plan is meant to be genuinely useful and stays free. The paid plan, Fitcheck Pro, adds features and lifts limits; what it includes and what it costs are shown before you buy, and the price includes any VAT that applies.",
        "Pro is a monthly subscription billed by Stripe. It renews each month until you cancel, which you can do at any time from the app; you keep Pro until the end of the period you have paid for, and nothing further is charged. Refunds for a period already started are at our discretion, except where the law gives you a right to one.",
        "If you are a consumer in the EU, you have a 14-day right to withdraw from a purchase. Because Pro starts working the moment you subscribe, you agree that it begins immediately and that you lose the right to withdraw once it has begun — the standard rule for digital services.",
        "We may change Pro's price with at least 30 days' notice by email. If you do not want the new price, cancel before it takes effect.",
      ],
    },
    {
      heading: "Fair use",
      paragraphs: [
        "Do not try to break into other people's accounts, overload the service, copy it, or use it to build a competing one. Do not upload anything unlawful. We can suspend or close an account that does these things, and will tell you why.",
      ],
    },
    {
      heading: "Ending things",
      paragraphs: [
        `You can delete your account whenever you like by writing to ${OPERATOR.email}; we delete everything within 30 days, as the Privacy Policy describes. We can end the service or your access to it with 30 days' notice, and immediately if you break these terms.`,
      ],
    },
    {
      heading: "What we are and are not responsible for",
      paragraphs: [
        "We work to keep Fitcheck available, accurate and secure, but we provide it as it is. To the extent the law allows, we are not liable for losses that come from relying on an outfit suggestion, from the service being unavailable, or from anything outside our control. Nothing here limits liability for intent, gross negligence, or anything the law does not allow us to limit.",
        "If you are a consumer, nothing in these terms takes away rights your own country's law gives you and does not let you sign away.",
      ],
    },
    {
      heading: "Law and disputes",
      paragraphs: [
        "Swiss law applies, and disputes go to the courts at the operator's seat in Switzerland. If you are a consumer in the EU, you keep the protections of your home country's law and may bring a claim in your home courts.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "If we change these terms in a way that matters, the date at the top moves and the app tells you on your next visit. Continuing to use Fitcheck after that means you accept the change; if you do not, delete your account and we will not hold you to it.",
      ],
    },
  ],
};
