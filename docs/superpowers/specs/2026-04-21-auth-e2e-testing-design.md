# Auth End-to-End Testing — Design

**Date:** 2026-04-21
**Owner:** Riva Isaia
**Status:** Approved (brainstorming complete; implementation plan to follow)

## Goal

Close every gap in Sofi's auth coverage across three layers — backend pytest, web Playwright, native Tauri Playwright — without forking the spec set, without adding a second test harness, and without inflating per-PR CI time beyond what paths-filtering can absorb.

"Efficient" here means: one spec set per Playwright project pair, shared helpers so each new flow costs ~30-50 lines, only one new CI service container (`mock-oauth2-server`), throttling tests carved out into their own settings module so the fast suite stays fast.

## Coverage Matrix

The full auth surface; "inherited" = the spec runs in the new `tauri-native` project automatically because both Playwright projects share `tests/e2e/auth/*.spec.ts`.

| Flow | Backend pytest | Web Playwright | Tauri-native | Status |
|---|---|---|---|---|
| Registration (form, duplicate, weak pw) | yes | yes | inherited | done |
| Login (happy, wrong pw, unverified) | yes | yes | inherited | done |
| Logout (signout + redirect protection) | yes | yes | inherited | done |
| Resend verification | yes | yes | inherited | done |
| Email verification click-through (full round-trip) | yes (API level) | **NEW** (UI level) | inherited | add |
| Password reset request + confirm | **NEW** | **NEW** | inherited | add |
| OAuth — Google + GitHub | **NEW** | **NEW** | **NEW** (`sofi://` callback) | add |
| Session expiry / Knox token revocation | **NEW** | **NEW** | inherited | add |
| Redirect-after-login intent | n/a | **NEW** | inherited | add |
| Field-level server errors (`useServerFieldErrors`) | **NEW** | **NEW** | inherited | add |
| Network failure → ErrorBanner | n/a | **NEW** (`page.route`) | inherited | add |
| Throttling (allauth + DRF) | **NEW** (separate settings) | n/a | n/a | add |
| Real `sofi://` deep link | n/a | n/a | **NEW** | add |
| OS keychain token storage | n/a | n/a | **NEW** | add |

## Architecture

Three runtime layers, four CI jobs (one new), a shared spec set across the two Playwright projects.

```
backend/apps/users/tests/*.py                   pytest + pytest-django
  • Real Postgres (CI service container; local Docker)
  • Real allauth + dj-rest-auth + Knox
  • locmem email backend
  • OAuth provider: mock-oauth2-server (Docker sidecar, shared with e2e)
  • Throttling: settings.test_throttled, separate pytest invocation, `@pytest.mark.throttling`

tests/e2e/auth/*.spec.ts                        Playwright project: chromium-auth
  • Drives Vite dev server + Django runserver
  • Same mock-oauth2-server sidecar
  • Reads verification/reset URLs via manage.py e2e_last_email
  • page.route() for network-failure UX
  • Runs on every PR (paths-filtered)

tests/e2e/auth/*.spec.ts (same files!)          Playwright project: tauri-native
  • Driven by @tauri-apps/playwright-launcher → /Applications/Sofi.app
  • Adds tests/e2e/auth/native/*.spec.ts (excluded from chromium-auth via testIgnore)
  • Runs nightly + workflow_dispatch
```

### Architectural calls

