import { type Page, expect } from "@playwright/test";
import { resetUrl, verificationUrl } from "./fixtures";
import { bootApp, navigateTo, waitForRoute } from "./router-helpers";

/**
 * Composable, single-responsibility helpers for auth specs.
 * Each helper does ONE phase of a flow so specs can mix-and-match.
 * No new fixture state — these are pure functions of `page`.
 */

export interface RegisterFields {
  email: string;
  password: string;
  displayName?: string;
}

export async function register(page: Page, fields: RegisterFields): Promise<void> {
  await bootApp(page);
  await navigateTo(page, "/register");
  if (fields.displayName) {
    await page.getByLabel(/display name/i).fill(fields.displayName);
  }
  // Use role-based textbox locator to avoid strict mode collision with
  // TanStack Router devtools buttons that have aria-labels containing "email".
  await page.getByRole("textbox", { name: /email/i }).fill(fields.email);
  await page.locator('input[type="password"]').first().fill(fields.password);
  await page.locator('input[type="password"]').nth(1).fill(fields.password);
  await page
    .getByRole("button", { name: /create operator|initialize session|create account/i })
    .click();
  await waitForRoute(page, /\/check-email/, { timeout: 10_000 });
}

export async function verifyEmail(page: Page, email: string): Promise<void> {
  const { url } = verificationUrl(email);
  // This URL is an external http:// endpoint on Django (/accounts/confirm-email/<key>/)
  // — that's a REAL browser-URL navigation, not an SPA route, so page.goto is correct here.
  await page.goto(url);
  // Django's allauth /accounts/confirm-email/ redirects to /email-verified/ (a Django template,
  // not an SPA route). Assert on visible content rather than router state.
  // Use .first() because the template contains both the <p> body text ("Email verified.") and
  // the <a> CTA ("Return to Sofi"), both of which match the regex.
  await expect(page.getByText(/email verified|return to sofi/i).first()).toBeVisible({
    timeout: 5_000,
  });
}

export async function requestPasswordReset(page: Page, email: string): Promise<void> {
  await bootApp(page);
  await navigateTo(page, "/recover");
  // Use role-based textbox locator to avoid strict mode collision with
  // TanStack Router devtools buttons that have aria-labels containing "email".
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("button", { name: /dispatch|send/i }).click();
  // Success swap: same route, "LINK DISPATCHED" heading visible.
  // Use role-based heading locator to avoid strict-mode collision with the
  // status bar span that also contains "link dispatched".
  await expect(page.getByRole("heading", { name: /link dispatched/i })).toBeVisible({
    timeout: 5_000,
  });
}

export async function completePasswordReset(
  page: Page,
  email: string,
  newPassword: string,
): Promise<void> {
  const { uid, token } = resetUrl(email);
  await bootApp(page);
  await navigateTo(page, "/recover/confirm", { uid, token });
  await page.locator('input[type="password"]').first().fill(newPassword);
  await page.locator('input[type="password"]').nth(1).fill(newPassword);
  await page.getByRole("button", { name: /commit|reset/i }).click();
  // Success swap: "CREDENTIAL RESET" heading + "Sign In" button visible.
  // Use role-based heading locator to avoid strict-mode collision with the
  // status bar span that also contains "credential reset".
  await expect(page.getByRole("heading", { name: /credential reset/i })).toBeVisible({
    timeout: 5_000,
  });
}

export async function mockNetworkFailure(
  page: Page,
  pattern: string,
  options: { status?: number; abort?: boolean } = {},
): Promise<void> {
  await page.route(pattern, (route) => {
    if (options.abort) {
      route.abort("failed");
      return;
    }
    route.fulfill({
      status: options.status ?? 500,
      contentType: "application/json",
      body: JSON.stringify({ code: "internal", detail: "mock failure" }),
    });
  });
}
