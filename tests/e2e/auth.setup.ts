import { execFileSync } from "node:child_process";
import { test as setup } from "@playwright/test";
import { TEST_PASSWORD, signIn } from "./fixtures";

/**
 * Playwright setup project — runs once before any auth'd spec.
 *
 * Seeds a verified user via the Django management command, logs in
 * through the real UI, and persists storage state to `.auth/user.json`.
 * Specs in the `chromium-auth` project reuse that state and skip the
 * login round-trip.
 */

const AUTH_FILE = ".auth/user.json";
const TEST_EMAIL = process.env.SOFI_E2E_USER_EMAIL ?? "e2e@test.sofi.local";
const PASSWORD = process.env.SOFI_E2E_USER_PASSWORD ?? TEST_PASSWORD;

setup("seed + sign in", async ({ page }) => {
  const raw = execFileSync(
    "uv",
    [
      "run",
      "python",
      "manage.py",
      "e2e_seed_user",
      "--email",
      TEST_EMAIL,
      "--password",
      PASSWORD,
    ],
    { encoding: "utf8", cwd: "backend" },
  );
  const seed = JSON.parse(raw.trim());
  // biome-ignore lint/suspicious/noConsole: intentional setup diagnostic
  console.log(`[auth.setup] seeded ${seed.email} (created=${seed.created})`);

  await page.goto("/login");
  await signIn(page, seed.email, PASSWORD);
  // `/` is the default post-login destination per _authenticated.beforeLoad.
  await page.waitForURL(/\/$/, { timeout: 10_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
