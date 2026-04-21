import { test, expect } from "../../native/fixtures";
import { signIn, TEST_PASSWORD } from "../../fixtures";

test.describe("native keychain persistence", () => {
  test("login → quit → relaunch → still authenticated", async ({ page }) => {
    const email = process.env.SOFI_E2E_USER_EMAIL ?? "e2e@test.sofi.local";

    // First launch — log in normally.
    await page.goto("/login");
    await signIn(page, email, TEST_PASSWORD);
    await page.waitForURL(/\/kanban/, { timeout: 10_000 });

    // Quit the app. The launcher's `app.close()` triggers Tauri's native
    // shutdown, which calls `auth_clear_token` only on explicit logout —
    // not on quit. So the Keychain entry survives.
    // (Implementation: see auth-helpers in this commit; the native fixture
    // exposes a `relaunch` helper.)

    // Relaunch — the splash → /__/ probe → onTokenLoaded path should
    // hydrate from Keychain and skip /login.
    // For now, mark this spec as expected-to-fail until @tauri-apps/playwright's
    // app-restart API is wired in tests/e2e/native/fixtures.ts.
    test.fixme(true, "Awaiting @tauri-apps/playwright app-restart helper");
  });
});
