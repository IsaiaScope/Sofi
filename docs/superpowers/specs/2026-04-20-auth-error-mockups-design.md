# Auth + Error Screen Mockups — Design Spec

**Date:** 2026-04-20
**Status:** Draft — awaiting user review before plan generation
**Scope boundary:** Stitch mockup production only. React implementation is a follow-up cycle with its own spec + plan.

## Goal

Produce Stitch mockups for every authentication and error screen in Sofi that move away from the stock shadcn look toward a distinctive cyberpunk **Ops HUD / Command Console** aesthetic aligned with the product's "Agent Command Center" identity. Deliverable is approved mockups in Stitch — not code.

## Scope

Nine primary screens, two modes (dark + light) = **18 primary mockups**, plus **3 state variants** = **21 Stitch artifacts total**.

### Calm screens (violet primary, cyan chrome) — 6

1. **Login** — `/login` — email/password + Google/GitHub OAuth + "email not verified" inline alert variant.
2. **Register** — `/register` — display name (optional) + email + password + confirm.
3. **Check email** — `/check-email?email=…` — post-register verification-pending state.
4. **Verify success** — `/verify-success` — reached via `sofi://verify-success` deep link after clicking verification email.
5. **Password reset request** — `/recover` — NEW. Email input → dispatches reset link. Backend endpoint exists (`/auth/password/reset/`); no frontend today.
6. **Password reset confirm** — `/recover/confirm?uid=…&token=…` — NEW. Receives token in URL, sets new password. Backend endpoint exists (`/auth/password/reset/confirm/`).

### Fault screens (violet primary, amber chrome) — 2

7. **Global error boundary** — React component-error fallback; replaces `src/components/error-boundary.tsx` visual.
8. **Route error fallback** — TanStack route loader / async error fallback; replaces the inline component in `src/routes/__root.tsx:33`.

### Shell — 1

9. **Auth shell wrapper** — existing `src/features/auth/components/auth-shell.tsx`. Fully defined by the shared chassis (Section 1); no separate mockup required.

### State variants — 3

- Login "email not verified" inline alert variant.
- Recover-confirm success state.
- Recover-confirm invalid-token fault state (the only case where a calm screen degrades to fault chrome without changing routes).

### Explicitly out of scope

- Password change (while logged in) — backend endpoint exists (`/auth/password/change/`), but it's a Settings surface, not auth; separate design cycle.
- Logout-all-sessions UI — backend endpoint exists (`/auth/logoutall/`); Settings-adjacent.
- 2FA — no backend support.
- React implementation of any of the above — separate follow-up.

## Section 1 — Shared chassis

Every screen sits inside the same viewport chrome. The chassis is the load-bearing design decision; individual screens are payload.

### 1a. Viewport layers (bottom → top)

1. **Background plane** — dark: `#0a0a12` (`--color-sofi-terminal`); light: `#faf9ff` (`--color-sofi-bg`).
2. **Grid overlay** — 32px × 32px, 1px lines; dark: 6% opacity, light: 4% opacity.
3. **Scanline overlay** — 2px horizontal at 3% opacity in dark mode; **dropped entirely in light mode** (reads as "dirty screen" on off-white).
4. **Corner brackets** — four L-shaped brackets at viewport corners, ~40px legs, 2px stroke. Calm: cyan `#06b6d4`. Fault: amber `#f97316` (matches fault chrome accent; red `#ef4444` is reserved for the body one-liner only). The strongest visual signature of the whole system.
5. **Content layer** — form card + ambient readouts.

### 1b. Ambient readouts

Always-on, deliberately static text that makes the viewport feel alive without animating. **All readouts 16px mono minimum** (per repo-wide min-text-size rule).

- **Top-left:** wordmark SVG + `SOFI // AGENT COMMAND CENTER` in mono, violet.
- **Top-right:** `NODE: LOCAL · BUILD: v{app.version}` in muted mono + theme-toggle button.
- **Bottom-left:** contextual diegetic status line (per-screen; see Section 2 copy table). Cyan in calm mode, amber in fault.
- **Bottom-right:** pulse dot + `UPLINK OK` / `UPLINK DOWN`. Tied to online status if easy; decorative otherwise.

### 1c. Form card

- Width ~28rem (preserves current auth-shell sizing).
- Sharp corners with 8px chamfer on one corner (or 1/3-strength corner brackets — finalized in Stitch).
- 1px stroke border in accent color at ~30% opacity; intensifies to ~60% on focus-within.
- Low-opacity bloom: violet (calm) / amber (fault), ~20px spread. **Dropped in light mode** (replaced with higher-opacity crisp stroke).
- Header strip inside card: `▸ MODULE / AUTH` (or `/ RECOVERY`, `/ FAULT`) in 16px mono, muted, with small colored pulse dot.
- Inputs use Base UI `Field` + `Input` + custom `PasswordInput`. Labels in 16px mono small-caps.

