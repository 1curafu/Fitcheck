/**
 * Release check (billing spec §8, plan Task 11): the Dashboard prices must match what the app displays.
 *
 *   STRIPE_SECRET_KEY=… npx tsx scripts/stripe-verify-prices.ts
 *
 * Run once against the sandbox key and once against the live key. Exits 1 on any mismatch. Read-only.
 */
import Stripe from "stripe";
import { DISPLAY_AMOUNTS, LOOKUP_KEYS, type Interval } from "../lib/billing/prices";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is required");
  process.exit(1);
}
const stripe = new Stripe(key);

// Wrapped like the other scripts: `npx tsx` runs this file as CommonJS, where top-level await is a syntax error.
async function main(): Promise<number> {
  let bad = 0;
  for (const interval of Object.keys(LOOKUP_KEYS) as Interval[]) {
    const { data } = await stripe.prices.list({ lookup_keys: [LOOKUP_KEYS[interval]], expand: ["data.currency_options"] });
    const price = data[0];
    if (!price) {
      console.error(`BAD missing price ${LOOKUP_KEYS[interval]}`);
      bad++;
      continue;
    }
    for (const [currency, amount] of Object.entries(DISPLAY_AMOUNTS[interval])) {
      const code = currency.toLowerCase();
      const option =
        code === price.currency
          ? { unit_amount: price.unit_amount, tax_behavior: price.tax_behavior }
          : price.currency_options?.[code];
      const ok = option?.unit_amount === amount * 100 && option?.tax_behavior === "inclusive";
      console.log(`${ok ? "ok " : "BAD"} ${LOOKUP_KEYS[interval]} ${currency} ${option?.unit_amount ?? "–"} ${option?.tax_behavior ?? "–"}`);
      if (!ok) bad++;
    }
  }
  return bad;
}

main().then(
  (bad) => process.exit(bad ? 1 : 0),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
