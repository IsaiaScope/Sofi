import { expect, test } from "./fixtures";

/**
 * i18n round-trip E2E.
 *
 * Asserts the four-step story from the i18n design spec:
 *
 *   1. App boots in English (no localStorage cache, and Playwright's Chromium
 *      reports a non-it Accept-Language by default).
 *   2. User signs in with a seeded, verified Django user (via the
 *      `seedUser` fixture — same path used by `auth/login.spec.ts`).
 *   3. User switches language to Italian via the Settings page; the top-bar
 *      "Sign Out" label immediately becomes "Esci".
 *   4. Italian Zod error surfaces when the login form is submitted empty
 *      (back on /login after a sign-out) — the Italian validation message
 *      is rendered instead of the English copy.
 *
 * A note on Step 4 (Django/DRF error): the Django half of the round-trip is
 * covered by the backend's own i18n translation middleware test (see
 * backend/apps/i18n/tests) — translating a wrong-credentials DRF detail via
 * the UI requires both a seeded user AND an Italian allauth bundle, and the
 * Italian catalog for allauth's invalid-credentials string is not yet
 * wired in CI at the time this spec was written. This spec therefore
 * verifies the front-end translation pipeline (i18next + zod-i18n-map)
 * end-to-end, and treats the Django leg as out-of-scope for the UI test.
 */

// Anonymous — opt out of the saved storage state so we start at /login.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("boots in English, switches to Italian via Settings, Zod errors translate", async ({
  page,
  seedUser,
}) => {
  // Step 1 — Boot in English. No localStorage cache, OS locale unknown inside
  // Playwright's Chromium → falls through to the default ("en").
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();

  // Step 2 — Sign in with a seeded verified user.
  const user = seedUser(`i18n-roundtrip-${Date.now()}@test.sofi.local`);
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/kanban/, { timeout: 10_000 });

  // Step 3 — Switch language via Settings. Language toggle is a segmented
  // radiogroup of two buttons (role="radio") labelled "English" / "Italiano".
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Italiano" }).click();

  // Top-bar "Sign Out" should flip to "Esci" after the locale switch.
  await expect(page.getByRole("button", { name: "Esci" })).toBeVisible();

  // Step 4 — Zod validation messages render in Italian. Sign out, then
  // submit the login form with empty fields; the Italian "required" copy
  // ("obbligatoria") or "Indirizzo email non valido" must appear.
  await page.getByRole("button", { name: "Esci" }).click();
  await page.waitForURL(/\/login/, { timeout: 10_000 });

  await expect(page.getByRole("button", { name: "Accedi" })).toBeVisible();
  await page.getByRole("button", { name: "Accedi" }).click();

  await expect(
    page.getByText(/Indirizzo email non valido|obbligatoria/i).first(),
  ).toBeVisible({ timeout: 5000 });
});
