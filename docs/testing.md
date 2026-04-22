# Testing

Sofi's test surface mirrors the AllOnFire pattern: real Postgres, real
Django, real Playwright. The only mocks are **email transport**
(`locmem` backend so outbox assertions are in-process) and **OAuth
providers** (mock-oauth2-server sidecar — see Coverage matrix below).

## Layers

```
┌─ backend/apps/**/tests/*.py ────── pytest + pytest-django
│   Unit + integration: real DB, real allauth, locmem email
│
├─ tests/e2e/auth/*.spec.ts ───────── Playwright (chromium-auth project)
│   Browser-level auth flows against Vite + Django web build
│
└─ tests/e2e/auth/native/*.spec.ts ── Playwright (tauri-native project, nightly)
    Deep link, OS keychain — runs against bundled .app via e2e-tauri-nightly.yml
```

## Running locally

### Backend pytest (fast, no Docker needed if Postgres is up)

```bash
docker compose up -d postgres
cd backend && uv run pytest                 # whole suite, ~1s
cd backend && uv run pytest -k login        # filter by name
cd backend && uv run pytest -m slow         # opt into the slow marker
```

`pyproject.toml` pins `DJANGO_SETTINGS_MODULE=sofi_api.settings.test`
which:
- Uses the `locmem` email backend (no real emails go out, outbox is
  queryable in-process via `mailbox` fixture).
- Uses the MD5 password hasher (the default PBKDF2 is ~100ms per user
  and compounds across a suite).
- Disables DRF throttles so rapid-fire requests don't flake.

For throttling tests use `sofi_api.settings.test_throttled` (separate
`backend-throttling` CI job — see CI overview below).

### Playwright e2e

```bash
pnpm test:e2e               # headless, chromium-only
pnpm test:e2e:ui            # Playwright UI mode, interactive
```

The Playwright config spins up Vite + Django automatically via its
`webServer` block. First run will install Chromium (`~150 MB`), cached
in `~/.cache/ms-playwright` for subsequent runs.

The `setup` project seeds a verified user via `manage.py e2e_seed_user`
then logs in; the resulting storage state is written to `.auth/user.json`
and reused by every spec in the `chromium-auth` project. Anonymous
specs (login page rendering, register form) opt out with
`test.use({ storageState: { cookies: [], origins: [] } })`.

#### Router helpers — required reading for spec writers

Sofi uses `createMemoryHistory` for its router. **The browser URL never
reflects in-app navigation.** This means `page.goto('/login')` will NOT
navigate to the login route, and `page.waitForURL('/login')` will never
resolve.

Always use the helpers from `tests/e2e/router-helpers.ts`:

| Helper | Use instead of |
|---|---|
| `bootApp(page)` | `page.goto('/')` + manual wait |
| `navigateTo(page, '/login')` | `page.goto('/login')` |
| `waitForRoute(page, '/login')` | `page.waitForURL('/login')` |
| `currentRoute(page)` | `page.url()` |

These helpers drive navigation via `window.__TSR_ROUTER__.navigate()` and
poll the router's internal state — they are the only reliable way to
test specific routes.

## Fixtures and factories

### Backend

| Fixture | What it is |
|---|---|
| `api_client` | Unauthenticated DRF `APIClient` |
| `authed_client` | APIClient with a fresh Knox token on the header |
| `verified_user` / `unverified_user` | Factory-created User + EmailAddress (primary, verified or not) |
| `verified_user_with_password` | Tuple `(user, raw_password)` — use when POSTing to `/auth/login/` |
| `mailbox` | `django.core.mail.outbox`, cleared before each test |

Factories live in `backend/apps/users/tests/factories.py`. Every seeded
email ends with `@test.sofi.local` — a deliberate marker so ad-hoc
cleanup scripts can delete fixture rows without touching real data.

### Frontend

`tests/e2e/fixtures.ts` extends Playwright's `test` with:

| Fixture | What it is |
|---|---|
| `seedUser(email, password?)` | Creates/resets a verified user via `manage.py e2e_seed_user`, auto-deleted at test end |
| `deleteUser(email)` | Explicit teardown |
| `verificationUrl(email)` | Calls `manage.py e2e_last_email` to extract the verification link from the filebased mail spool |
| `resetUrl(email)` | Same as above, scoped to password-reset emails |
| `revokeAllTokens(email)` | Calls `manage.py e2e_revoke_tokens` — simulates server-side session expiry |
| `mockOauthUser(provider, claims?)` | Preconfigures the mock-oauth2-server sidecar with a fake user for Google/GitHub flows |

## Caching strategy

| Layer | Cache key | Tool |
|---|---|---|
| pnpm store | `pnpm-lock.yaml` | `actions/setup-node@v5` with `cache: pnpm` |
| uv + Python deps | `backend/uv.lock` | `astral-sh/setup-uv@v6` |
| Playwright browsers | `pnpm-lock.yaml` | `actions/cache@v4` on `~/.cache/ms-playwright` |
| Rust target | `src-tauri/Cargo.lock` | `Swatinem/rust-cache@v2` |
| Job skip gate | changed paths | `dorny/paths-filter@v3` |

