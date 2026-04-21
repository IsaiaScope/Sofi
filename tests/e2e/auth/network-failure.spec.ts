import { signIn, test, expect } from "../fixtures";
import { bootApp, navigateTo, waitForRoute } from "../router-helpers";
import { mockNetworkFailure } from "../auth-helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("network failure surfaces the ErrorBanner", () => {
  test("login 500 → ErrorBanner visible; unroute → real login succeeds", async ({
    page,
    seedUser,
  }) => {
    const user = seedUser("netfail-500");

    await mockNetworkFailure(page, "**/auth/login/", { status: 500 });
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);
    // The mock returns { code: "internal", detail: "mock failure" }.
    // ErrorBanner shows the detail string since "internal" has no i18n mapping.
    await expect(page.getByText(/mock failure|server error|something went wrong/i)).toBeVisible({
      timeout: 5_000,
    });

    await page.unroute("**/auth/login/");
    await signIn(page, user.email, user.password);
    await waitForRoute(page, /\/kanban/, { timeout: 10_000 });
  });

  test("login aborted at network layer → ErrorBanner visible", async ({ page, seedUser }) => {
    const user = seedUser("netfail-abort");
    await mockNetworkFailure(page, "**/auth/login/", { abort: true });
    await bootApp(page);
    await navigateTo(page, "/login");
    await signIn(page, user.email, user.password);
    // Aborted fetch throws TypeError → api-client produces "Can't reach Sofi backend…" message.
    await expect(
      page.getByText(/can't reach|network error|failed to fetch|network|connection|unable/i).first(),
    ).toBeVisible({
      timeout: 5_000,
    });
  });
});
