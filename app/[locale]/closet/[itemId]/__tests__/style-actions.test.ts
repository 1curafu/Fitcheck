vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({ from: vi.fn(), auth: { getUser: async () => ({ data: { user: null } }) } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));
import { styleWithItem } from "../style-actions";
test("unauthenticated calls cannot read a closet or create localized looks", async () => {
  expect(await styleWithItem("22222222-2222-4222-8222-222222222222")).toEqual({ status: "error", message: "item.style.notSignedIn" });
  expect(db.from).not.toHaveBeenCalled();
});
