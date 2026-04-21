import { test, expect } from "../../native/fixtures";
import { waitForRoute } from "../../router-helpers";

test.describe("native deep-link", () => {
  test("sofi://verify-email/<key> opens the app and lands on /verify-success", async ({
    page,
    triggerDeepLink,
  }) => {
    // The key isn't validated end-to-end here (the backend's allauth
    // confirm-email view + the Rust deep-link handler do that). We assert
    // the OS handoff fires and the app routes to the right SPA destination.
    triggerDeepLink("sofi://verify-email/test-key-12345");

    // Give Launch Services + the app a moment to focus, then assert the
    // in-app router landed on the verify-success route.
    await waitForRoute(page, /\/verify-success/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: /you're in|uplink established/i }),
    ).toBeVisible();
  });
});
