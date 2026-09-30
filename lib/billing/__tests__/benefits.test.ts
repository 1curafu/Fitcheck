import { describe, expect, it, vi } from "vitest";
import enUS from "@/messages/en-US.json";

// The upgrade sheet imports the checkout Server Action; the list itself needs none of it.
vi.mock("@/app/billing/actions", () => ({ startCheckout: vi.fn() }));

import { PRO_BENEFIT_KEYS } from "../benefits";
import { PRO_BENEFITS } from "@/components/billing/upgrade-sheet";

describe("Pro benefits", () => {
  it("every benefit has copy, and the upgrade sheet lists exactly these, in order", () => {
    expect(Object.keys(enUS.billing.benefits)).toEqual([...PRO_BENEFIT_KEYS]);
    expect(PRO_BENEFITS.map((b) => b.key)).toEqual([...PRO_BENEFIT_KEYS]);
  });
});
