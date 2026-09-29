import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { messages = { create: mock.create }; } }));
import { tagItem } from "../tag-item";
afterEach(() => { vi.unstubAllEnvs(); mock.create.mockReset(); });
it("the real provider uses the requested name language and validates response-only output", async () => {
  vi.stubEnv("FITCHECK_STUB_AI", "0");
  mock.create.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify({
    category: "Tops", subcategory: "Oxford shirt", colors: ["white"], pattern: "solid", material: "Cotton",
    texture: "Flat", formality: 3, seasons: ["Spring"], accent_color: null, branding: "None",
    fit: "Regular", length: "Hip", bulk: null, distressing: "None", rotation: 0, suggested_name: "Сорочка",
  }) }] });
  const result = await tagItem("test-base64", "image/webp", "uk");
  expect(result).toMatchObject({ suggestedName: "Сорочка", tags: { subcategory: "Oxford shirt" } });
  expect(result.tags).not.toHaveProperty("suggested_name");
  const args = mock.create.mock.calls[0][0];
  expect(args.messages[0].content[1].text).toContain("Write only suggested_name in Ukrainian");
  expect(args.output_config.format.schema.required).toContain("suggested_name");
});
it("localized stubs still return English machine tags", async () => {
  vi.stubEnv("FITCHECK_STUB_AI", "1");
  expect(await tagItem("test", "image/png", "uk")).toMatchObject({
    suggestedName: "Оксфордська сорочка", tags: { category: "Tops", subcategory: "Oxford shirt", material: "Cotton" },
  });
  expect(mock.create).not.toHaveBeenCalled();
});
