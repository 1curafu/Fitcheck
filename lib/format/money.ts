/**
 * Euro, formatted for the English UI — "€50.00", not "50,00 €".
 *
 * `en-IE` is the euro locale whose conventions match the rest of the interface;
 * the German content the spec plans will want `de-DE` here. One hard-coded
 * currency beats a fake one until Settings owns the choice.
 *
 * Lives here rather than in `lib/closet/wear-stats.ts` because two screens now
 * print money — the item-detail tiles and the stats screen — and two
 * `Intl.NumberFormat` declarations are two places for the currency to drift.
 * The design prices Pro at £5; the app is EU-region and every other price
 * renders in euro, so the £ was settled as a design-file artefact on 2026-08-05
 * (`docs/MONETISATION.md`).
 */
const MONEY = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function formatMoney(amount: number): string {
  return MONEY.format(amount);
}
