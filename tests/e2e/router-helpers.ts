import type { Page } from "@playwright/test";

/**
 * Sofi uses TanStack Router with createMemoryHistory — the browser URL never
 * changes when the in-app router navigates. These helpers drive navigation
 * and assertions through window.__TSR_ROUTER__ instead of page.goto / page.url.
 *
 * TanStack Router sets window.__TSR_ROUTER__ = router automatically in the
 * RouterCore constructor (router-core/src/router.ts line ~1009). No manual
 * assignment needed.
 *
 * See docs/testing.md and MEMORY.md (reference_sofi_router_memory_history.md).
 */

// window.__TSR_ROUTER__ is declared by @tanstack/router-core's global.d.ts as
// `AnyRouter | undefined`. No manual augmentation needed here.

/** Boot the SPA: load the dev server root and wait until the router is ready. */
export async function bootApp(page: Page): Promise<void> {
  await page.goto("/");
  // Wait for router to be idle AND have completed its first navigation.
  //
  // TanStack Router sets window.__TSR_ROUTER__ in the RouterCore constructor
  // (before React mounts), so __TSR_ROUTER__ exists and state.status === 'idle'
  // from the very beginning — before the RouterProvider has processed any
  // navigation. We must also check that resolvedLocation is defined, which
  // only becomes set after the first navigation cycle completes.
  await page.waitForFunction(
    () => {
      const r = window.__TSR_ROUTER__;
      return !!r && r.state?.status === "idle" && r.state.resolvedLocation !== undefined;
    },
    undefined,
    { timeout: 15_000 },
  );
}

/**
 * Navigate via the in-app router using router.history.push(), which directly
 * drives the memory history without going through React's rendering cycle.
 * Safer than router.navigate() when called from outside React.
 * Boots the app first if the router is not yet ready.
 *
 * Optional `search` param object is serialized to a query string and appended
 * to the path — use for routes that read from `Route.useSearch()`.
 */
export async function navigateTo(
  page: Page,
  path: string,
  search?: Record<string, string>,
): Promise<void> {
  const isReady = await page.evaluate(() => {
    const r = window.__TSR_ROUTER__;
    return !!r && r.state?.status === "idle" && r.state.resolvedLocation !== undefined;
  });
  if (!isReady) {
    await bootApp(page);
  }

  const fullPath =
    search && Object.keys(search).length > 0
      ? `${path}?${new URLSearchParams(search).toString()}`
      : path;

  // Skip push if already at the target path to avoid re-triggering route errors
  // that can occur when pushing the same route that was just set by a redirect.
  const navigated = await page.evaluate((to) => {
    const r = window.__TSR_ROUTER__;
    if (!r) throw new Error("__TSR_ROUTER__ not exposed on window");
    const current = r.state?.location?.pathname;
    if (current === to) return false;
    if (r.history?.push) {
      r.history.push(to);
    } else if (r.navigate) {
      return r.navigate({ to }).then(() => true);
    } else {
      throw new Error("__TSR_ROUTER__ has no history.push or navigate method");
    }
    return true;
  }, fullPath);

  if (navigated) {
    await page.waitForFunction(
      () => {
        const r = window.__TSR_ROUTER__;
        return r?.state?.status === "idle" && r.state?.resolvedLocation !== undefined;
      },
      undefined,
      { timeout: 15_000 },
    );
  }
}

/**
 * Wait until the in-app router's pathname matches the given regex or exact string.
 */
export async function waitForRoute(
  page: Page,
  match: RegExp | string,
  options: { timeout?: number } = {},
): Promise<void> {
  const timeout = options.timeout ?? 10_000;
  if (typeof match === "string") {
    await page.waitForFunction(
      (target) => window.__TSR_ROUTER__?.state?.location?.pathname === target,
      match,
      { timeout },
    );
  } else {
    await page.waitForFunction(
      (m) => {
        const pathname = window.__TSR_ROUTER__?.state?.location?.pathname ?? "";
        return new RegExp(m.source, m.flags).test(pathname);
      },
      { source: match.source, flags: match.flags },
      { timeout },
    );
  }
}

/** Read the current in-app pathname. */
export async function currentRoute(page: Page): Promise<string> {
  return await page.evaluate(() => window.__TSR_ROUTER__?.state?.location?.pathname ?? "");
}
