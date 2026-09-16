import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 60000,
  workers: 1,
  use: {
    channel: "chrome",
    baseURL: process.env.TEST_URL || "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 980 },
    trace: "retain-on-failure",
  },
  reporter: [
    ["list"],
    ["json", { outputFile: "../work/verification/test-results.json" }],
  ],
  outputDir: "../work/verification/playwright",
});
