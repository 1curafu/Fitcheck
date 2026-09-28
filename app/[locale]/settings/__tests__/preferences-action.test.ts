import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), write: vi.fn(), getUser: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/account-deletion/runtime", () => ({ deleteLiveAccount: vi.fn() }));
vi.mock("@/lib/i18n/revalidate", () => ({ revalidateEverywhere: mock.revalidate }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: mock.getUser },
  from: () => ({ select: () => ({ eq: () => ({ single: mock.read }) }), update: mock.update }),
}) }));
import { updatePreferences } from "../actions";

beforeEach(() => {
  vi.resetAllMocks();
  mock.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mock.read.mockResolvedValue({ data: { preferences: {} }, error: null });
  mock.update.mockReturnValue({ eq: mock.write });
  mock.write.mockResolvedValue({ error: null });
});

it("saves rain guard without inventing a temperature choice", async () => {
  await updatePreferences({ rainGuard: false });
  expect(mock.update).toHaveBeenCalledWith({ preferences: { rainGuard: false, wearAskedOn: null } });
  expect(mock.write).toHaveBeenCalledWith("id", "user");
});

it("does not overwrite storage when the profile read fails", async () => {
  mock.read.mockResolvedValue({ data: null, error: new Error("read failed") });
  await expect(updatePreferences({ rainGuard: false })).rejects.toThrow("read failed");
  expect(mock.update).not.toHaveBeenCalled();
});
