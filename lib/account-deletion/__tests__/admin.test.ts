import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { createClient, deleteUser } = vi.hoisted(() => ({ createClient: vi.fn(), deleteUser: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
import { createDeletionAdminClient, hardDeleteAuthUser } from "../admin";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "private-test-key");
  createClient.mockImplementation(() => ({ auth: { admin: { deleteUser } } }));
});
afterEach(() => vi.unstubAllEnvs());
it.each(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])("fails closed without %s", (name) => {
  vi.stubEnv(name, "");
  expect(() => createDeletionAdminClient()).toThrow(/^Account deletion configuration is required$/);
  expect(createClient).not.toHaveBeenCalled();
});
it("creates fresh clients with every session feature disabled and returns no credential wrapper", () => {
  const first = createDeletionAdminClient();
  expect(first).toEqual({ auth: { admin: { deleteUser } } });
  expect(JSON.stringify(first)).not.toContain("private-test-key");
  expect(createDeletionAdminClient()).not.toBe(first);
  expect(createClient).toHaveBeenCalledWith("http://localhost:54321", "private-test-key", { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
});
it("sanitizes client construction failures", () => {
  createClient.mockImplementation(() => { throw new Error("private-test-key"); });
  expect(() => createDeletionAdminClient()).toThrow(/^Account deletion client creation failed$/);
});
it("hard deletes the Auth user", async () => {
  deleteUser.mockResolvedValue({ error: null });
  await hardDeleteAuthUser(createDeletionAdminClient(), "user-id");
  expect(deleteUser).toHaveBeenCalledWith("user-id", false);
});
it("sanitizes returned and thrown Auth deletion errors", async () => {
  deleteUser.mockResolvedValueOnce({ error: { message: "private-test-key" } });
  await expect(hardDeleteAuthUser(createDeletionAdminClient(), "user-id")).rejects.toThrow(/^Auth user deletion failed$/);
  deleteUser.mockRejectedValueOnce(new Error("private-test-key"));
  await expect(hardDeleteAuthUser(createDeletionAdminClient(), "user-id")).rejects.toThrow(/^Auth user deletion failed$/);
});
