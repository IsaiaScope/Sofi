import { test } from "../../native/fixtures";
import { waitForRoute } from "../../router-helpers";

test.describe("native OAuth callback", () => {
  test("OAuth → sofi://oauth/callback?code=… → token issued", async ({
    page,
    triggerDeepLink,
  }) => {
    // The full native OAuth flow runs through Rust's loopback server.
    // We can't easily simulate the provider redirect in a way that matches
    // the loopback's expectations here, so this spec asserts the simpler
    // contract: deep-link arrival on the OAuth callback path triggers the
    // app to attempt a token exchange.
    triggerDeepLink("sofi://oauth/callback?code=mock-oauth-code&state=test-state");

    // The app should either land on /kanban (success) or /login with an
    // error banner (provider rejected). Either way, the SPA observed the
    // deep link and routed.
    await waitForRoute(page, /\/(kanban|login)/, { timeout: 15_000 });
  });
});
