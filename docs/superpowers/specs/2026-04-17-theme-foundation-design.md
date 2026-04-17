# Sofi — Theme Foundation (Dual-Mode)

**Date:** 2026-04-17
**Status:** Draft for user review
**Scope:** Establish light mode alongside dark mode — on Stitch, in `globals.css`, and as an in-app user preference with OS-default fallback. Prerequisite for the top-bar-at-breakpoints and scrollbar specs that follow.

## Context

Sofi currently ships dark-only. The Stitch project (`7192466329862115124`) has one design system ("Sofi Dark IDE", asset `10290379565925771214`, version 3) with a dark M3 palette. `src/styles/globals.css` declares the matching tokens under `@theme` with hardcoded dark values.

The user's goal (stated 2026-04-17): have **both** color versions available on Stitch, then carry them into code so every future design (top bar, scrollbar, and every feature that follows) can be rendered in either mode.

## Stitch side — completed during brainstorming

### Design systems on project 7192466329862115124

| Asset ID | Display name | Color mode | Primary seed | Neutral seed | Version |
|---|---|---|---|---|---|
| `10290379565925771214` | Sofi Dark IDE | DARK | #7c3aed | #1e1e2e | 3 |
| `12407330345873850823` | Sofi Light IDE | LIGHT | #7c3aed | #faf9ff | 1 |

Both share:
- `colorVariant`: `TONAL_SPOT` (M3 dynamic palette)
- `customColor` / `overridePrimaryColor`: `#7c3aed` (violet — brand anchor)
- `overrideSecondaryColor`: `#3b82f6` (blue — info accents)
- `overrideTertiaryColor`: `#f97316` (orange — Git)
- `roundness`: `ROUND_FULL`
- Fonts: Inter (body), Public Sans (headline), Space Grotesk (label)

Only `colorMode` and `overrideNeutralColor` differ. This is the intended minimal delta — M3 regenerates the tone ramps automatically.

### M3 palette materialization caveat

Stitch's `list_design_systems` / `get_*` MCP endpoints only return computed `namedColors` for palettes that have been rendered in the Stitch UI. Newly-created palettes return an empty `namedColors` object until they've been "touched" by the UI. The light palette has been viewed by the user and confirmed — the Stitch UI holds the authoritative hex values. If we need them programmatically later, we re-pull after each UI render.

## Code side — to implement

### Token architecture

All theme tokens live in `src/styles/globals.css`. Tailwind 4's `@theme inline` pattern resolves tokens at paint time from CSS custom properties defined at `:root` (dark default) and `.light` (override). Class-mode switching matches shadcn conventions and Tailwind's default `dark:` variant mechanism.

```css
@import "tailwindcss";

/* Dark = default. Matches current behavior; users get dark on first load when no class is set. */
:root {
  --color-sofi-bg: #0f0f1a;
  --color-sofi-surface: #12121e;
  --color-sofi-elevated: #1e1e30;
  --color-sofi-border: 255 255 255 / 0.08;  /* RGB triplet for alpha composition */
  --color-violet-primary: #7c3aed;
  /* ... all dark tokens from current globals.css ... */
}

/* ThemeProvider adds `.light` class to <html> when user selects light mode. */
.light {
  --color-sofi-bg: #faf9ff;
  --color-sofi-surface: #ffffff;
  --color-sofi-elevated: #eeecf5;
  --color-sofi-border: 0 0 0 / 0.08;
  --color-violet-primary: #6b21d8;
  /* ... light overrides ... */
}

@theme inline {
  --color-sofi-bg: var(--color-sofi-bg);
  --color-sofi-surface: var(--color-sofi-surface);
  /* ... etc — tells Tailwind to resolve dynamically ... */
}
```

### Token mapping (dark ↔ light)

Light-mode hex values are **predicted** from M3 TONAL_SPOT. They will be reconciled against Stitch "Sofi Light IDE" during implementation by visual comparison in the Stitch UI. Stitch wins per the project workflow rule.

| Sofi token | Dark | Light (predicted) | M3 role |
|---|---|---|---|
| `--color-sofi-bg` | `#0f0f1a` | `#faf9ff` | background / surface |
| `--color-sofi-surface` | `#12121e` | `#ffffff` | surface_container_lowest |
| `--color-sofi-elevated` | `#1e1e30` | `#eeecf5` | surface_container |
| `--color-sofi-terminal` | `#0a0a12` | `#0a0a12` (unchanged) | special — see Terminal exception |
| `--color-sofi-border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | outline (derived) |
| `--color-violet-primary` | `#7c3aed` | `#6b21d8` | primary |
| `--color-violet-hover` | `#8b5cf6` | `#7c3aed` | primary_dim |
| `--color-violet-muted` | `rgba(124,58,237,0.15)` | `rgba(107,33,216,0.12)` | primary_container α |
| `--color-cyan-accent` | `#06b6d4` | `#0891b2` | (no M3 seed — hand-tuned) |
| `--color-cyan-hover` | `#22d3ee` | `#06b6d4` | (no M3 seed) |
| `--color-sofi-green` | `#10b981` | `#059669` | (no M3 seed — hand-tuned for 4.5:1 on light) |
| `--color-sofi-orange` | `#f97316` | `#b45309` | tertiary |
| `--color-sofi-blue` | `#06b6d4` | `#1e5bd6` | secondary |
| `--color-sofi-red` | `#ef4444` | `#dc2626` | error |
| `--color-sofi-purple` | `#8b5cf6` | `#7c3aed` | primary_dim |
| `--color-sofi-text` | `#e2e8f0` | `#1e1e2e` | on_surface |
| `--color-sofi-text-muted` | `rgba(255,255,255,0.5)` | `rgba(0,0,0,0.55)` | on_surface_variant |
| `--color-sofi-text-dim` | `rgba(255,255,255,0.3)` | `rgba(0,0,0,0.4)` | outline |