**paths-filter is the big one.** A PR that only touches `docs/` skips
`lint`, `backend-tests`, `rust-check`, and `e2e-web` entirely — only
the `changes` detection job runs. A backend-only PR skips `lint` +
`rust-check`. Lives in `.github/workflows/ci.yml`.

## CI overview

**`ci.yml`** (every PR + push to dev/main):
1. `changes` — detects which code areas changed.
2. `lint` — biome + tsc (gated on frontend changes).
3. `backend-tests` — pytest against Postgres service container, with
   **mock-oauth2-server** sidecar for OAuth flow tests (gated on backend changes).
4. `rust-check` — cargo check (gated on `src-tauri/**` changes).
5. `e2e-web` — Playwright against Vite + Django, with **mock-oauth2-server**
   sidecar (gated on e2e-relevant changes).
6. `backend-throttling` — pytest using `sofi_api.settings.test_throttled`;
   runs rate-limit assertions that would flake if mixed into the main
   `backend-tests` job.

Concurrency is `cancel-in-progress` per-ref, so pushing twice to the
same branch never wastes a minute.

**`e2e-tauri-nightly.yml`** (scheduled 03:30 UTC + manual dispatch):
- Builds a real Tauri `.app` bundle on macOS, installs it to
  `/Applications/`, registers the `sofi://` scheme with Launch Services,
  then runs Playwright with `--project=tauri-native`. This is the only
  surface where deep-link + keychain flows are exercised against the
  real binary.

## Coverage matrix

| Flow | Backend pytest | Web Playwright | Tauri-native | Notes |
|---|---|---|---|---|
| Registration | ✅ | ✅ | ⚠️ pending launcher | |
| Login (happy/wrong/unverified) | ✅ | ✅ | ⚠️ pending launcher | |
| Logout / redirect protection | ✅ | ✅ | ⚠️ pending launcher | |
| Resend verification | ✅ | ✅ | ⚠️ pending launcher | |
| Email verification (full round-trip) | ✅ | ✅ | ⚠️ pending launcher | URL via `e2e_last_email` |
| Password reset (request + confirm) | ✅ | ✅ | ⚠️ pending launcher | |
| OAuth Google + GitHub | ✅ | ✅ | ⚠️ scaffolding | mock-oauth2-server sidecar |
| Session expiry / Knox revocation | ✅ | ✅ | ⚠️ pending launcher | |
| Redirect-after-login intent | n/a | ✅ | ⚠️ pending launcher | |
| Field-level server errors | ✅ | ✅ | ⚠️ pending launcher | envelope drift guard |
| Network failure → ErrorBanner | n/a | ✅ | ⚠️ pending launcher | `page.route()` |
| Throttling | ✅ | n/a | n/a | `settings.test_throttled`, separate CI job |
| Real `sofi://` deep link | n/a | n/a | ⚠️ scaffolding | needs `@tauri-apps/playwright` |
| OS keychain token storage | n/a | n/a | ⚠️ fixme | needs app-restart helper |

## Adding a new test

**Backend:** drop a `test_*.py` under
`backend/apps/<app>/tests/`. The root `conftest.py` auto-marks every
test with `django_db`, so you don't need the decorator.

**Playwright:** drop a `*.spec.ts` under `tests/e2e/`. If it needs an
authenticated browser, do nothing — the `chromium-auth` project's
storage state is applied by default. If it's an anonymous flow, add
`test.use({ storageState: { cookies: [], origins: [] } })` at the top.

## Adding a native-only spec

Drop the file under `tests/e2e/auth/native/`. The `chromium-auth` Playwright
project ignores `/native/`; the `tauri-native` project matches only
`/native/`. Any spec you add there inherits the bundled-binary coverage
nightly without duplicating code.

Use the helpers from `tests/e2e/native/fixtures.ts`:

- `appPath` — fixture returning the `.app` path (env-overridable).
- `triggerDeepLink(url)` — fires `sofi://...` via macOS `open`.

The launcher is wrapped by the project config; don't import
`@tauri-apps/playwright` directly from spec files. When the package is
published, swap the shim in `tests/e2e/native/fixtures.ts`; specs don't
need to change.

## Follow-ups

- `@tauri-apps/playwright` not yet on npm — `tauri-native` project runs
  against the Vite dev server, not the bundled `.app`. Deep-link + keychain
  native specs are scaffolding.
- VCR/cassettes for real Google/GitHub providers (mock covers the auth
  contract; cassettes would add provider-specific edge cases).
- `pytest-xdist` parallelism for the backend suite once it grows past ~10s.
- Playwright sharding for `e2e-web` once spec count crosses ~25.
- Native PR-level testing (currently nightly-only via `e2e-tauri-nightly.yml`).
