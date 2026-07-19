import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./src/components/invoices",
  testMatch: "**/*.browser.test.js",
  timeout: 30_000,
  use: {
    headless: true,
  },
});
