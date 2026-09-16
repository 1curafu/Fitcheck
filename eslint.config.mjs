import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design prototypes exported from the canvas tool — not app code, not shipped.
    "styling/**",
    // Generated at build time from node_modules (scripts/copy-ort.mjs) and
    // gitignored; a vendored runtime is not ours to lint.
    "public/ort/**",
    // Local-only harness artefacts and throwaway scripts; gitignored.
    "scratch/**",
    // Local-only documentation, research and saved legal documents; gitignored.
    // A saved web page brings its scripts with it, and none of it is ours.
    "docs/**",
  ]),
]);

export default eslintConfig;
