import { test, expect, revokeAllTokens } from "../fixtures";
import { bootApp, navigateTo, waitForRoute, currentRoute } from "../router-helpers";

// Uses the chromium-auth project's shared storage state — already logged in.

test.describe("session expiry", () => {
  test("revoking all tokens server-side → next request bounces to /login", async ({ page }) => {
    await bootApp(page);
    await navigateTo(page, "/kanban");
    expect(await currentRoute(page)).toContain("/kanban");

    const setupEmail = process.env.SOFI_E2E_USER_EMAIL ?? "e2e@test.sofi.local";
    revokeAllTokens(setupEmail);

    // Force a re-fetch — reload the page so TanStack Query refetches.
    await page.reload();
    // Wait for __TSR_ROUTER__ to re-initialise after the SPA bundle reloads.
    await page.waitForFunction(() => "__TSR_ROUTER__" in window);
    await waitForRoute(page, /\/login/, { timeout: 10_000 });

    // The dead token is cleared from storage by the 401 interceptor.
    const tokenInStorage = await page.evaluate(() => localStorage.getItem("sofi:e2e-token"));
    expect(tokenInStorage).toBeNull();
  });
});