1. **Single spec set, two Playwright projects.** `chromium-auth` excludes `native/`; `tauri-native` includes everything. New flows added for web are tested against the bundled binary nightly with no duplicate code.
2. **`mock-oauth2-server` as a Docker sidecar.** Same image used by `backend-tests`, `e2e-web`, and the nightly Tauri job. Allauth's `SOCIALACCOUNT_PROVIDERS` overrides in `settings.test_oauth` point at `http://localhost:8081`. Provider issues real, signed JWTs we control.
3. **Throttling tests are a 4th CI job** (`backend-throttling`) running `pytest -m throttling --ds=sofi_api.settings.test_throttled`. Avoids slowing the regular fast suite and removes per-test override flakes from throttle-bucket carryover.
4. **No new test runners.** Pytest + Playwright as today. Only the project list grows.
5. **Test isolation = email suffix + UUID.** Every fixture-created email ends with `@test.sofi.local`; every dynamic email in a parallel spec uses `crypto.randomUUID().slice(0, 8)` (replaces today's `Date.now()`). Per-test cleanup via `seedUser`/`deleteUser`; periodic safety net via `manage.py e2e_sweep_test_users`.

## Files & Components

### Backend test suites — new

`backend/apps/users/tests/`:

| File | Coverage |
|---|---|
| `test_password_reset.py` | POST `/auth/password/reset/` + `/auth/password/reset/confirm/`; URL extraction from mailbox; expired/invalid token; email-not-found behavior. |
| `test_oauth.py` (replaces placeholder) | Google + GitHub via `mock-oauth2-server`: full callback, social-account linking, duplicate-email collision, returns Knox token. |
| `test_session_lifecycle.py` | Knox token revocation, multi-token per user, `/auth/logout/` invalidates the right token, `/auth/logoutall/`, expired token returns 401. |
| `test_field_errors.py` | Confirms every auth endpoint returns the `{code, field_errors}` envelope `useServerFieldErrors` consumes — guards against accidental envelope drift. |
| `test_throttling.py` | Login/register/password-reset throttle limits, 429 response shape, retry-after header. Marked `@pytest.mark.throttling`; runs against `settings.test_throttled` only. |

### Backend infrastructure — new

`backend/`:

| File | Purpose |
|---|---|
| `apps/users/management/commands/e2e_last_email.py` | `--email <addr> --kind {verify,reset}` → JSON `{url, key, expires_at}`. Refuses prod settings. |
| `apps/users/management/commands/e2e_sweep_test_users.py` | Deletes all `@test.sofi.local` users older than N hours. Cron-safe. |
| `sofi_api/settings/test_throttled.py` | Imports from `.test`, re-enables `DEFAULT_THROTTLE_RATES`, sets short windows for fast tests. |
| `sofi_api/settings/test_oauth.py` | Imports from `.test`, overrides `SOCIALACCOUNT_PROVIDERS` to point at `http://localhost:8081`. |
| `apps/users/tests/conftest.py` | OAuth-specific fixtures: `mock_oauth_user(provider, email)` provisions an identity in mock-oauth2-server via its admin API. |

### Playwright specs — new

`tests/e2e/auth/`:

| File | Scope |
|---|---|
| `password-reset.spec.ts` | `/recover` form → email → click reset URL → `/recover/confirm` → set new pw → login with new pw. |
| `email-verification.spec.ts` | Register → fetch verification URL via `e2e_last_email` → navigate → assert verified state → log in. Replaces today's surrogate-only `deep-link.spec.ts` (kept temporarily, removed at chunk 3). |
| `oauth-google.spec.ts` | Click Google button → mock provider issues code → callback → land on `/kanban` with token. |
| `oauth-github.spec.ts` | Same flow, GitHub provider. |
| `session-expiry.spec.ts` | Authed user → backend revokes Knox token → next API call returns 401 → UI bounces to `/login`. |
| `redirect-after-login.spec.ts` | Anonymous visits `/kanban?taskId=abc` → bounces to `/login` → after sign in, lands at original URL with query intact. |
| `field-errors.spec.ts` | Submit register/login with bad payloads → assert per-field error renders next to the right `<Field>`. |
| `network-failure.spec.ts` | `page.route()` 500/abort/timeout → `ErrorBanner` content + retry CTA. |
| `native/deep-link.real.spec.ts` | Native-only. Trigger `sofi://verify-email/<key>` via OS handoff → app opens → token saved. |
| `native/keychain.spec.ts` | Native-only. Login → quit app → relaunch → still authenticated (Keychain read). |
| `native/oauth-callback.spec.ts` | Native-only. OAuth → provider redirects to `sofi://oauth/callback?code=…` → token issued. |

### Playwright fixtures/helpers — new

`tests/e2e/`:

| File | Surface |
|---|---|
| `fixtures.ts` (extend) | Add `verificationUrl(email)`, `resetUrl(email)`, `revokeAllTokens(email)`, `mockNetworkFailure(page, urlPattern, status)`. |
| `auth-helpers.ts` | Reusable: `register(page, …)`, `verifyEmail(page, url)`, `requestPasswordReset(page, email)`, `completePasswordReset(page, email, newPassword)`, `mockOauthUser({provider, email, sub?})`. |
| `native/fixtures.ts` | `tauri-native`-only setup: launcher config, app path, deep-link trigger via `osascript`/`open` shell-out. |

### Frontend test infra — modified

`playwright.config.ts`:

```ts
projects: [
  { name: "setup", testMatch: /auth\.setup\.ts/ },
  { name: "chromium-auth", /* unchanged */ testIgnore: /\/native\// },
  { name: "tauri-native",  /* new */ use: { /* launcher cfg */ } /* no testIgnore */ },
]
```

### CI — modified

`.github/workflows/`:

| File | Change |
|---|---|
| `ci.yml` | Add `mock-oauth2-server` service container to `backend-tests` and `e2e-web`. Add new `backend-throttling` job (gated on `backend` filter) running `pytest -m throttling --ds=sofi_api.settings.test_throttled`. |
| `e2e-tauri-nightly.yml` | Add `pnpm exec playwright install` (launcher already pulled by `pnpm install`). Add `mock-oauth2-server` via `docker run` (macOS runner has no services shortcut). Drop `--project=chromium-auth`; run `--project=tauri-native`. |

### Docs — modified

`docs/testing.md`: replace gaps section with a coverage matrix matching this design's; add an "adding a native-only spec" subsection.

## Data Flow & Reusability

Most flows compose three blocks — that's why `auth-helpers.ts` exists.

```
Spec body
  ├─→ seed/register a user
  ├─→ optionally fetch URL from mail
  ├─→ drive the UI
  └─→ assert + cleanup
```

### Password reset (representative full flow)

```
1. seedUser(uuid + suffix)                         → fixture
2. page.goto("/recover")                           → UI
3. fill email, click "Send reset link"             → UI
4. expect /check-email                             → UI
5. resetUrl(email) ← e2e_last_email cmd            → fixture (subprocess)
6. page.goto(resetUrl)                             → /recover/confirm
7. fill new pw twice, submit                       → UI
8. expect redirect to /login                       → UI
9. signIn(page, email, newPw)                      → existing helper
10. expect redirect to /kanban                     → UI
```

### OAuth (web)

```
mock-oauth2-server runs at localhost:8081 (CI service or local docker compose)

1. mockOauthUser({ provider, email })              → fixture (HTTP POST to mock admin)
2. page.goto("/login")                             → UI
3. click "Continue with Google"                    → UI
   browser → http://localhost:8081/google/authorize
   mock → 302 → http://localhost:1420/auth/google/callback?code=...
   allauth → exchanges code → SocialAccount → Knox token
4. expect /kanban + token in storage               → UI
```

### Session expiry

```
1. page.goto("/kanban") (already authed via setup) → UI
2. revokeAllTokens(email)                          → fixture
3. page.reload() (triggers refetch)                → UI
4. expect 401 from interceptor → /login            → UI
5. expect old token cleared from localStorage      → UI
```

### Network failure

```
1. page.route("**/auth/login/", route => route.fulfill({ status: 500, ... }))
2. seedUser(uuid)
3. page.goto("/login"); signIn(...)
4. expect ErrorBanner visible (retry CTA)
5. page.unroute("**/auth/login/")
6. signIn(...) again (real)
7. expect /kanban
```

## CI Topology

```
                      ┌─ changes (paths-filter, ~5s) ─┐
                      │                                │
   on every PR ───────┼─→ lint              (frontend)
                      │                                │
                      │   backend-tests     (backend)
                      │       service: postgres-16
                      │       service: mock-oauth2     ← NEW sidecar
                      │                                │
                      │   backend-throttling (backend, NEW)
                      │       separate pytest invoke with -m throttling
                      │       DJANGO_SETTINGS_MODULE=...test_throttled
                      │       service: postgres-16
                      │       (no mock-oauth needed)
                      │                                │
                      │   rust-check        (src-tauri)
                      │                                │
                      └─→ e2e-web           (e2e-relevant)
                              services: postgres + mock-oauth
                              blocked-by: backend-tests (unchanged)

   nightly + dispatch ─→ tauri-e2e (existing job, retargeted)
                              macos-14 runner
                              docker run mock-oauth2-server
                              pnpm exec playwright test --project=tauri-native
                              full spec set against bundled Sofi.app
```

### Time budget per job (rough, GitHub-hosted)

| Job | Today | After this work | Delta |
|---|---|---|---|
| `lint` | ~50s | ~50s | 0 |
| `backend-tests` | ~25s | ~45s | +20s (mock-oauth boot, new specs) |
| `backend-throttling` | — | ~15s | new |
| `rust-check` | ~3min cold / 30s warm | unchanged | 0 |
| `e2e-web` | ~3min | ~5min | +2min (8 new specs) |
| `tauri-e2e` (nightly) | ~30min | ~40min | +10min (real native specs) |

### Levers in place we lean on

- `fullyParallel: true` in Playwright; UUID-suffixed emails replace `Date.now()` to remove millisecond-collision risk.
- `paths-filter` saves the `lint` / `backend-*` / `e2e-web` skips that already exist; throttling job piggybacks on the `backend` filter.
- `concurrency: cancel-in-progress` per ref.
- pnpm / uv / Playwright-browser / Rust-target caches all keyed on lockfiles.

### New levers we add

- `pytest-xdist` opt-in for the regular backend suite once it grows past 10s. Not shipped with the matrix (premature; new tests add ~5s).
- Playwright sharding for `e2e-web` once spec count crosses ~25. The matrix takes us 13 → 21; documented as a future toggle, not enabled.
- Mock-oauth-server reuse: `docker-compose.test.yml` (new) defines it once; both jobs reference it.

### What does not change

- No new GitHub Actions secrets (mock-oauth issues self-signed JWTs).
- No new third-party SaaS dependencies.
- No native runner on PRs — Tauri stays nightly-only.
- No teardown of the `setup` project / shared storage state — extending it.

### Failure-mode budget

- Spec retries stay at `2` in CI, `0` locally (already configured).
- `forbidOnly: !!process.env.CI` already prevents `.only` from sneaking in.
- Trace-on-first-retry + video-on-failure already configured — diagnostics intact for the new specs.

## Sequencing & Risk

Build order — each chunk independently mergeable, each closes a real gap.

```
1. Email-URL infra              ← unlocks 2 + 3
   manage.py e2e_last_email + sweeper command
   Playwright fixture: verificationUrl(), resetUrl()
   Backend: tighten test_email_verification round-trip with the helper

2. Password reset               ← isolated, fast win
   Backend: test_password_reset.py
   Frontend: password-reset.spec.ts
   auth-helpers.ts: requestPasswordReset, completePasswordReset

3. Full email verification e2e
   Replace deep-link.spec.ts surrogate with email-verification.spec.ts
   auth-helpers.ts: verifyEmail()

4. Field errors + redirect-after-login + network failure
   field-errors.spec.ts (touches every existing form, no new infra)
   redirect-after-login.spec.ts
   network-failure.spec.ts (Playwright route mocking)
   Backend: test_field_errors.py (envelope drift guard)

5. Session lifecycle
   Backend: test_session_lifecycle.py (Knox revocation matrix)
   Fixture: revokeAllTokens()
   Frontend: session-expiry.spec.ts

6. Throttling                   ← can run in parallel with 4-5
   sofi_api/settings/test_throttled.py
   pytest marker registration
   Backend: test_throttling.py
   CI: new backend-throttling job in ci.yml

7. OAuth (web)                  ← biggest infra step
   docker-compose.test.yml with mock-oauth2-server
   sofi_api/settings/test_oauth.py provider overrides
   Backend: replace test_oauth.py placeholder
   Frontend: oauth-google.spec.ts + oauth-github.spec.ts
   CI: add mock-oauth service to backend-tests + e2e-web

8. Tauri-native                 ← biggest CI step, depends on 1-7
   pnpm add -D @tauri-apps/playwright-launcher
   playwright.config.ts: add tauri-native project
   tests/e2e/auth/native/{deep-link.real,keychain,oauth-callback}.spec.ts
   tests/e2e/native/fixtures.ts (launcher cfg, sofi:// trigger)
   e2e-tauri-nightly.yml: switch to --project=tauri-native; add mock-oauth via docker run

9. Documentation pass
   docs/testing.md: replace gaps section with full coverage matrix
   Add "adding a native-only spec" subsection
```

### Why this order

- Chunks 1-5 close 5 high-value flows with **zero new CI services**. Each ships independently, shrinks the gap list, survives if a later chunk slips.
- Chunk 6 is **architecturally isolated** — separate settings, separate job, separate marker. Can be parallelized with 4-5.
- Chunk 7 introduces the only new CI service container. Doing it after the easy wins means every prior chunk has been validated against the existing setup before we add the moving part.
- Chunk 8 stacks on top of 1-7: native job inherits all new specs automatically (single spec set, two projects) — max value from doing it last.

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `mock-oauth2-server` issuer URL mismatch with allauth's expected JWKS endpoint | medium | Pin image version; document env-var contract in `settings/test_oauth.py` |
| Web `oauth-*` specs flake on the 302 → callback timing | low | `page.waitForURL(/\/auth\/.*\/callback/)` before assertion; retries=2 |
| Native specs hang on macOS Keychain prompts | medium | Pre-trust the bundle in install step; one-time keychain-unlock in workflow |
| `@tauri-apps/playwright-launcher` is young / API churn | medium | Pin version; vendor a thin wrapper in `tests/e2e/native/fixtures.ts` so suite doesn't import it directly |
| Throttle bucket carryover across tests | low | Each `test_throttling.py` test picks a unique IP/email pair; bucket key never collides |
| `e2e_last_email` race when two specs send to same address simultaneously | low | UUID-suffixed emails make per-address mailbox single-tenant by construction |
| `mock-oauth2-server` cross-spec contamination (shared `sub`) | medium | `mockOauthUser()` fixture sets `sub = uuid` explicitly |

## Out of scope

- VCR cassettes for real Google/GitHub providers (mock instead).
- Replacing pytest with anything else.
- Replacing Playwright with anything else.
- Cypress, Vitest-for-e2e, or any second harness.
- Refactoring the existing 5 covered flows (they work; don't churn).

## Open follow-ups (post-matrix)

These are explicitly *not* in scope for this work but worth noting so they don't get forgotten:

- pytest-xdist + `--reuse-db` once the backend suite grows past 10s.
- Playwright sharding once the spec count crosses ~25.
- Native job on PR (gated behind a `[native-e2e]` label) for changes touching `src-tauri/`.
- Real `sofi://` deep-link coverage on Linux/Windows once Sofi ships there.