### Terminal exception

`--color-sofi-terminal` stays `#0a0a12` in both modes. Code output and terminal text need a dark backdrop regardless of app mode — flipping the terminal to white would break readability, break the mental model of "the terminal is always the terminal", and conflict with xterm.js's dark-optimized default theme.

Xterm theme is configured separately in the terminal feature (outside this spec's scope).

### Mode selection

Three user-visible modes: `"system"`, `"light"`, `"dark"`.

| Mode | Behavior |
|---|---|
| `"system"` | Follows OS via `matchMedia("(prefers-color-scheme: light)")`. **Default on first run.** |
| `"light"` | Adds `.light` class to `<html>`. |
| `"dark"` | Removes `.light` class, falls through to `:root` dark defaults. |

### Provider + persistence — shadcn `ThemeProvider`

We reuse shadcn's canonical Vite/React theme provider (documented at [ui.shadcn.com/docs/dark-mode/vite](https://ui.shadcn.com/docs/dark-mode/vite)) rather than rolling our own Zustand store. It's ~40 lines of React Context + localStorage + matchMedia, battle-tested across the shadcn ecosystem.

New file `src/components/theme/theme-provider.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "sofi:theme",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
      // Dark is the :root default — only add .light when needed.
      if (systemTheme === "light") root.classList.add("light");
      return;
    }
    if (theme === "light") root.classList.add("light");
    // "dark" → no class needed; :root defaults cover it.
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
```

**Sofi-specific deviation from the canonical shadcn version:** dark is our `:root` default, so we add the `.light` class only when light is active. Stock shadcn adds both `.light` *and* `.dark` classes. Ours is slimmer and avoids an unnecessary class on `<html>` 99% of the time.

The provider wraps the app in `src/main.tsx` above `QueryClientProvider` / `RouterProvider`.

### Mode switcher UI

The Settings route `/_authenticated/settings/` currently renders `null`. This spec includes a **minimal shell**: one full-width page with a single "Appearance" section containing a tri-state segmented control (System / Light / Dark). Implemented with existing shadcn/ui primitives. Other settings panels (shell preferences, board settings, account) are separate specs.

A quick-toggle in the top bar is **deferred** to the top-bar redesign spec — top bar chrome is being redesigned for breakpoints and the toggle's responsive placement belongs there.

## Files

### New
- `src/components/theme/theme-provider.tsx` — shadcn-pattern `ThemeProvider` + `useTheme` hook

### Modified
- `src/styles/globals.css` — move dark values into `:root`, add `.light` block, wrap token declarations in `@theme inline`
- `src/main.tsx` — wrap app root in `<ThemeProvider>` above existing providers
- `index.html` — inline `<script>` head-tag that reads `localStorage["sofi:theme"]` and toggles the `.light` class on `<html>` before first paint (FOUC prevention)
- `src/routes/_authenticated/settings/index.tsx` — replace `component: () => null` stub with the minimal Appearance page (segmented control wired via `useTheme()`)

### Unchanged
- All feature components (`kanban`, `terminal`, `git`, `agents`, `auth`). They already consume `--color-sofi-*` tokens, so they automatically theme. Audit for light-mode visual regressions is **out of scope** for this spec.

## Non-goals (deferred)

1. Full audit of every component for light-mode correctness. We set the tokens; individual feature polish comes later per feature.
2. Top-bar quick-toggle — deferred to top-bar spec.
3. Scrollbar redesign — separate spec.
4. Cyan treatment under M3 — cyan is not a seed slot. If we want it dynamic, we'd have to abandon tertiary=orange. Keeping cyan as a hand-tuned constant for now.
5. Focus-ring color variation — follows `primary` for now.

## Verification

- [ ] Stitch project `7192466329862115124` has two design systems: "Sofi Dark IDE" and "Sofi Light IDE"
- [ ] `src/styles/globals.css` declares tokens under `:root` and `.light`, and uses `@theme inline`
- [ ] `<html class="light">` flips all `bg-sofi-*` / `text-sofi-*` utilities correctly
- [ ] `<ThemeProvider>` wraps the app in `src/main.tsx` and `useTheme()` hook is consumable from any component
- [ ] First load with no localStorage respects OS `prefers-color-scheme`
- [ ] Manual toggle persists across hard refresh
- [ ] No flash of wrong theme on load (FOUC)
- [ ] Terminal background stays `#0a0a12` in both modes
- [ ] Violet-on-light active pill contrast ≥ 4.5:1 (measure with a11y tool)
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes

## Open questions for plan phase

1. Should `cyan-*` tokens be renamed to align with M3 vocabulary (e.g., `--color-accent`)? Leaving as-is to avoid disruption unless you want the rename bundled in.
2. FOUC inline script: raw vanilla JS in `index.html` head (simpler, no build step) vs a small module loaded via Vite (type-safe but adds an import). Default: raw JS (one-shot, pre-hydration — best practice for theme hydration).

## References

- Stitch project: `7192466329862115124` ("Sofi — Agent Command Center")
- Stitch design systems: `assets/10290379565925771214` (dark v3), `assets/12407330345873850823` (light v1)
- Current globals: `src/styles/globals.css`
- Prior related spec: `docs/superpowers/specs/2026-04-15-navigation-redesign-design.md`
- User memory: `feedback_stitch_first_workflow.md`, `project_sofi_theme_and_breakpoints.md`
