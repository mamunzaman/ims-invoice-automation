const { test, expect } = require("@playwright/test");
const path = require("node:path");

const fixture = path.join(__dirname, "generation-running-spinner.fixture.html");

test.describe("generation running spinner animation", () => {
  test("computed transform changes between samples for CSS keyframe spinner", async ({ page }) => {
    await page.goto("file://" + fixture.replace(/\\/g, "/"));

    const spinner = page.locator('[data-testid="generation-marker-running"]');
    await expect(spinner).toBeVisible();

    const first = await spinner.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(280);
    const second = await spinner.evaluate((el) => getComputedStyle(el).transform);

    expect(first).not.toBe("none");
    expect(second).not.toBe("none");
    expect(second).not.toBe(first);
  });

  test("reduced-motion media query disables transform changes", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("file://" + fixture.replace(/\\/g, "/"));

    const spinner = page.locator('[data-testid="generation-marker-running-motion"]');
    const first = await spinner.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(280);
    const second = await spinner.evaluate((el) => getComputedStyle(el).transform);

    expect(first).toBe(second);
  });
});
