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

- **Calm (7 of 9):** violet `#7c3aed` is the **anchor color** — it appears on (1) the primary button, (2) the SOFI wordmark text in the top-left readout, (3) the screen heading (display font at 30px), and (4) the small pulse dot inside the card's header strip. Cyan `#06b6d4` is the **instrument chrome** color — corner brackets, ambient readouts (except the wordmark), field labels, input borders, OAuth outline-button borders, links, dividers, and glow edges. Violet and cyan never share an element. Focused-input borders intensify the cyan (not shift to violet).
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

## Section 5 — Shared Layout Contract

Derived from diffing the two approved screens (Login + Register, 2026-04-20). These are the canonical structural rules every subsequent screen must satisfy. If Stitch output violates any, apply `edit_screens` before accepting.

**Responsiveness policy:** Sofi is a Tauri desktop app with an ~800px minimum window width. Auth/error screens are static-layout with a narrow clamp; they do not reflow across breakpoints. Below 768px (outside Sofi's supported range) the ambient chrome bars collapse to hidden rather than overlap the card.

### The 17 rules

1. **Viewport background:** `bg-[#0a0a12]` — hardcoded hex, no gradient.
2. **Grid overlay:** `background-image: linear-gradient(to right, rgba(6,182,212,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.06) 1px, transparent 1px); background-size: 32px 32px;` — cyan 6% opacity, not white.
3. **Scanline overlay:** `linear-gradient(transparent 50%, rgba(0,0,0,0.25) 50%) 100% 4px` with element `opacity-30`; `pointer-events: none`.
4. **Corner brackets:** 40×40px, `border: 2px solid #06b6d4`, `opacity: 0.8`, offset `2rem` (32px) from each viewport edge, no border-radius. Four L-shapes only — one per corner.
5. **Ambient readouts — structural pattern:** two `fixed` full-width bars using `flex justify-between`. Top: `fixed top-0 left-0 w-full px-8 py-6 flex justify-between items-start z-10 pointer-events-none`. Bottom mirrors with `bottom-0 items-end`. Do NOT use 4 separate `absolute` elements.
6. **Ambient readout typography:** `font-mono text-[16px]`. Top-left: `text-[#7c3aed]` (the SOFI wordmark anchor). Top-right: muted tracking-widest. Bottom-left: `text-[#06b6d4] uppercase tracking-widest` (status line). Bottom-right: `text-[#06b6d4] tracking-widest` + 10px cyan pulse dot.
7. **Card width:** `max-w-[28rem] w-full` — clamps on narrower viewports without overflow. No fixed width.
8. **Card background + border:** `bg-[#111126]` (surface-container-low) + `border border-[#06b6d4]/30` — 1px cyan stroke at 30% opacity.
9. **Card chamfer:** `clip-path: polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)` — 16px cut on bottom-right corner only. All other corners 0 border-radius.
10. **Card glow:** `shadow-[0_0_40px_rgba(124,58,237,0.15)]` applied to the card element directly — no extra wrapper div for the bloom.
11. **Card padding + internal flow:** `p-8` uniform 2rem padding, content arranged as `flex flex-col gap-6`. No segmented `pt-8 pb-4 pt-2` padding.
12. **Header strip:** `font-mono text-[16px] text-[#727297] uppercase tracking-wider pb-2 border-b border-[#06b6d4]/20`, with a leading `w-1.5 h-1.5 bg-[#7c3aed] animate-pulse` violet dot. Minimum 16px — no `text-xs` fallback.
13. **Screen heading:** `font-headline text-[30px] font-black text-[#7c3aed] tracking-widest uppercase`. Violet anchor. No `font-variant: small-caps`, no `tracking-tight`.
14. **Form fields:** `space-y-6` between fields. Each field = label + input stack with `space-y-2`. Label: `font-mono text-[16px] text-[#a8a7cf] uppercase tracking-wider`. Input: `w-full px-4 py-3 bg-[#0a0a12] border border-[#06b6d4]/30 font-mono text-[16px]` + `focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4]` + `border-radius: 0`.
15. **Primary button:** `w-full py-4 bg-[#7c3aed] text-white font-mono text-[16px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:bg-[#8a4cfc] transition-colors` + `border-radius: 0`. No pill shape, glow on rest state.
16. **Footer / secondary text:** `font-mono text-[16px] text-[#727297]`. Inline links: `text-[#06b6d4] hover:underline underline-offset-4`. **Absolute min: 16px everywhere.** No `text-sm`, no `text-xs`.
17. **Responsiveness clamp:** root element carries `min-w-[48rem]`; ambient readout bars carry `max-sm:hidden` (hide below 768px). Card itself handles its own reflow via Rule 7.

### Known contract violations in the two reference screens (accepted as-is, but fixed in subsequent generations)

- **Register** (`c5e1937bdbcd4b67a40ce9f5fe69ff86`) — header strip uses `text-xs` (~12px), labels use `text-[10px]`, footer uses `text-sm` (~14px). All below the 16px minimum. Also uses `bg-surface` instead of the hardcoded `#111126`.
- **Login** (`4aa2465606c543a683058719fae30fa9`) — uses white (not cyan) grid overlay at 0.06 opacity; corner brackets offset at `1.25rem` (20px) instead of `2rem`; scanline via element opacity-30 on a darker base — approximately correct but structurally differs.

These deltas are recorded for reference. The contract above supersedes them; new screens must satisfy the 17 rules. Translation to React implementation (separate cycle) will align Login + Register with the contract at the code level.

## Stitch asset IDs

- Login (dark): `1cdf40941b094a9590a85411649c7835` — card-style-unified edit of earlier `4aa2465606c543a683058719fae30fa9`; card frame now matches Register (solid `#111126`, no backdrop-blur, box-shadow glow replacing separate bloom div, `overflow-hidden`). Content inside card unchanged. User-approved 2026-04-20.
- Register (dark): `c5e1937bdbcd4b67a40ce9f5fe69ff86` — user-selected 2026-04-20
