import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