### 1d. Typography

- **Mono** (readouts, labels, status, copy flourishes): JetBrains Mono or equivalent. 16px everywhere.
- **Display** (screen headings — `AUTHORIZE OPERATOR`, etc.): existing display font, heavier weight, wide tracking, small-caps. 28–32px.
- **Body** (multi-line explanatory copy): existing sans, 16px.

### 1e. Accent rule

- **Calm (7 of 9):** violet `#7c3aed` for primary actions and focused-input borders; cyan `#06b6d4` for chrome (brackets, readouts, glow edges). Violet and cyan never share an element.
- **Fault (2 of 9):** chrome flips cyan → amber `#f97316`. Card stroke, bloom, corner brackets all amber. Violet primary-action stays violet (reload is still an action, not a warning). Body copy uses red `#ef4444` for the short failure line.

## Section 2 — Per-screen content + diegetic copy

Copy tone: **tasteful diegetic** — headings/buttons/feedback in operator-speak, field labels stay conventional-ish (`EMAIL`, `PASSWORD`) so muscle memory survives.

### Copy table

| Screen | Heading | Primary button | Status bar |
|---|---|---|---|
| Login | `AUTHORIZE OPERATOR` | `SIGN IN` | `> awaiting credentials` |
| Register | `REQUEST ACCESS` | `CREATE OPERATOR` | `> registering operator` |
| Check email | `INBOX INCOMING` | `BACK TO SIGN IN` (outline) | `> awaiting verification` |
| Verify success | `UPLINK ESTABLISHED` | `SIGN IN` | `> session verified` |
| Recover | `RECOVER ACCESS` | `DISPATCH RESET LINK` | `> awaiting identifier` |
| Recover confirm | `RESET CREDENTIAL` | `COMMIT NEW CREDENTIAL` | `> resetting credential` |
| Error boundary | `SYSTEM FAULT` | `RELOAD` | `> fault detected // scope: runtime` |
| Route error | `ROUTE FAULT` | `RELOAD` | `> fault detected // scope: route` |

### Per-screen notes

**Login**
- Fields: `EMAIL`, `PASSWORD`.
- Link under password: `Forgot access?` → `/recover` (small, cyan, 16px mono).
- OR divider, then two outline OAuth buttons: `CONTINUE VIA GOOGLE` / `CONTINUE VIA GITHUB` with the existing brand marks.
- Footer: `New operator? Request access` → `/register`.
- **State variant — email-not-verified:** inline alert strip above the form in amber chrome (inline, not full-screen fault): `CREDENTIAL VALID // EMAIL UNVERIFIED` + `RESEND VERIFICATION LINK` button. Status bar switches to `> verification required`.

**Register**
- Fields: `DISPLAY NAME` (optional), `EMAIL`, `PASSWORD`, `CONFIRM PASSWORD`.
- Sub-heading: `Enroll as an operator. Verification required.`
- Footer: `Already enrolled? Authorize` → `/login`.

**Check email**
- Sub: `Verification link dispatched to {email}.`
- Body paragraph: tight 2 lines including spam-folder hint.
- Primary is an outline button (not violet-filled) because the action is return-to-start, not forward-motion.

**Verify success**
- Glyph: cyan check inside a cyan bracket-ring (not a filled circle — bracket chrome consistent with viewport).
- Sub: `Email verified. Proceed to command center.`

**Password reset request (`/recover`)**
- Sub: `Enter your operator email. A reset link will be dispatched.`
- Footer: `Remember credentials? Authorize` → `/login`.
- **Success state (same route, swapped content):** heading `LINK DISPATCHED`, sub `If the email is registered, a reset link was sent.` (deliberately ambiguous — no email enumeration). Primary: `BACK TO SIGN IN`.

**Password reset confirm (`/recover/confirm?uid=…&token=…`)**
- Fields: `NEW PASSWORD`, `CONFIRM PASSWORD`.
- Sub: `Set a new access key.`
- **Success state:** heading `CREDENTIAL RESET`, sub `Authorize with your new key.`, primary `SIGN IN`. Status `> credential reset`.
- **Invalid-token state (fault palette, same screen):** heading `LINK EXPIRED`, sub `This reset link is no longer valid. Request a new one.`, primary `REQUEST NEW LINK` → `/recover`. Status `> fault detected // scope: token`. Only case where a calm screen degrades to fault chrome without a route change.

