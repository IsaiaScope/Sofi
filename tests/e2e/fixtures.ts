import { execFileSync } from "node:child_process";
import { type Page, test as base, expect } from "@playwright/test";

/**
 * Extended Playwright test + helpers that talk to Django via argv-array
 * management commands (no shell, no interpolation — seed/delete inputs
 * can't be injected into a subprocess).
 */

export const TEST_PASSWORD = "Correct-Horse-Battery-9";
export const TEST_EMAIL_SUFFIX = "@test.sofi.local";

type SeedResult = { email: string; password: string };
type Seeder = (email: string, password?: string) => SeedResult;

function manage(...args: string[]): string {
  return execFileSync("uv", ["run", "python", "manage.py", ...args], {
    encoding: "utf8",
    cwd: "backend",
  }).trim();
}

function seed(email: string, password: string, verified: boolean): SeedResult {
  const args = ["e2e_seed_user", "--email", email, "--password", password];
  if (!verified) {
    args.push("--unverified");
  }
  manage(...args);
  return { email, password };
}

export function deleteSeededUser(email: string): void {
  manage("e2e_delete_user", "--email", email);
}

export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

export async function openUserMenu(page: Page): Promise<void> {
  const trigger = page
    .locator('[aria-label="User menu"], [data-testid="user-menu-trigger"]')
    .first();
  await trigger.waitFor({ state: "visible", timeout: 5_000 });
  await trigger.click();
}

async function provideSeeder(
  verified: boolean,
  use: (seeder: Seeder) => Promise<void>,
) {
  const created: string[] = [];
  const seeder: Seeder = (email, password) => {
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
