import { expect, signIn, test } from "../fixtures";
import { bootApp, navigateTo, waitForRoute } from "../router-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("resend verification", () => {
  test("unverified login shows the warning banner + resend button", async ({
    page,
    seedUnverifiedUser,
  }) => {
    const user = seedUnverifiedUser("unverified");
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);

    // Orange warning callout with the mail icon + "Email verification required" title.
    await expect(page.getByText(/email verification required/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(
      page.getByRole("button", { name: /resend/i }),
    ).toBeVisible();
  });

  test("clicking Resend navigates to /check-email with the typed address", async ({
    page,
    seedUnverifiedUser,
  }) => {
    const user = seedUnverifiedUser("unverified");
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);

    const resend = page.getByRole("button", { name: /resend/i });
    await resend.waitFor({ state: "visible" });
    await resend.click();

    await waitForRoute(page, /\/check-email/, { timeout: 10_000 });
    await expect(page.getByText(user.email)).toBeVisible();
  });
});
