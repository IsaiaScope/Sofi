import { test, expect } from "../fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

/**
 * The sofi:// deep-link itself is OS-level (Launch Services on macOS,
 * the Tauri deep-link plugin handler in Rust). We can't drive that from
 * Playwright running against the Vite web build. What we CAN do:
 *
 *   1. Assert the /verify-success route renders correctly when the user
 *      arrives at it directly (simulating the moment after the deep-
 *      link handler in Rust calls `router.navigate({ to: "/verify-success" })`).
 *   2. Assert the "Sign In" CTA bounces to /login.
 *
 * The full browser-to-desktop handoff lives in the nightly Tauri job.
 */

test.describe("/verify-success route", () => {
  test("shows the success card with Sign In CTA", async ({ page }) => {
    await page.goto("/verify-success");
    await expect(
      page.getByRole("heading", { name: /uplink established|you're in/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/email verified|your email is verified/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("clicking Sign In navigates to /login", async ({ page }) => {
    await page.goto("/verify-success");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/login/);
  });
});
