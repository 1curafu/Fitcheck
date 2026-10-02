// Mutation testing (StrykerJS). Changed files only: `npm run mutate:changed`; one file: `npm run mutate -- --mutate lib/x.ts`.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: { configFile: "vitest.config.ts" },
  mutate: ["lib/**/*.ts", "app/**/actions.ts", "!**/__tests__/**", "!**/*.test.ts"],
  ignoreStatic: true,
  disableTypeChecks: "{lib,app,components}/**/*.{ts,tsx}",
  incremental: true,
  incrementalFile: "reports/mutation/stryker-incremental.json",
  reporters: ["clear-text", "progress", "html"],
  htmlReporter: { fileName: "reports/mutation/index.html" },
  thresholds: { high: 80, low: 60, break: null },
  concurrency: 4,
  timeoutMS: 60000,
  tempDirName: ".stryker-tmp",
};

export default config;
