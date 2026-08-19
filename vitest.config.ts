import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    /**
     * ⚠️ `e2e/` belongs to Playwright, not Vitest.
     *
     * Without this, Vitest collects `e2e/*.spec.ts`, fails to import
     * `@playwright/test`, and reports "1 failed | 77 passed" at the FILE level
     * while every individual test still passes — so `Tests 737 passed` reads
     * green and the suite is actually red. It was nearly committed that way.
     */
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
});
