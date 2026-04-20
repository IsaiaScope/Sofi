# Auth + Error Screen Mockups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce 21 user-approved Stitch mockups (9 primary screens × 2 modes + 3 state variants) implementing the Ops HUD / Command Console design from `docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md`.

**Architecture:** Iterative Stitch generation across 5 phases. Phase 1 validates the shared chassis on Login (dark) as the single hardest screen; Phases 2–5 batch the remaining screens using the approved chassis. Every prompt embeds the same chassis description to minimize Stitch drift. Asset IDs are recorded back into the spec at the end.

**Tech Stack:** Stitch MCP (`generate_screen_from_text`, `edit_screens`, `generate_variants`, `get_screen`, `list_screens`), `GEMINI_3_1_PRO` model, `DESKTOP` device type, Sofi Stitch project `7192466329862115124`, design systems `10290379565925771214` (Sofi Dark IDE) and `12407330345873850823` (Sofi Light IDE).

---

## Shared chassis prompt block

Every generation prompt in this plan embeds the following chassis paragraph verbatim. This is the load-bearing text that keeps Stitch from drifting across screens.

````text
Apply the "Sofi Dark IDE" design system (asset id 10290379565925771214) [OR "Sofi Light IDE" asset id 12407330345873850823 for light variants]. Viewport is a full-screen dark cyberpunk "Agent Command Center" console [OR off-white engineering blueprint for light]. Background layers bottom-to-top: solid plane (#0a0a12 dark / #faf9ff light), a 32px × 32px grid overlay at 6% opacity (dark) or 4% opacity (light) with 1px lines, and in dark mode only a 2px horizontal scanline overlay at 3% opacity. Four L-shaped corner brackets at the viewport corners, ~40px legs, 2px stroke, cyan (#06b6d4 dark / #0891b2 light) for calm screens or amber (#f97316 dark / #b45309 light) for fault screens. Ambient readouts in 16px mono: top-left shows a small Sofi wordmark glyph plus "SOFI // AGENT COMMAND CENTER" in violet (#7c3aed dark / #6b21d8 light); top-right shows "NODE: LOCAL · BUILD: v0.1.0" in muted mono next to a theme-toggle button; bottom-left shows the contextual status line {STATUS_LINE} in cyan (calm) or amber (fault); bottom-right shows a small pulse dot plus "UPLINK OK". Center a ~28rem-wide form card. The card has a 1px stroke border in the accent color at ~30% opacity, sharp corners with one 8px corner chamfer, and in dark mode a low-opacity ~20px bloom in violet (calm) or amber (fault); light mode drops the bloom and uses a higher-opacity crisp stroke instead. Inside the card, at the top, a header strip "▸ MODULE / {MODULE}" in 16px mono muted with a small colored pulse dot. Typography rules: all text minimum 16px; labels and status in mono small-caps; screen heading in display font (28-32px, heavy weight, wide tracking, small-caps); body paragraphs in sans 16px. Form fields use rectangular inputs with 1px borders in the accent color at low opacity; focused border intensifies to ~60%. Primary button is a solid violet (#7c3aed dark / #6b21d8 light) rectangle with mono small-caps label. Outline secondary buttons use a 1px accent-color border with transparent fill. The overall feel is a Blade Runner / mission-control instrument panel — not soft, not rounded, not shadcn. Device type DESKTOP.
````

`{STATUS_LINE}` and `{MODULE}` are replaced per screen (see per-screen sections below).

---

## Task 0 — Pre-flight verification

**Goal:** Confirm project + design systems + existing screens before generating anything new.

- [ ] **Step 1: List existing screens to know starting state.**

Call:

```text
mcp__stitch__list_screens
  projectId: "7192466329862115124"
```

Expected: JSON listing any pre-existing screens in the Sofi project. Record existing screen IDs so new mockups are distinguishable.

- [ ] **Step 2: List design systems to verify the two expected assets.**

Call:

```text
mcp__stitch__list_design_systems
  projectId: "7192466329862115124"
```

Expected: response includes at minimum two design systems — one matching `Sofi Dark IDE` / asset id `10290379565925771214`, one matching `Sofi Light IDE` / asset id `12407330345873850823`. If either is missing, STOP and surface to user — the spec assumes both exist.

- [ ] **Step 3: Record current state to plan notes.**

Append a short "Pre-flight state" section to the bottom of this plan file with the screen count, existing screen IDs (if any), and design-system IDs confirmed. No commit yet; this is a working note.

---

## Task 1 — Phase 1: Chassis validation on Login (dark)

**Goal:** Generate Login (dark) as the single screen the user reviews purely for chassis correctness. Iterate only this screen until chassis is signed off. Content drift is acceptable at this stage; chrome is not.

**Files touched:** `docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md` (to append Stitch asset IDs at end of task)

- [ ] **Step 1: Generate Login (dark).**

Call `mcp__stitch__generate_screen_from_text` with:

```text
projectId: "7192466329862115124"
modelId: "GEMINI_3_1_PRO"
deviceType: "DESKTOP"
prompt:
"Screen name: Login (dark).

{CHASSIS_PARAGRAPH — using Sofi Dark IDE, calm cyan accents, {STATUS_LINE}='> awaiting credentials', {MODULE}='AUTH'}

Card content, top-to-bottom:
- Header strip: '▸ MODULE / AUTH' with small violet pulse dot, 16px mono muted.
- Screen heading: 'AUTHORIZE OPERATOR' in display font, 30px, wide tracking, small-caps, violet.
- Field 1: label 'EMAIL' in 16px mono small-caps muted; rectangular input with cyan border at low opacity, placeholder 'operator@domain'.
- Field 2: label 'PASSWORD' in 16px mono small-caps muted; rectangular input with cyan border, masked value shown as dots; small show/hide eye icon on the right.
- Below password, right-aligned small link in 16px mono cyan: 'Forgot access?'.
- Primary button, full card width, solid violet: 'SIGN IN' in 16px mono small-caps.
- Horizontal divider with the text 'OR' in 16px mono muted, split by a thin cyan rule on each side.
- Two outline buttons, each full card width, 1px cyan border, transparent fill, 16px mono small-caps labels: 'CONTINUE VIA GOOGLE' with a small Google mark on the left; 'CONTINUE VIA GITHUB' with a small GitHub mark on the left.
- Footer line in 16px mono, muted: 'New operator? ' followed by the cyan link 'Request access'.

Critical rules: absolutely no rounded pill buttons; no shadcn-style soft shadows; no gradients other than the bloom; every text element at least 16px; the card and viewport both feel like industrial control chrome."
```

Expected: Stitch returns a new screen ID and htmlCode after 1–5 minutes. Record the screen ID as `LOGIN_DARK_ID`.

- [ ] **Step 2: Fetch the generated screen and inspect htmlCode briefly.**

Call:

```text
mcp__stitch__get_screen
  name: "projects/7192466329862115124/screens/{LOGIN_DARK_ID}"
  projectId: "7192466329862115124"
  screenId: "{LOGIN_DARK_ID}"
```

Expected: screen object with `htmlCode` field. Scan htmlCode for obvious drift: any `border-radius` > 12px on buttons, any text size < 16px, missing corner brackets, missing ambient readouts. If drift present, skip to Step 3. Otherwise skip to Step 4.

- [ ] **Step 3: (Only if drift) Correct with edit_screens.**

Call:

```text
mcp__stitch__edit_screens
  projectId: "7192466329862115124"
  selectedScreenIds: ["{LOGIN_DARK_ID}"]
  modelId: "GEMINI_3_1_PRO"
  prompt:
"Keep the exact same content and layout. Strictly enforce: every text element minimum 16px, no element uses border-radius greater than 4px (except the 8px card chamfer corner), restore or add the four corner brackets at viewport corners if missing, restore the four ambient readouts (top-left wordmark + name, top-right build label + theme toggle, bottom-left '> awaiting credentials', bottom-right 'UPLINK OK' pulse dot), ensure the grid and scanline overlays are present on the background, use cyan #06b6d4 for chrome and violet #7c3aed for primary actions."
```

Repeat this step up to 2 times if drift persists. If still drifting after 2 edits, STOP and surface to user — the prompt likely needs restructuring.

- [ ] **Step 4: Present the Stitch URL to the user for chassis review.**

Output a message to the user with the screen URL (format: `https://stitch.withgoogle.com/projects/7192466329862115124/screens/{LOGIN_DARK_ID}`) and ask them to review **the chassis only** (corner brackets, ambient readouts, grid, card frame, accent discipline). Content (fields, copy) is reviewed later.

Wait for user sign-off or revision notes.

- [ ] **Step 5: If user requests chassis revisions, loop back to Step 3 with updated edit prompt reflecting user feedback. Otherwise proceed.**

- [ ] **Step 6: Append asset ID to spec.**

Edit `docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md`: add a new section at the bottom:

```markdown
## Stitch asset IDs

- Login (dark): `{LOGIN_DARK_ID}`
```

- [ ] **Step 7: Commit.**

```bash
git add docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md
git commit -m "$(cat <<'EOF'
docs(specs): record Login (dark) Stitch asset — chassis signed off

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Phase 2: Calm screens batch (dark)

**Goal:** Generate the remaining 5 calm screens in dark mode using the approved chassis. Each uses the same chassis paragraph; only per-screen content + `{STATUS_LINE}` + `{MODULE}` differ.

Per-screen prompt content follows. For every generation, call `mcp__stitch__generate_screen_from_text` with `projectId: "7192466329862115124"`, `modelId: "GEMINI_3_1_PRO"`, `deviceType: "DESKTOP"`, embedding the chassis paragraph with the listed overrides, followed by the screen-specific card content.

- [ ] **Step 1: Generate Register (dark).**

Chassis overrides: `{STATUS_LINE}='> registering operator'`, `{MODULE}='AUTH'`.

Card content:

```text
- Header strip '▸ MODULE / AUTH' with violet pulse dot.
- Heading: 'REQUEST ACCESS' in display font, 30px, violet, wide tracking small-caps.
- Sub-heading line in 16px mono muted: 'Enroll as an operator. Verification required.'
- Field 'DISPLAY NAME' (mono small-caps) with muted '(optional)' pill after the label; rectangular input with cyan border.
- Field 'EMAIL' with rectangular input.
- Field 'PASSWORD' with rectangular input and eye toggle.
- Field 'CONFIRM PASSWORD' with rectangular input and eye toggle.
- Primary button full-width solid violet: 'CREATE OPERATOR'.
- Footer line 16px mono muted: 'Already enrolled? ' followed by cyan link 'Authorize'.
- No OAuth buttons, no 'OR' divider.
```

Record screen ID as `REGISTER_DARK_ID`.

- [ ] **Step 2: Generate Check Email (dark).**

Chassis overrides: `{STATUS_LINE}='> awaiting verification'`, `{MODULE}='AUTH'`.

Card content:

```text
- Header strip '▸ MODULE / AUTH'.
- Heading: 'INBOX INCOMING' in display 30px violet.
- Sub line 16px mono: 'Verification link dispatched to ' followed by 'operator@domain.com' highlighted in cyan.
- Body paragraph in sans 16px, two tight lines: 'Follow the link to complete registration. If it does not arrive in a few minutes, check your spam folder or try a different email address.'
- Single outline button full-width (not violet-filled — this is a return action): 'BACK TO SIGN IN' in 16px mono small-caps with cyan border and transparent fill.
- No other buttons, no footer link.
```

Record as `CHECK_EMAIL_DARK_ID`.

- [ ] **Step 3: Generate Verify Success (dark).**

Chassis overrides: `{STATUS_LINE}='> session verified'`, `{MODULE}='AUTH'`.

Card content:

```text
- Header strip '▸ MODULE / AUTH'.
- At the top of the card content area, a centered square bracket-ring (not a filled circle): four cyan corner brackets about 56px apart forming a notional square frame, with a cyan check mark glyph centered inside. 2px stroke, cyan #06b6d4.
- Heading directly below: 'UPLINK ESTABLISHED' in display 30px violet.
- Sub line 16px mono: 'Email verified. Proceed to command center.'
- Primary button full-width solid violet: 'SIGN IN'.
- No other buttons, no footer.
```

Record as `VERIFY_SUCCESS_DARK_ID`.

- [ ] **Step 4: Generate Recover (password reset request, dark).**

Chassis overrides: `{STATUS_LINE}='> awaiting identifier'`, `{MODULE}='RECOVERY'`.

Card content:

```text
- Header strip '▸ MODULE / RECOVERY' with violet pulse dot.
- Heading: 'RECOVER ACCESS' in display 30px violet.
- Sub line 16px mono: 'Enter your operator email. A reset link will be dispatched.'
- Field 'EMAIL' rectangular input cyan border.
- Primary button full-width solid violet: 'DISPATCH RESET LINK'.
- Footer 16px mono muted: 'Remember credentials? ' followed by cyan link 'Authorize'.
```

Record as `RECOVER_DARK_ID`.

- [ ] **Step 5: Generate Recover Confirm (password reset confirm, dark).**

Chassis overrides: `{STATUS_LINE}='> resetting credential'`, `{MODULE}='RECOVERY'`.

Card content:

```text
- Header strip '▸ MODULE / RECOVERY'.
- Heading: 'RESET CREDENTIAL' in display 30px violet.
- Sub line 16px mono: 'Set a new access key.'
- Field 'NEW PASSWORD' rectangular input with eye toggle.
- Field 'CONFIRM PASSWORD' rectangular input with eye toggle.
- Primary button full-width solid violet: 'COMMIT NEW CREDENTIAL'.
- No footer line.
```

Record as `RECOVER_CONFIRM_DARK_ID`.

- [ ] **Step 6: Present all 5 Stitch URLs to the user in one message.**

Output URLs in the form `https://stitch.withgoogle.com/projects/7192466329862115124/screens/{ID}` for each of the 5 screen IDs. Ask for batch review and revision notes. Content + copy are both in scope for this review.

Wait for user sign-off or per-screen revision notes.

- [ ] **Step 7: If revisions requested, apply via `mcp__stitch__edit_screens` per screen.**

Example call for one screen:

```text
mcp__stitch__edit_screens
  projectId: "7192466329862115124"
  selectedScreenIds: ["{SCREEN_ID}"]
  modelId: "GEMINI_3_1_PRO"
  prompt: "{specific user revision notes, preserving chassis}"
```

Repeat per screen that needs revision. Loop back to Step 6 until all 5 approved.

- [ ] **Step 8: Append all 5 asset IDs to the spec and commit.**

Edit the spec's "Stitch asset IDs" section to include:

```markdown
- Register (dark): `{REGISTER_DARK_ID}`
- Check Email (dark): `{CHECK_EMAIL_DARK_ID}`
- Verify Success (dark): `{VERIFY_SUCCESS_DARK_ID}`
- Recover (dark): `{RECOVER_DARK_ID}`
- Recover Confirm (dark): `{RECOVER_CONFIRM_DARK_ID}`
```

```bash
git add docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md
git commit -m "$(cat <<'EOF'
docs(specs): record Phase 2 calm-screen dark Stitch assets

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Phase 3: Fault screens batch (dark)

**Goal:** Generate the 2 error screens in dark mode with the fault-chrome variant (amber/red accents on the same chassis).

- [ ] **Step 1: Generate Error Boundary (dark).**

Chassis overrides: `{STATUS_LINE}='> fault detected // scope: runtime'`, `{MODULE}='FAULT'`, accent color for corner brackets + card stroke + card bloom + pulse dots flips from cyan to amber `#f97316`.

Card content:

```text
- Header strip '▸ MODULE / FAULT' with AMBER pulse dot.
- At top of card content area, a centered square bracket-ring identical in structure to the verify-success check ring but AMBER (#f97316) brackets with an AMBER warning-triangle glyph centered inside (2px stroke triangle, nothing filled).
- Heading directly below: 'SYSTEM FAULT' in display 30px violet.
- Sub line 16px mono: 'Core process unresponsive. Reload to recover.'
- A single-line body in 16px mono red (#ef4444), muted: placeholder '{error message would appear here}'.
- Primary button full-width solid violet: 'RELOAD'.
- Directly below the button, a collapsed expander row: '▸ TRACE' in 16px mono muted with an amber chevron. Below that (shown in mockup as expanded preview) three lines of 16px mono stack frames in muted color, visually demoting them from the heading. Add a small tag to the expander area reading 'DEV' in 16px mono amber, to hint at dev-only visibility.
- No footer link.
```

Critical: the accent swap must be consistent — every cyan element from the chassis becomes amber on this screen. Violet stays violet for the primary action.

Record as `ERROR_BOUNDARY_DARK_ID`.

- [ ] **Step 2: Generate Route Error (dark).**

Chassis overrides: `{STATUS_LINE}='> fault detected // scope: route'`, `{MODULE}='FAULT'`, same amber accent swap.

Card content:

```text
- Header strip '▸ MODULE / FAULT' with AMBER pulse dot.
- Centered amber bracket-ring with amber warning-triangle glyph identical to the error-boundary screen.
- Heading: 'ROUTE FAULT' in display 30px violet.
- Sub line 16px mono: 'A route loader or async operation raised an error.'
- Single-line body in 16px mono red truncated with ellipsis: 'Cannot read properties of undefined (reading ...)'.
- Primary button full-width solid violet: 'RELOAD'.
- Collapsed '▸ TRACE' expander with preview of 3 stack frames, same DEV tag treatment.
- No footer.
```

Record as `ROUTE_ERROR_DARK_ID`.

- [ ] **Step 3: Present both Stitch URLs to the user.**

Output URLs. Ask for review focused on: does the amber chrome read as "fault" at a glance? Do the two screens differ enough to not feel redundant?

Wait for sign-off or revisions.

- [ ] **Step 4: If revisions requested, apply via `edit_screens` as in Task 2 Step 7. Loop until approved.**

- [ ] **Step 5: Append both asset IDs to spec and commit.**

```markdown
- Error Boundary (dark): `{ERROR_BOUNDARY_DARK_ID}`
- Route Error (dark): `{ROUTE_ERROR_DARK_ID}`
```

```bash
git add docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md
git commit -m "$(cat <<'EOF'
docs(specs): record Phase 3 fault-screen dark Stitch assets

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — Phase 4: Light-mode pass (9 screens)

**Goal:** Generate light-mode counterparts for all 9 approved dark screens. Chassis diffs per Section 3 of the spec: base plane swaps to `#faf9ff`, grid to 4% opacity, scanlines dropped entirely, bloom dropped (crisp strokes replace it), violet deepens to `#6b21d8`, cyan to `#0891b2`, amber to `#b45309`.

For each of the 9 screens, call `mcp__stitch__generate_screen_from_text` with the same per-screen content as its dark counterpart but with the chassis paragraph swapped to the light-mode variant (see "Shared chassis prompt block" at top of plan — toggle every `[OR ... for light]` bracket).

- [ ] **Step 1: Generate Login (light).**

Use Task 1's per-screen content with light-mode chassis. Record as `LOGIN_LIGHT_ID`.

- [ ] **Step 2: Generate Register (light).**

Use Task 2 Step 1's per-screen content with light-mode chassis. Record as `REGISTER_LIGHT_ID`.

- [ ] **Step 3: Generate Check Email (light).** Record as `CHECK_EMAIL_LIGHT_ID`.

- [ ] **Step 4: Generate Verify Success (light).** Record as `VERIFY_SUCCESS_LIGHT_ID`.

- [ ] **Step 5: Generate Recover (light).** Record as `RECOVER_LIGHT_ID`.

- [ ] **Step 6: Generate Recover Confirm (light).** Record as `RECOVER_CONFIRM_LIGHT_ID`.

- [ ] **Step 7: Generate Error Boundary (light).** Record as `ERROR_BOUNDARY_LIGHT_ID`.

- [ ] **Step 8: Generate Route Error (light).** Record as `ROUTE_ERROR_LIGHT_ID`.

- [ ] **Step 9: Present all 8 light URLs to the user for batch review.**

Output all Stitch URLs. Ask specifically about: (a) does light mode read as "engineering blueprint" rather than "washed-out dark mode"? (b) AA contrast on the amber accent in fault screens; (c) any glow/bloom effects that Stitch kept that should be dropped.

Wait for sign-off or per-screen revisions.

- [ ] **Step 10: If any screen kept glow/bloom, correct via `edit_screens`.**

Example:

```text
mcp__stitch__edit_screens
  projectId: "7192466329862115124"
  selectedScreenIds: ["{SCREEN_ID}"]
  modelId: "GEMINI_3_1_PRO"
  prompt: "Remove all glow/bloom effects. Replace the card border with a crisp 1px stroke at higher opacity (~50%). Background must be solid #faf9ff with 1px 4%-opacity grid lines; no scanline overlay at all. Keep all other layout and content intact."
```

Loop per screen that needs correction.

- [ ] **Step 11: If AA contrast fails on red body text in fault screens, propose adding `--color-sofi-red-strong`.**

Output a message to the user: "Light-mode red body text at #ef4444 appears to fail WCAG AA against #faf9ff. Spec contingency: add `--color-sofi-red-strong: #b91c1c` (tailwind red-700) to `src/styles/globals.css`. Proceed, or pick a different value?" Wait for answer; do not edit globals.css in this plan without user approval — record the decision and apply in a follow-up code cycle.

- [ ] **Step 12: Append all 8 light asset IDs to spec and commit.**

```markdown
- Login (light): `{LOGIN_LIGHT_ID}`
- Register (light): `{REGISTER_LIGHT_ID}`
- Check Email (light): `{CHECK_EMAIL_LIGHT_ID}`
- Verify Success (light): `{VERIFY_SUCCESS_LIGHT_ID}`
- Recover (light): `{RECOVER_LIGHT_ID}`
- Recover Confirm (light): `{RECOVER_CONFIRM_LIGHT_ID}`
- Error Boundary (light): `{ERROR_BOUNDARY_LIGHT_ID}`
- Route Error (light): `{ROUTE_ERROR_LIGHT_ID}`
```

```bash
git add docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md
git commit -m "$(cat <<'EOF'
docs(specs): record Phase 4 light-mode Stitch assets

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 — Phase 5: State variants (3 artifacts)

**Goal:** Generate the 3 state variants called out in the spec. Each is a derivation of an existing approved screen.

- [ ] **Step 1: Generate Login email-not-verified inline alert variant.**

Use `mcp__stitch__generate_variants` on `LOGIN_DARK_ID` to produce a single variant focused on adding the inline alert strip:

```text
mcp__stitch__generate_variants
  projectId: "7192466329862115124"
  selectedScreenIds: ["{LOGIN_DARK_ID}"]
  modelId: "GEMINI_3_1_PRO"
  deviceType: "DESKTOP"
  variantOptions:
    variantCount: 1
    creativeRange: "REFINE"
    aspects: ["LAYOUT", "TEXT_CONTENT"]
  prompt:
"Keep the entire Login screen exactly as-is. Insert, directly above the EMAIL field inside the card, a horizontal inline alert strip: 1px amber (#f97316) border at ~50% opacity, transparent fill, 16px mono small-caps amber label 'CREDENTIAL VALID // EMAIL UNVERIFIED' on the left, and on the right a small outline button 'RESEND VERIFICATION LINK' in 16px mono small-caps with an amber border. Also change the bottom-left status line to '> verification required' in amber. All other chrome stays cyan (calm). Do not turn the rest of the screen into the fault palette — the alert is an inline amber strip within an otherwise calm screen."
```

Record as `LOGIN_UNVERIFIED_DARK_ID`.

- [ ] **Step 2: Generate Recover-Confirm success state.**

Use `mcp__stitch__generate_variants` on `RECOVER_CONFIRM_DARK_ID`:

```text
mcp__stitch__generate_variants
  projectId: "7192466329862115124"
  selectedScreenIds: ["{RECOVER_CONFIRM_DARK_ID}"]
  modelId: "GEMINI_3_1_PRO"
  deviceType: "DESKTOP"
  variantOptions:
    variantCount: 1
    creativeRange: "REFINE"
    aspects: ["LAYOUT", "TEXT_CONTENT"]
  prompt:
"Change the card content to the success state: remove both password fields. Add at top of card content a centered cyan bracket-ring with a cyan check glyph (identical to the verify-success screen). Heading becomes 'CREDENTIAL RESET' in display 30px violet. Sub line 16px mono: 'Authorize with your new key.'. Primary button solid violet full-width: 'SIGN IN'. Bottom-left status line changes to '> credential reset' in cyan. All chrome stays calm cyan. Keep everything else (chassis, corner brackets, ambient readouts) unchanged."
```

Record as `RECOVER_CONFIRM_SUCCESS_DARK_ID`.

- [ ] **Step 3: Generate Recover-Confirm invalid-token fault state.**

Use `mcp__stitch__generate_variants` on `RECOVER_CONFIRM_DARK_ID`:

```text
mcp__stitch__generate_variants
  projectId: "7192466329862115124"
  selectedScreenIds: ["{RECOVER_CONFIRM_DARK_ID}"]
  modelId: "GEMINI_3_1_PRO"
  deviceType: "DESKTOP"
  variantOptions:
    variantCount: 1
    creativeRange: "REFINE"
    aspects: ["LAYOUT", "COLOR_SCHEME", "TEXT_CONTENT"]
  prompt:
"Change this to the invalid-token fault state. The ENTIRE chrome flips to fault: corner brackets amber (#f97316), card stroke/bloom amber, header strip '▸ MODULE / FAULT' with amber pulse dot, bottom-left status '> fault detected // scope: token' in amber. Card content: remove both password fields. Add centered amber bracket-ring with amber warning-triangle glyph (identical structure to the error-boundary ring). Heading 'LINK EXPIRED' in display 30px violet. Sub line 16px mono: 'This reset link is no longer valid. Request a new one.'. Primary button solid violet full-width: 'REQUEST NEW LINK'. No footer."
```

Record as `RECOVER_CONFIRM_INVALID_DARK_ID`.

- [ ] **Step 4: Present all 3 variant URLs to the user for review.**

Output Stitch URLs. Ask specifically: (a) does the Login inline alert read as "warning within calm" without feeling broken? (b) does the Recover-Confirm success mirror Verify-Success enough to feel like the same design language? (c) does the invalid-token fault swap feel earned (since it's the only calm→fault route-internal transition)?

Wait for sign-off or revisions. Apply revisions via `edit_screens` if needed. Loop until approved.

- [ ] **Step 5: Append variant asset IDs to spec and commit.**

```markdown
- Login (dark, email-not-verified variant): `{LOGIN_UNVERIFIED_DARK_ID}`
- Recover Confirm (dark, success variant): `{RECOVER_CONFIRM_SUCCESS_DARK_ID}`
- Recover Confirm (dark, invalid-token variant): `{RECOVER_CONFIRM_INVALID_DARK_ID}`
```

```bash
git add docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md
git commit -m "$(cat <<'EOF'
docs(specs): record Phase 5 state-variant Stitch assets

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — Final spec cleanup + hand-off

**Goal:** Ensure the spec is fully populated with all 21 asset IDs, the Stitch-asset section is clean, and we've signalled the completion of the design cycle.

- [ ] **Step 1: Re-read the spec's Stitch-asset section and verify all 21 IDs are present.**

Read `docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md` top-to-bottom. Confirm the asset list has:
- 9 dark primary: Login, Register, Check Email, Verify Success, Recover, Recover Confirm, Error Boundary, Route Error, (Auth Shell — no separate mockup per spec).
- 8 light primary (same minus Auth Shell).
- 3 state variants (Login unverified, Recover-Confirm success, Recover-Confirm invalid-token).

If any missing or mislabelled, fix inline.

- [ ] **Step 2: Add a "Status" stamp at the top of the spec.**

Change the spec's header from `Status: Draft — awaiting user review before plan generation` to `Status: Mockups complete in Stitch — awaiting React implementation cycle`.

- [ ] **Step 3: Update the auto-memory registry.**

Edit `/Users/isaia/.claude/projects/-Volumes-Crucial-4T-repo-sofi/memory/reference_sofi_design_registry.md` to append (in the "Design systems (assets)" section or a new "Screens" section) the 21 screen IDs grouped by phase. Then update `MEMORY.md` if the description needs to evolve. This preserves the asset IDs across sessions for when implementation begins.

- [ ] **Step 4: Final commit.**

```bash
git add docs/superpowers/specs/2026-04-20-auth-error-mockups-design.md
git commit -m "$(cat <<'EOF'
docs(specs): mark auth+error mockup design cycle complete

All 21 Stitch assets approved by user. Implementation is a follow-up cycle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Output hand-off summary.**

Send a final message to the user summarizing: total mockups produced, links to the spec and plan, next cycle (React implementation) not started, reminder that the seed-only contract from `reference_sofi_design_registry` applies when translating Stitch output to React.

---

## Out of scope for this plan

Explicitly NOT covered here (each is its own later cycle):

- React implementation of any mockup.
- Modifications to `src/styles/globals.css` (except the `--color-sofi-red-strong` contingency, which is only *proposed* in Task 4 Step 11 — not applied in this plan).
- Password change (while logged in) surface.
- Logout-all-sessions UI.
- Any 2FA flow.
- Any change to existing component files (`login-page.tsx`, `register-page.tsx`, `check-email-page.tsx`, `verify-success-page.tsx`, `auth-shell.tsx`, `error-boundary.tsx`, `__root.tsx`).
