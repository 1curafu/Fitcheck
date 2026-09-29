import type Stripe from "stripe";
import type { Locale } from "@/lib/i18n/locales";

export type CheckoutLocale = NonNullable<Stripe.Checkout.SessionCreateParams["locale"]>;
export type PortalLocale = NonNullable<Stripe.BillingPortal.SessionCreateParams["locale"]>;

// Ukrainian is unavailable on the hosted surfaces; use the approved English fallback.
const CHECKOUT = { "en-US":"en", "en-GB":"en-GB", uk:"en", ru:"ru", de:"de", fr:"fr", it:"it", pt:"pt", es:"es", nl:"nl" } as const satisfies Record<Locale,CheckoutLocale>;
const PORTAL = { "en-US":"en", "en-GB":"en-GB", uk:"en", ru:"ru", de:"de", fr:"fr", it:"it", pt:"pt", es:"es", nl:"nl" } as const satisfies Record<Locale,PortalLocale>;
export function stripeCheckoutLocale(locale: Locale): CheckoutLocale { return CHECKOUT[locale]; }
export function stripePortalLocale(locale: Locale): PortalLocale { return PORTAL[locale]; }
