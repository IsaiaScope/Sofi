import { execFileSync } from "node:child_process";
import { type Page, test as base, expect } from "@playwright/test";

export const TEST_PASSWORD = "Correct-Horse-Battery-9";
export const TEST_EMAIL_SUFFIX = "@test.sofi.local";

type SeedResult = { email: string; password: string };
type Seeder = (emailPrefix: string, password?: string) => SeedResult;

function manage(...args: string[]): string {
  return execFileSync("uv", ["run", "python", "manage.py", ...args], {
    encoding: "utf8",
    cwd: "backend",
  }).trim();
}

export function uniqueEmail(prefix: string): string {
  // crypto.randomUUID is single-call worker-safe; replaces Date.now() to remove
  // the rare millisecond-collision in fullyParallel runs.
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${prefix}-${suffix}${TEST_EMAIL_SUFFIX}`;
}

function seed(email: string, password: string, verified: boolean): SeedResult {
  const args = ["e2e_seed_user", "--email", email, "--password", password];
  if (!verified) args.push("--unverified");
  manage(...args);
  return { email, password };
}

export function deleteSeededUser(email: string): void {
  manage("e2e_delete_user", "--email", email);
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  // Use role-based textbox locator to avoid strict mode collision with
  // TanStack Router devtools buttons that have aria-labels containing "email"
  // (e.g. "Open match details for /_public/check-email").
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  // The password input has type="password"; the show/hide toggle is a button.
  // Targeting by selector avoids the strict-mode collision with the toggle's
  // accessible name.
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

export async function openUserMenu(page: Page): Promise<void> {
  const trigger = page
    .locator('[aria-label="User menu"], [data-testid="user-menu-trigger"]')
    .first();
  await trigger.waitFor({ state: "visible", timeout: 5_000 });
  await trigger.click();
}

export function verificationUrl(email: string): { url: string; key: string } {
  const raw = manage("e2e_last_email", "--email", email, "--kind", "verify");
  return JSON.parse(raw);
}

export function resetUrl(email: string): { url: string; uid: string; token: string } {
  const raw = manage("e2e_last_email", "--email", email, "--kind", "reset");
  return JSON.parse(raw);
}

export function revokeAllTokens(email: string): void {
  manage("e2e_revoke_tokens", "--email", email);
}

async function provideSeeder(verified: boolean, use: (s: Seeder) => Promise<void>) {
  const created: string[] = [];
  const seeder: Seeder = (prefix, password) => {
    const email = uniqueEmail(prefix);
    const result = seed(email, password ?? TEST_PASSWORD, verified);
    created.push(email);
    return result;
  };
  await use(seeder);
  for (const email of created) {
    try {
      deleteSeededUser(email);
    } catch {
      // best-effort cleanup
    }
  }
}

export const test = base.extend<{
  seedUser: Seeder;
  seedUnverifiedUser: Seeder;
  deleteUser: (email: string) => void;
}>({
  seedUser: async ({}, use) => {
    await provideSeeder(true, use);
  },
  seedUnverifiedUser: async ({}, use) => {
    await provideSeeder(false, use);
  },
  deleteUser: async ({}, use) => {
    await use(deleteSeededUser);
  },
});

export { expect };
