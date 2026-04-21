import { defineConfig, devices } from "@playwright/test";

/**
 * Sofi Playwright config.
 *
 * Two-phase projects:
 *
 *   `setup` project: runs `auth.setup.ts`. Creates a verified user via
 *     direct HTTP to Django, logs in, and writes the Knox token + browser
 *     storage state to `.auth/user.json`.
 *
 *   `chromium-auth` project: uses the saved storage state so specs under
 *     `tests/e2e/auth/` (and anything else that needs a logged-in user)
 *     skip the login round-trip.
 *
 * Anonymous specs (login form, register form) opt out with
 *   `test.use({ storageState: { cookies: [], origins: [] } })`.
 *
 * The webServer block boots Vite + Django concurrently so `pnpm test:e2e`
 * runs fully offline from a clean checkout (given a running Postgres).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: process.env.SOFI_E2E_BASE_URL ?? "http://localhost:1420",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: [
    {
      command: "pnpm dev",
      url: "http://localhost:1420",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "uv run python manage.py runserver 127.0.0.1:8000",
      cwd: "backend",
      env: {
        DJANGO_SETTINGS_MODULE: process.env.DJANGO_SETTINGS_MODULE ?? "sofi_api.settings.test",
      },
      url: "http://127.0.0.1:8000/auth/user/",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // /auth/user/ returns 401 without a token — that's a healthy signal
      // the server is up and DRF is routing. Playwright treats any HTTP
      // response (even 4xx) as "server is alive".
      ignoreHTTPSErrors: true,
    },
  ],
});
