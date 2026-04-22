/**
 * OAuth web flow specs — Google and GitHub against mock-oauth2-server.
 *
 * Both specs create the same test user (oauth-test@test.sofi.local) because
 * mock-oauth2-server is configured with a fixed email claim. They are serialised
 * within this file so they don't race over the shared user row.
 *
 * Prerequisites:
 *   docker compose -f docker-compose.test.yml up -d mock-oauth2-server
 *   DJANGO_SETTINGS_MODULE=sofi_api.settings.test_oauth pnpm test:e2e
 */
import { test, expect, mockOauthUser, deleteSeededUser } from "../fixtures";
import { bootApp, currentRoute, navigateTo, waitForRoute } from "../router-helpers";

// Run all specs in this file serially so Google + GitHub don't race over the
// shared oauth-test@test.sofi.local user row.
test.describe.configure({ mode: "serial" });

const OAUTH_TEST_EMAIL = "oauth-test@test.sofi.local";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  // Delete the OAuth test user before each spec so the social-login flow can
  // create a fresh account (avoids "already registered" errors on re-runs).
  try {
    deleteSeededUser(OAUTH_TEST_EMAIL);
  } catch {
    // User doesn't exist — that's fine.
  }
});

test.afterEach(async () => {
  try {
    deleteSeededUser(OAUTH_TEST_EMAIL);
  } catch {
    // Best-effort cleanup.
  }
});

test("OAuth — Google: clicking Google button completes the flow and lands on /kanban", async ({
  page,
}) => {
  await mockOauthUser(page, { provider: "google" });

  await bootApp(page);
  await navigateTo(page, "/login");
  await page.getByRole("button", { name: /continue via google/i }).click();

  await waitForRoute(page, /\/kanban/, { timeout: 15_000 });
  expect(await currentRoute(page)).toMatch(/\/kanban/);
});

test("OAuth — GitHub: clicking GitHub button completes the flow and lands on /kanban", async ({
  page,
}) => {
  await mockOauthUser(page, { provider: "github" });

  await bootApp(page);
  await navigateTo(page, "/login");
  await page.getByRole("button", { name: /continue via github/i }).click();

  await waitForRoute(page, /\/kanban/, { timeout: 15_000 });
  expect(await currentRoute(page)).toMatch(/\/kanban/);
});
