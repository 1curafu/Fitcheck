import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ getUser: vi.fn(), sync: vi.fn(), gateway: {} as Record<string, unknown> }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: h.getUser } }) }));
vi.mock("@/lib/billing/stripe/client", () => ({ billingEnabled: () => true, getGateway: () => h.gateway }));
vi.mock("@/lib/billing/admin", () => ({ createBillingStore: () => ({}) }));
vi.mock("@/lib/billing/stripe/sync", () => ({ syncCustomer: h.sync }));
import { fakeGateway } from "@/lib/billing/__tests__/fakes";
import { GET } from "../return/route";

let gateway: ReturnType<typeof fakeGateway>;
beforeEach(() => {
  vi.clearAllMocks();
  gateway = fakeGateway();
  Object.assign(h.gateway, gateway);
  h.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
});
const req = (q: string) => new Request(`http://localhost:3000/billing/return${q}`);

it("syncs and welcomes the owner of the session", async () => {
  const res = await GET(req("?session_id=cs_1"));
  expect(h.sync).toHaveBeenCalledWith(expect.anything(), "cus_1");
  expect(res.headers.get("location")).toBe("http://localhost:3000/profile?pro=welcome");
});

it("never syncs someone else's session", async () => {
  gateway.retrieveCheckoutSession.mockResolvedValue({ clientReferenceId: "u2", customerId: "cus_2" });
  const res = await GET(req("?session_id=cs_other"));
  expect(h.sync).not.toHaveBeenCalled();
  expect(res.headers.get("location")).toBe("http://localhost:3000/profile");
});

it("without a session cookie, goes home", async () => {
  h.getUser.mockResolvedValue({ data: { user: null } });
  const res = await GET(req("?session_id=cs_1"));
  expect(h.sync).not.toHaveBeenCalled();
  expect(res.headers.get("location")).toBe("http://localhost:3000/");
});

it("without a session id, goes to the profile without syncing", async () => {
  const res = await GET(req(""));
  expect(h.sync).not.toHaveBeenCalled();
  expect(res.headers.get("location")).toBe("http://localhost:3000/profile");
});

it("a Stripe error still lands on the profile (the webhook will catch up)", async () => {
  gateway.retrieveCheckoutSession.mockRejectedValue(new Error("down"));
  const res = await GET(req("?session_id=cs_1"));
  expect(res.headers.get("location")).toBe("http://localhost:3000/profile?pro=welcome");
});
