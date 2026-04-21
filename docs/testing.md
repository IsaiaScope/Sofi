# Testing

Sofi's test surface mirrors the AllOnFire pattern: real Postgres, real
Django, real Playwright. The only mocks are **email transport**
(`locmem` backend so outbox assertions are in-process) and **OAuth
providers** (deferred — see "Gaps" below).

## Layers

```
┌─ backend/apps/**/tests/*.py ────── pytest + pytest-django
│   Unit + integration: real DB, real allauth, locmem email
│
├─ tests/e2e/auth/*.spec.ts ───────── Playwright
│   Browser-level auth flows against Vite + Django web build
│
└─ (nightly) /Applications/Sofi.app ─ Playwright + native bundle
    Deep link, OS keychain — see e2e-tauri-nightly.yml
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
3. `backend-tests` — pytest against Postgres service container (gated on backend changes).
4. `rust-check` — cargo check (gated on `src-tauri/**` changes).
5. `e2e-web` — Playwright against Vite + Django (gated on e2e-relevant changes).

Concurrency is `cancel-in-progress` per-ref, so pushing twice to the
same branch never wastes a minute.

**`e2e-tauri-nightly.yml`** (scheduled 03:30 UTC + manual dispatch):
- Builds a real Tauri `.app` bundle on macOS, installs it to
  `/Applications/`, registers the `sofi://` scheme with Launch Services,
  then runs Playwright. This is the only surface where deep-link +
  keychain flows are actually exercised.

## Adding a new test

**Backend:** drop a `test_*.py` under
`backend/apps/<app>/tests/`. The root `conftest.py` auto-marks every
test with `django_db`, so you don't need the decorator.

**Playwright:** drop a `*.spec.ts` under `tests/e2e/`. If it needs an
authenticated browser, do nothing — the `chromium-auth` project's
storage state is applied by default. If it's an anonymous flow, add
`test.use({ storageState: { cookies: [], origins: [] } })` at the top.

## Gaps / known follow-ups

- **OAuth coverage.** `backend/apps/users/tests/test_oauth.py` is a
  placeholder. Proper coverage needs VCR-style cassette recording
  (vcrpy or pytest-recording) against a real Google/GitHub hit once,
  then replayed in CI. Not trivial to set up — out of scope for the
  first cut.
- **Tauri-native Playwright project.** The nightly workflow builds the
  right bundle but still runs Playwright against the Vite server. Real
  native coverage needs `@tauri-apps/playwright-launcher` (not yet in
  `devDependencies`) and a dedicated `tauri-native` project in
  `playwright.config.ts` that launches `/Applications/Sofi.app`.
- **DB parallelism for pytest.** Tests run sequentially. If the suite
  grows past ~10s, add `pytest-xdist` and `--reuse-db`.
- **Test DB seeding for e2e parallelism.** `seedUser` is per-test, but
  two parallel workers creating the same email would collide. Email
  uniqueness is handled with `Date.now()` today; if flakes surface,
  switch to UUID suffixes.
