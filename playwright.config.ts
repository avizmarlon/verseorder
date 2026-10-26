import { defineConfig, devices } from "@playwright/test";

const localUrl = `http://127.0.0.1:4173${process.env.GITHUB_PAGES === "true" ? "/verseorder/" : "/"}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  // One retry on CI for timing noise on shared runners; a test that needs it is still listed as
  // flaky in the report.
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL as "msedge" | "chrome" | undefined,
    headless: true,
    baseURL: process.env.VERSEORDER_TEST_URL || localUrl,
    trace: "on-first-retry",
  },
  reporter: [["list"]],
  webServer: process.env.VERSEORDER_TEST_URL
    ? undefined
    : {
        command: "node scripts/serve-export.mjs",
        url: localUrl,
        reuseExistingServer: !process.env.CI,
      },
});
