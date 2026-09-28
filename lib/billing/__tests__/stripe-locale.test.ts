import { expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n/locales";
import { stripeCheckoutLocale, stripePortalLocale } from "../stripe/locale";
import { buildCheckoutParams } from "../stripe/checkout-params";
import { createStripeGateway, createStubGateway } from "../stripe/gateway";
import { vi } from "vitest";
import type Stripe from "stripe";

const expected = ["en", "en-GB", "en", "ru", "de", "fr", "it", "pt", "es", "nl"];
it.each(LOCALES)("maps %s explicitly for both hosted surfaces", locale => {
 const mapped = expected[LOCALES.indexOf(locale)];
 expect(stripeCheckoutLocale(locale)).toBe(mapped);
 expect(stripePortalLocale(locale)).toBe(mapped);
 const params = buildCheckoutParams({customerId:"cus_1",userId:"u1",priceId:"price_1",waiverAt:"now",successUrl:"success",cancelUrl:"cancel",locale});
 expect(params.locale).toBe(mapped);
 expect(params.managed_payments).toEqual({enabled:true});
});
it("legacy checkout defaults to English", () => {
 expect(buildCheckoutParams({customerId:"cus_1",userId:"u1",priceId:"price_1",waiverAt:"now",successUrl:"success",cancelUrl:"cancel"}).locale).toBe("en");
});
it("passes the portal locale to the provider",async()=>{
 const create=vi.fn(async()=>({url:"https://billing.stripe.com/session"}));
 const gateway=createStripeGateway({billingPortal:{sessions:{create}}} as unknown as Stripe);
 await gateway.createPortalSession("cus_1","https://fitcheck.space/en-gb/profile",stripePortalLocale("en-GB"));
 expect(create).toHaveBeenCalledWith({customer:"cus_1",return_url:"https://fitcheck.space/en-gb/profile",locale:"en-GB"});
});
it("stub returns to the supplied localized destinations",async()=>{
 const gateway=createStubGateway();
 expect(await gateway.createCheckoutSession({customerId:"cus_1",userId:"u1",priceId:"price_1",waiverAt:"now",successUrl:"success",cancelUrl:"http://127.0.0.1:3000/uk/profile?pro=cancelled"})).toEqual({url:"http://127.0.0.1:3000/uk/profile?pro=stub-checkout"});
 expect(await gateway.createPortalSession("cus_1","http://127.0.0.1:3000/en-gb/profile","en-GB")).toEqual({url:"http://127.0.0.1:3000/en-gb/profile?pro=stub-portal"});
});
