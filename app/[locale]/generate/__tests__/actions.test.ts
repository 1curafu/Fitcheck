vi.mock("server-only", () => ({}));
const db = vi.hoisted(() => ({ from: vi.fn(), auth: { getUser: async () => ({ data: { user: null } }) } }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => db }));
import { generate } from "../actions";
test("unauthenticated calls cannot read a closet or create localized looks", async () => {
  expect(await generate({ occasion: "everyday", formality: null, lean: [] })).toEqual({ status: "error", message: "errors.generateNotSignedIn" });
  expect(db.from).not.toHaveBeenCalled();
});
