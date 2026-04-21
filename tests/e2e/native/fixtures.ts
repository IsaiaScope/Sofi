import { execFileSync } from "node:child_process";
import { test as base } from "@playwright/test";

/**
 * Native (tauri-native) Playwright fixtures.
 *
 * Wraps the Tauri launcher behind a thin abstraction so the rest of the
 * suite never imports it directly. Currently using a manual shim because
 * @tauri-apps/playwright is not yet published to npm.
 *
 * BLOCKED: @tauri-apps/playwright is not on npm as of 2026-04-21.
 * When the package is published, import its launcher here and wire it into
 * launchOptions / test.use() to attach Playwright's chromium driver to the
 * Tauri webview rather than pointing at a dev server.
 *
 * Provides:
 *   - `appPath`: the bundled .app path (set via env, defaults to /Applications/Sofi.app)
 *   - `triggerDeepLink(url)`: macOS `open <url>` fires sofi:// through Launch Services
 */

const DEFAULT_APP_PATH = "/Applications/Sofi.app";

export const test = base.extend<{
  appPath: string;
  triggerDeepLink: (url: string) => void;
}>({
  appPath: async ({}, use) => {
    await use(process.env.SOFI_E2E_APP_PATH ?? DEFAULT_APP_PATH);
  },
  triggerDeepLink: async ({}, use) => {
    await use((url: string) => {
      execFileSync("open", [url], { stdio: "ignore" });
    });
  },
});

export { expect } from "@playwright/test";
