import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL as "msedge" | "chrome" | undefined,
    headless: true,
    baseURL: process.env.VERSEORDER_TEST_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  reporter: [["list"]],
});
