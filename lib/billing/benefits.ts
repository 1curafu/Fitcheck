/**
 * The Pro benefits, in pitch order. A plain module so server components can read it: the upgrade sheet is a
 * client module, and a server import of its array would receive a client reference instead of the values.
 * The upgrade sheet and the public landing both render this list, so they cannot disagree about Pro.
 */
export const PRO_BENEFIT_KEYS = ["rerolls", "styled", "closet", "packing", "analytics", "gap", "saved"] as const;
export type ProBenefitKey = (typeof PRO_BENEFIT_KEYS)[number];
