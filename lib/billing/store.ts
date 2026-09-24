import type { Tier } from "@/lib/billing/tiers";
import type { BillingState } from "@/lib/billing/stripe/status";

export type BillingProfile = { userId: string; email: string | null; stripeCustomerId: string | null; tier: Tier };

/** The only persistence billing logic needs. Production: lib/billing/admin.ts (service role). Tests: in-memory fake. */
export interface BillingStore {
  profileByUserId(userId: string): Promise<BillingProfile | null>;
  userIdByCustomerId(customerId: string): Promise<string | null>;
  /** Sets stripe_customer_id only if still null; returns the id that ended up stored. */
  claimCustomerId(userId: string, customerId: string): Promise<string>;
  writeBillingState(userId: string, state: BillingState): Promise<void>;
  recordWaiver(userId: string, at: Date, termsVersion: string): Promise<void>;
  hasProcessedEvent(eventId: string): Promise<boolean>;
  markEventProcessed(eventId: string, type: string): Promise<void>;
}
