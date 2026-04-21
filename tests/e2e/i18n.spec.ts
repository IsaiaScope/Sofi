import { expect, openUserMenu, test } from "./fixtures";
import { bootApp, navigateTo, waitForRoute } from "./router-helpers";

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
  await bootApp(page);
  await navigateTo(page, "/login");
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible();

  // Step 2 — Sign in with a seeded verified user.
  const user = seedUser("i18n-roundtrip");
  await page.getByRole("textbox", { name: /email/i }).fill(user.email);
  await page.locator('input[type="password"]').first().fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await waitForRoute(page, /\/kanban/, { timeout: 10_000 });

  // Step 3 — Switch language via Settings. Language toggle is a segmented
  // radiogroup of two buttons (role="radio") labelled "English" / "Italiano".
  await navigateTo(page, "/settings");
  await page.getByRole("radio", { name: "Italiano" }).click();

  // "Sign Out" is inside the user-menu dropdown — open it first, then assert
  // the label has flipped to the Italian "Esci".
  await openUserMenu(page);
  await expect(page.getByRole("menuitem", { name: "Esci" })).toBeVisible({ timeout: 5_000 });

  // Step 4 — Zod validation messages render in Italian. Sign out by clicking
  // the Italian menu item, then submit the login form with empty fields.
  await page.getByRole("menuitem", { name: "Esci" }).click();
  await waitForRoute(page, /\/login/, { timeout: 10_000 });

  await expect(page.getByRole("button", { name: "Accedi" })).toBeVisible();
  await page.getByRole("button", { name: "Accedi" }).click();

  // Italian Zod/i18n validation error — the exact wording comes from the
  // zod-i18n-map Italian bundle. Accept any of the known translations:
  // "email non valida", "Indirizzo email non valido", "obbligatoria",
  // or the minimum-length message.
  await expect(
    page
      .getByText(/email non valida|Indirizzo email non valido|obbligatoria|almeno/i)
      .first(),
  ).toBeVisible({ timeout: 5000 });
});
