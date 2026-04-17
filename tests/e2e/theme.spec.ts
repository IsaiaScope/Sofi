import { expect, test } from "@playwright/test";

test.describe("Theme hydration", () => {
  test("no localStorage, prefers dark → no .light class on html", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\blight\b/);
    await ctx.close();
  });

  test("localStorage = light → html has .light class", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sofi:theme", "light"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
  });

  test("localStorage = dark → html has no .light class", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sofi:theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\blight\b/);
  });

  test("system mode + prefers light → html has .light class", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "light" });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem("sofi:theme", "system"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
    await ctx.close();
  });
});
