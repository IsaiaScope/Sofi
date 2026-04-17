# Theme Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry the dual-mode (light + dark) theme established on Stitch into Sofi's codebase, with a shadcn `ThemeProvider`, restructured `globals.css` using Tailwind 4 `@theme inline`, FOUC prevention, and a minimal Appearance toggle in the Settings route.

**Architecture:** `:root` holds dark-mode CSS custom properties (Sofi's default); `.light` class on `<html>` overrides them for light mode. A shadcn-pattern React Context provider (`ThemeProvider` + `useTheme`) owns the `system | light | dark` state, persists to `localStorage["sofi:theme"]`, and toggles the `.light` class via `useEffect`. A tiny inline `<script>` in `index.html` pre-applies the class before first paint to prevent FOUC.

**Tech Stack:** React 19, Tailwind 4 (`@theme inline`), shadcn/Base UI, Playwright (for e2e verification).

**Source spec:** `docs/superpowers/specs/2026-04-17-theme-foundation-design.md`

---

## File Structure

### New files
| Path | Responsibility |
|---|---|
| `src/components/theme/theme-provider.tsx` | `ThemeProvider` React Context component + `useTheme()` hook. Owns mode state, localStorage persistence, `matchMedia` listener, `.light` class toggle. |
| `tests/e2e/theme.spec.ts` | Playwright integration test: asserts `<html>` class reflects localStorage / OS preference on page load. |

### Modified files
| Path | Change |
|---|---|
| `src/styles/globals.css` | Split current `@theme` block into `:root` (dark values) + `.light` (light overrides) + `@theme inline` (indirection so Tailwind resolves at paint time). |
| `src/main.tsx` | Wrap existing provider tree in `<ThemeProvider>` between `ErrorBoundary` and `QueryClientProvider`. |
| `index.html` | Add inline `<script>` in `<head>` that reads `localStorage["sofi:theme"]` and matches `prefers-color-scheme`, then toggles `.light` on `document.documentElement` before first paint. |
| `src/routes/_authenticated/settings/index.tsx` | Replace `component: () => null` stub with an Appearance section wired via `useTheme()`. |

### Unchanged
- All feature components (kanban, terminal, git, agents, auth). They already consume `--color-sofi-*` tokens and will theme automatically.
- `src-tauri/`, backend, DB.

---

## Task 1: Add failing e2e theme hydration test

**Files:**
- Create: `tests/e2e/theme.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/theme.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("Theme hydration", () => {
  test("no localStorage, prefers dark → no .light class on html", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\blight\b/);
    await ctx.close();
  });

  test("localStorage = light → html has .light class", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sofi:theme", "light"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
  });

  test("localStorage = dark → html has no .light class", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("sofi:theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/\blight\b/);
  });

  test("system mode + prefers light → html has .light class", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "light" });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem("sofi:theme", "system"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\blight\b/);
    await ctx.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:e2e tests/e2e/theme.spec.ts`

Expected: FAIL. The `localStorage = light → html has .light class` test will fail because no ThemeProvider exists yet — the `<html>` element never receives the `.light` class.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/theme.spec.ts
git commit -m "test(theme): add failing e2e tests for theme hydration"
```

---

## Task 2: Restructure globals.css for dual-mode

**Files:**
- Modify: `src/styles/globals.css`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/styles/globals.css` with:

```css
@import "tailwindcss";

/* ======================================================================
   Dark theme (Sofi's default — applied when no .light class is present)
   ====================================================================== */
:root {
  /* Surfaces */
  --color-sofi-bg: #0f0f1a;
  --color-sofi-surface: #12121e;
  --color-sofi-elevated: #1e1e30;
  --color-sofi-terminal: #0a0a12;
  --color-sofi-border: rgba(255, 255, 255, 0.08);

  /* Primary: Dark Violet */
  --color-violet-primary: #7c3aed;
  --color-violet-hover: #8b5cf6;
  --color-violet-muted: rgba(124, 58, 237, 0.15);

  /* Cyan Accent */
  --color-cyan-accent: #06b6d4;
  --color-cyan-hover: #22d3ee;
  --color-cyan-muted: rgba(6, 182, 212, 0.15);

  /* Semantic Colors */
  --color-sofi-green: #10b981;
  --color-sofi-orange: #f97316;
  --color-sofi-blue: #06b6d4;
  --color-sofi-red: #ef4444;
  --color-sofi-purple: #8b5cf6;

  /* Text */
  --color-sofi-text: #e2e8f0;
  --color-sofi-text-muted: rgba(255, 255, 255, 0.5);
  --color-sofi-text-dim: rgba(255, 255, 255, 0.3);

  /* Font Families (mode-invariant) */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-heading: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;
  --font-label: "Space Grotesk", "Inter", system-ui, sans-serif;
}

/* ======================================================================
   Light theme — applied when <html class="light">
   Terminal keeps dark bg regardless (code readability).
   ====================================================================== */
.light {
  /* Surfaces */
  --color-sofi-bg: #faf9ff;
  --color-sofi-surface: #ffffff;
  --color-sofi-elevated: #eeecf5;
  /* --color-sofi-terminal intentionally unchanged — dark in both modes */
  --color-sofi-border: rgba(0, 0, 0, 0.08);

  /* Primary: Dark Violet (darker for contrast on light) */
  --color-violet-primary: #6b21d8;
  --color-violet-hover: #7c3aed;
  --color-violet-muted: rgba(107, 33, 216, 0.12);

  /* Cyan Accent (darker for contrast) */
  --color-cyan-accent: #0891b2;
  --color-cyan-hover: #06b6d4;
  --color-cyan-muted: rgba(8, 145, 178, 0.12);

  /* Semantic Colors (tuned for light) */
  --color-sofi-green: #059669;
  --color-sofi-orange: #b45309;
  --color-sofi-blue: #1e5bd6;
  --color-sofi-red: #dc2626;
  --color-sofi-purple: #7c3aed;

  /* Text */
  --color-sofi-text: #1e1e2e;
  --color-sofi-text-muted: rgba(0, 0, 0, 0.55);
  --color-sofi-text-dim: rgba(0, 0, 0, 0.4);
}

/* ======================================================================
   Tailwind @theme inline — resolve tokens at paint time from the CSS
   custom properties above. Without `inline`, Tailwind would capture the
   values at build time and the .light toggle would not work.
   ====================================================================== */
@theme inline {
  --color-sofi-bg: var(--color-sofi-bg);
  --color-sofi-surface: var(--color-sofi-surface);
  --color-sofi-elevated: var(--color-sofi-elevated);
  --color-sofi-terminal: var(--color-sofi-terminal);
  --color-sofi-border: var(--color-sofi-border);

  --color-violet-primary: var(--color-violet-primary);
  --color-violet-hover: var(--color-violet-hover);
  --color-violet-muted: var(--color-violet-muted);

  --color-cyan-accent: var(--color-cyan-accent);
  --color-cyan-hover: var(--color-cyan-hover);
  --color-cyan-muted: var(--color-cyan-muted);

  --color-sofi-green: var(--color-sofi-green);
  --color-sofi-orange: var(--color-sofi-orange);
  --color-sofi-blue: var(--color-sofi-blue);
  --color-sofi-red: var(--color-sofi-red);
  --color-sofi-purple: var(--color-sofi-purple);

  --color-sofi-text: var(--color-sofi-text);
  --color-sofi-text-muted: var(--color-sofi-text-muted);
  --color-sofi-text-dim: var(--color-sofi-text-dim);

  --font-sans: var(--font-sans);
  --font-heading: var(--font-heading);
  --font-mono: var(--font-mono);
  --font-label: var(--font-label);
}

/* Base dark theme */
html {
  color-scheme: dark;
}

html.light {
  color-scheme: light;
}

body {
  background-color: var(--color-sofi-bg);
  color: var(--color-sofi-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

button,
[role="button"] {
  cursor: pointer;
}

/* Hide focus ring for mouse/touch — keep for keyboard (a11y) */
:focus:not(:focus-visible) {
  outline: none;
}

/* Utility: hide scrollbars while keeping scroll functionality */
@utility scrollbar-hide {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.light ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
}

.light ::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.25);
}
```

- [ ] **Step 2: Verify lint passes**

Run: `pnpm lint`
Expected: "Checked N files. No errors, no warnings."

(Note: `*.css` is in Biome's excluded globs, so lint won't check CSS content — this is a no-op sanity check to ensure the file change doesn't break anything tangential.)

- [ ] **Step 3: Verify app still renders**

Run: `pnpm dev` (keep it running in a separate terminal)
Navigate to `http://localhost:1420/` in a browser.
Expected: app renders in dark mode identically to before. No light mode yet because nothing toggles `.light` on `<html>`.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.css
git commit -m "refactor(theme): split globals.css into :root dark + .light overrides

Moves current @theme values into :root, adds parallel .light block with
light-mode tokens, and uses @theme inline so Tailwind resolves dynamically
at paint time. Terminal background intentionally stays dark in both modes.
Scrollbar colors get a .light override for contrast."
```

---

## Task 3: Create ThemeProvider component

**Files:**
- Create: `src/components/theme/theme-provider.tsx`

- [ ] **Step 1: Create the provider**

Create `src/components/theme/theme-provider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "sofi:theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light");

    if (theme === "system") {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      if (prefersLight) root.classList.add("light");
      return;
    }

    if (theme === "light") root.classList.add("light");
    // "dark" → :root defaults cover it; no class needed.
  }, [theme]);

  // When mode is "system", re-evaluate when the OS preference changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const root = window.document.documentElement;
      root.classList.toggle("light", mq.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const value: ThemeProviderState = {
    theme,
    setTheme: (next) => {
      localStorage.setItem(storageKey, next);
      setThemeState(next);
    },
  };

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export function useTheme(): ThemeProviderState {
  const ctx = useContext(ThemeProviderContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: "Checked N files. No errors, no warnings."

- [ ] **Step 4: Commit**

```bash
git add src/components/theme/theme-provider.tsx
git commit -m "feat(theme): add shadcn-pattern ThemeProvider with useTheme hook

Reuses the canonical shadcn Vite/React theme provider pattern. Sofi-
specific deviation: dark is the :root default, so we only add .light
when light is active (stock shadcn adds both .dark and .light classes).
Supports system / light / dark modes, localStorage persistence, and
re-evaluates on matchMedia change in system mode."
```

---

## Task 4: Wire ThemeProvider into app root

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Add the import and wrap the tree**

Edit `src/main.tsx`. Add this import near the other component imports:

```tsx
import { ThemeProvider } from "@/components/theme/theme-provider";
```

Then modify the render call to wrap the existing tree:

```tsx
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: "Checked N files. No errors, no warnings."

- [ ] **Step 4: Run the e2e test — it should now PASS for the post-hydration cases**

Run: `pnpm test:e2e tests/e2e/theme.spec.ts`
Expected: all four tests PASS. ThemeProvider's `useEffect` applies the class on mount, which happens before Playwright's assertion fires.

If the `system mode + prefers light` test fails because `colorScheme: "light"` isn't being respected, double-check the Playwright context creation in the test.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "feat(theme): mount ThemeProvider in app root

Wraps the app tree between ErrorBoundary and QueryClientProvider so
theme state is available in every route including public login pages."
```

---

## Task 5: Add FOUC prevention script

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the inline script**

Edit `index.html`. After the existing `<link>` tags and before `</head>`, insert this script block:

```html
    <script>
      // Theme pre-hydration: apply .light class before React mounts to
      // prevent FOUC. Mirrors ThemeProvider logic exactly.
      (function () {
        try {
          var stored = localStorage.getItem("sofi:theme");
          var mode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
          var wantsLight =
            mode === "light" ||
            (mode === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
          if (wantsLight) document.documentElement.classList.add("light");
        } catch (_) {
          /* localStorage unavailable (privacy mode) — fall through to :root dark default */
        }
      })();
    </script>
```

So the full `<head>` becomes (order matters — script goes BEFORE the stylesheet `<link>`s are fully loaded so the class is set when CSS parses):

```html
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f0f1a" media="(prefers-color-scheme: dark)" />
    <meta name="theme-color" content="#7c3aed" media="(prefers-color-scheme: light)" />
    <script>
      // Theme pre-hydration: apply .light class before React mounts to
      // prevent FOUC. Mirrors ThemeProvider logic exactly.
      (function () {
        try {
          var stored = localStorage.getItem("sofi:theme");
          var mode = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
          var wantsLight =
            mode === "light" ||
            (mode === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
          if (wantsLight) document.documentElement.classList.add("light");
        } catch (_) {
          /* localStorage unavailable (privacy mode) — fall through to :root dark default */
        }
      })();
    </script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20,400,0" rel="stylesheet" />
    <title>Sofi — Agent Command Center</title>
  </head>
```

- [ ] **Step 2: Verify lint passes**

Run: `pnpm lint`
Expected: "Checked N files. No errors, no warnings."

- [ ] **Step 3: Verify the script runs before React by checking the network tab / visual load**

Run: `pnpm dev`
In a browser, set localStorage manually via devtools console: `localStorage.setItem("sofi:theme", "light")`
Hard refresh the page (Cmd+Shift+R).
Expected: the page loads directly in light mode with no visible flash of dark chrome.

Compare without the script (temporarily git-stash it) — you should briefly see the dark background before React mounts and applies the class. Restore the script.

Stop dev server.

- [ ] **Step 4: Run the e2e test to confirm no regression**

Run: `pnpm test:e2e tests/e2e/theme.spec.ts`
Expected: all four tests PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(theme): add FOUC-prevention inline script

Mirrors ThemeProvider's class logic in vanilla JS, runs synchronously in
<head> before CSS fully applies so the .light class is set on the first
paint. Handles localStorage unavailability (privacy mode) by falling
through to :root dark defaults."
```

---

## Task 6: Build minimal Appearance section in Settings

**Files:**
- Modify: `src/routes/_authenticated/settings/index.tsx`

- [ ] **Step 1: Replace the null stub with the Appearance page**

Replace the entire contents of `src/routes/_authenticated/settings/index.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/cn";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-sofi-text">Settings</h1>
      </header>

      <AppearanceSection />
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const options: { value: "system" | "light" | "dark"; label: string; description: string }[] = [
    { value: "system", label: "System", description: "Follow your operating system" },
    { value: "light", label: "Light", description: "Daylight mode" },
    { value: "dark", label: "Dark", description: "Sofi's default cyberpunk feel" },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-sofi-text">Appearance</h2>
        <p className="text-base text-sofi-text-muted">
          Choose how Sofi looks. System matches your OS preference automatically.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Theme preference"
        className="flex items-center gap-2 rounded-lg border border-sofi-border bg-sofi-elevated p-1"
      >
        {options.map((opt) => {
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-base font-medium transition-colors",
                isActive
                  ? "bg-violet-primary text-white shadow-lg shadow-violet-primary/20"
                  : "text-sofi-text-muted hover:bg-white/5 hover:text-sofi-text",
              )}
            >
              <div>{opt.label}</div>
              <div className="text-base font-normal opacity-70">{opt.description}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify lint passes**

Run: `pnpm lint`
Expected: "Checked N files. No errors, no warnings."

- [ ] **Step 4: Manual verification**

Run: `pnpm tauri dev` (full app, authenticated).
Sign in. Navigate to Settings (gear icon in top bar).
Expected:
- Appearance section renders with three options, current mode highlighted
- Click **Light** → whole app flips to light mode (all `bg-sofi-*` utilities change)
- Click **Dark** → back to dark
- Click **System** → matches your OS preference
- Hard refresh after a choice → preference persists, no flash

Terminal surface (if you open one) should stay dark in all modes.

Stop dev.

- [ ] **Step 5: Commit**

```bash
git add src/routes/_authenticated/settings/index.tsx
git commit -m "feat(theme): build Appearance section in Settings route

Replaces the null-component stub with a minimal settings shell
containing a tri-state Appearance toggle (System / Light / Dark) wired
via the useTheme() hook. Other settings panels (shell preferences,
board settings, account) remain out of scope."
```

---

## Task 7: Final verification — run the full test suite, tsc, lint

**Files:**
- None (verification only)

- [ ] **Step 1: Run full Playwright suite**

Run: `pnpm test:e2e`
Expected: all e2e tests PASS (theme.spec.ts + pre-existing navigation.spec.ts + auth.spec.ts). If any pre-existing test fails for unrelated reasons, note it but do not fix here.

- [ ] **Step 2: Run TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run Biome lint**

Run: `pnpm lint`
Expected: "Checked N files. No errors, no warnings."

- [ ] **Step 4: Smoke-check the spec's Verification checklist**

Walk through `docs/superpowers/specs/2026-04-17-theme-foundation-design.md` § Verification. Confirm:
- Stitch has both "Sofi Dark IDE" + "Sofi Light IDE" (verify by calling `mcp__stitch__list_design_systems` on project `7192466329862115124`)
- `globals.css` has `:root` and `.light` blocks and `@theme inline`
- Toggling to light via the Appearance page applies `.light` class on `<html>`
- `<ThemeProvider>` is in `main.tsx`; `useTheme()` works from `settings/index.tsx`
- First load with cleared localStorage respects OS preference
- Manual toggle persists across hard refresh
- No FOUC on reload
- Terminal stays `#0a0a12` in both modes
- Violet-on-light contrast is ≥ 4.5:1 (use Chrome DevTools > Inspect > Accessibility panel on a `.light`-toggled active pill)

- [ ] **Step 5: Commit if any fixes were needed during verification**

If Step 4 surfaced bugs, fix them and commit:

```bash
git add <specific files>
git commit -m "fix(theme): <specific fix from verification>"
```

If everything passed cleanly, skip this step.

---

## Self-Review

**1. Spec coverage**

| Spec requirement | Task |
|---|---|
| Stitch dual-mode palettes | ✅ Completed in brainstorming (Stitch side, committed in spec) |
| `globals.css` restructured to `:root` + `.light` + `@theme inline` | Task 2 |
| `ThemeProvider` component | Task 3 |
| Wrap app in `ThemeProvider` | Task 4 |
| FOUC prevention script | Task 5 |
| Appearance page in Settings | Task 6 |
| Terminal stays dark in both modes | Task 2 (CSS explicitly omits terminal from `.light`) |
| Scrollbar colors per mode | Task 2 (scrollbar thumb has `.light` override) |
| localStorage persistence | Task 3 (in ThemeProvider), Task 5 (in FOUC script) |
| `matchMedia` system-preference tracking | Task 3 (useEffect listener when `theme === "system"`) |
| All spec verification items checked | Task 7 |

No gaps.

**2. Placeholder scan**

Searched plan for "TBD", "TODO", "implement later", "add appropriate error handling", "similar to Task N". None found. All code blocks are complete.

**3. Type consistency**

- `Theme` type: `"dark" | "light" | "system"` — used consistently in Tasks 3, 6.
- `useTheme()` returns `{ theme, setTheme }` — consumed in Task 6 matches definition in Task 3.
- Storage key `"sofi:theme"` — used consistently in Task 3 (provider default), Task 5 (FOUC script).
- Class name `.light` — used consistently in CSS (Task 2), provider (Task 3), FOUC script (Task 5).

No mismatches.

**4. Open questions resolved**

Spec open questions:
1. Cyan rename → Left as-is per spec default. No action in this plan.
2. FOUC script style → Raw vanilla JS per spec default. Implemented in Task 5.

Both resolved.