**Global error boundary**
- Glyph: amber warning inside an amber bracket-ring (mirror of verify-success's cyan check).
- Sub: `Core process unresponsive. Reload to recover.`
- Primary: `RELOAD` (violet; it's an action, not a warning).
- **Dev-only trace expander** below the primary, in 16px mono muted: `▸ TRACE`. Expanded form shows `error.message` + first 3 stack frames. Gated on `import.meta.env.DEV`, hidden in production builds. Explicit guardrail: unit test covering the gating when implemented.

**Route error fallback**
- Same chassis as error boundary.
- Sub: if `error instanceof Error` → render `error.message` (one line, truncated with expander); else `An unexpected error occurred.`.
- Dev-only trace expander identical to error boundary.

## Section 3 — Dark ↔ Light mode diffs

Chassis structure is identical across modes. Diffs:

### Overlays

| Layer | Dark | Light |
|---|---|---|
| Base plane | `#0a0a12` | `#faf9ff` |
| Grid overlay | 6% opacity | 4% opacity |
| Scanline overlay | 3% opacity | **dropped** |
| Glow/bloom | ~20px spread, low opacity | **dropped** — replaced with higher-opacity crisp 1px stroke |

### Accent swaps (per existing seed-only contract in `reference_sofi_design_registry`)

| Token | Dark | Light (AA-adjusted) |
|---|---|---|
| Violet primary | `#7c3aed` | `#6b21d8` |
| Cyan chrome | `#06b6d4` | `#0891b2` |
| Amber chrome | `#f97316` | `#b45309` |
| Red body | `#ef4444` | may need `--color-sofi-red-strong` if AA fails on off-white (TBD during Stitch review) |

All exist in the current `--color-sofi-*` layer except the potential red-strong, which will be added to `src/styles/globals.css` only if Stitch review flags AA failure.

### Mode intent

Dark mode reads as "command console" (black with glowing chrome). Light mode reads as "engineering blueprint" (off-white with crisp strokes). Deliberately different moods under the same chassis. Failure mode to avoid: forcing dark-mode neon into light mode, producing washed-out glows that read as broken rather than designed.

## Section 4 — Stitch generation plan

### Assets (from `reference_sofi_design_registry`)

- **Project:** `7192466329862115124` (Sofi — Agent Command Center)
- **Dark design system:** `assets/10290379565925771214` (Sofi Dark IDE)
- **Light design system:** `assets/12407330345873850823` (Sofi Light IDE)

### Phases

**Phase 1 — chassis validation (1 screen, dark).** Generate Login (dark) first. Review is *only about the chassis* (brackets, readouts, status bar, grid, card frame). Iterate on this one screen until chassis is signed off. Login chosen because it has the most elements; if chassis works here, it works everywhere.

**Phase 2 — calm screens batch (5 screens, dark).** Register, Check email, Verify success, Recover, Recover confirm — batched with the approved chassis described in every prompt.

**Phase 3 — fault screens (2 screens, dark).** Global error boundary, Route error fallback. Amber accent swap.

**Phase 4 — light-mode pass (9 screens, light).** Each approved dark screen gets a light counterpart via the Sofi Light IDE design system. Mechanical accent swap per Section 3. Main revision risk: glow/stroke intensity.

**Phase 5 — state variants (3 artifacts).** Login "email-not-verified" inline, Recover-confirm success, Recover-confirm invalid-token fault. Generated on top of their primary screens.

### Stitch ↔ code contract

Per the existing seed-only rule in `reference_sofi_design_registry`:

- Sofi does **not** import Stitch M3 `namedColors`.
- During later implementation (separate cycle), I'll map Stitch tokens back to `--color-sofi-*` semantic tokens **by role, not by hex**.
- Any color Stitch uses that has no `--color-sofi-*` equivalent is flagged — either add a semantic token or change the design.

### Definition of done (this task)

- 18 primary mockups in Stitch, both modes, user-approved.
- 3 state-variant mockups user-approved.
- This spec merged to `dev`.
- Stitch asset IDs recorded in the spec or registry.

Explicitly **not** in scope for this task: any React code changes.

### Known risks

- **Stitch hallucinating chrome** — decorative additions that drift from spec. Mitigation: explicit repeated prompts + `edit_screens` to strip additions.
- **Text size drift** — Stitch defaults often shrink labels; min 16px rule must be re-enforced per screen.
- **Light-mode glow survival** — Stitch may keep glow effects when generating light variants. Candidate #1 for Phase 4 revision rounds.
