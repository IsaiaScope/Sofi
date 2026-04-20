# Multi-Language Support (i18n) — Design Spec

**Date:** 2026-04-20
**Status:** Approved (brainstorming); awaiting implementation plan
**Author:** Riva Isaia (via Claude)

## 1. Goal and scope

Make Sofi fully bilingual (English + Italian) across every user-facing surface. An Italian user must never see English in the product — not in the UI, not in form validation, not in backend error responses, not in allauth emails, not in Rust-sourced error toasts. English remains the default and fallback; Italian is the second shipped language. The architecture must accept additional languages later without redesign.

### Out of scope (v1)

- Right-to-left (RTL) layouts — both languages are LTR.
- Translation of user-generated content (board names, task titles).
- Date / number / currency formatting beyond ISO defaults.
- Translation of agent/terminal output.
- Per-tab or per-window locale — locale is a single process-wide value.

## 2. Languages and detection

Supported codes at launch: `en`, `it` (language only, no region qualifier — the app has no region-specific content and short codes keep DB values and storage keys simple).

Boot-time resolution order:

1. `localStorage.getItem('sofi_locale')` if present and supported.
2. `await locale()` from `@tauri-apps/plugin-os`, with region stripped (`'it-IT'` → `'it'`).
3. Fallback: `'en'`.

Post-login, `UserSettings.locale` from the authenticated session is authoritative; if it differs from the current `i18n.language`, the app switches and writes the new value back to `localStorage` so the next cold start starts in the right language.

Unsupported values (e.g., a user whose stored locale is a code we no longer ship) are coerced to `'en'` on read and migrated to `'en'` on the next save.

## 3. Architecture

Full-stack i18n with a clean split of responsibility:

- **Frontend** — `react-i18next` owns all UI copy, Zod error messages (via `zod-i18n-map`), and Rust error translations (by mapping error codes to entries in an `errors` namespace).
- **Rust (Tauri shell)** — language-agnostic. `AppError` exposes a machine-readable `code` field; the English `message` is a dev-log aid only and is never shown to users.
- **Django backend** — owns its own translations via `gettext` + `.po` files. DRF validation errors, allauth flow messages, password validators, and email templates are all translated server-side based on the `Accept-Language` header sent by the frontend.

### Locale flow

```
OS locale ──► plugin-os::locale() ──► frontend bootstrap
                                      │
                                      ▼
                      i18n.language (single source of truth)
                      │            │           │
                      ▼            ▼           ▼
               useTranslation  zod error   Accept-Language
               (UI + errors)   map         header on every
                                           API call
                                                   │
                                                   ▼
                                        Django LocaleMiddleware
                                        ──► gettext lookup
                                        ──► DRF / allauth / emails
```

### Single source of truth

At runtime, `i18n.language` is the authoritative locale. Three writers (bootstrap detection, post-login sync, Settings-page mutation) and three readers (`useTranslation`, Zod error map, API client header). All other code paths go through one of these three.

### Persistence

`UserSettings.locale` — a Django `CharField(choices=[('en', 'English'), ('it', 'Italiano')], default='en')`. Per-user, stored in Postgres, synced to `localStorage` for fast cold-start.

## 4. Components and file layout

### Frontend — new files

```
src/lib/i18n/
  index.ts              i18next instance init + plugin wiring
  detect.ts             resolution order: localStorage → plugin-os → 'en'
  resources.ts          supportedLngs, namespaces, HTTP backend loadPath
  error-codes.ts        Rust error code → i18n key map
  locale-sync.tsx       <LocaleSync /> effect: syncs i18n.language from
                        session's UserSettings.locale after login

public/locales/
  en/
    common.json         App-wide labels
    auth.json           login/register/verify pages + validation
    kanban.json         board, column, task, new board dialog
    settings.json       appearance, API tokens, language
    errors.json         Rust error codes + generic fallbacks
    zod.json            from zod-i18n-map preset
  it/                   same namespaces, Italian strings
```

### Frontend — modified files

- `src/main.tsx` — import `./lib/i18n` before `ReactDOM.render`; mount `<LocaleSync />` inside `<QueryClientProvider>`
- `src/features/auth/schemas.ts` — Zod schemas drop hardcoded English messages
- `src/features/settings/components/settings-page.tsx` — add `<LanguageSection />`
- `src/features/settings/components/language-section.tsx` (new) — Base UI radiogroup EN/IT
- `src/features/settings/queries/mutations.ts` (new) — `useUpdateLocale()`
- `src/lib/api-client.ts` — inject `Accept-Language` from `i18n.language`
- `src/lib/errors.ts` — translate `AppError` via `error-codes.ts`
- `src/components/top-bar/top-bar.tsx` — replace literals with `t()`
- `src/features/auth/components/*` — login / register / check-email / verify-success
- `src/features/kanban/components/*` — board / column / task-card / task-detail-modal

### Rust — modified files

- `src-tauri/Cargo.toml` — add `tauri-plugin-os = "2"`
- `src-tauri/src/lib.rs` — `.plugin(tauri_plugin_os::init())`
- `src-tauri/src/error.rs` — enum variants expose `code() -> &'static str`; serialize as `{ code, message }`
- `src-tauri/capabilities/default.json` — allow `os:default`

Variant layout:

```rust
pub enum AppError {
    KeychainAccessDenied(String),   // code: "keychain.access_denied"
    KeychainUnavailable(String),    // code: "keychain.unavailable"
    OauthCancelled,                 // code: "oauth.cancelled"
    OauthProviderError(String),     // code: "oauth.provider_error"
    Internal(String),               // code: "internal.unknown"
}
```

### Backend — new files

- `backend/locale/en/LC_MESSAGES/django.po` (generated)
- `backend/locale/it/LC_MESSAGES/django.po` + compiled `.mo`
- `backend/apps/users/migrations/0004_usersettings_locale.py`

### Backend — modified files

- `backend/sofi_api/settings/base.py` — add `LocaleMiddleware`, `LANGUAGES`, `LOCALE_PATHS`
- `backend/apps/users/models.py` — `UserSettings.locale`
- `backend/apps/users/serializers.py` — expose `locale`
- `backend/apps/users/views.py` — `PATCH /api/users/settings/`
- `backend/apps/users/urls_tokens.py` — route for settings PATCH
- `backend/apps/users/templates/account/email/email_confirmation_subject.txt` — wrap with `{% trans %}`
- `backend/apps/users/templates/account/email/email_confirmation_message.txt` — idem
- `backend/apps/users/templates/users/email_verified.html` — idem

## 5. Data flow

### Cold start (anonymous)

1. `ReactDOM` mounts → `src/lib/i18n/index.ts` init
2. `detect.ts`:
   1. `localStorage.getItem('sofi_locale')` → if supported, use it
   2. else `await locale()` from plugin-os; strip region
   3. if unsupported → `'en'`
3. `i18n.changeLanguage(resolved)`
4. `<Suspense>` waits for default namespaces (`common`, `errors`)
5. App paints in resolved locale

### User logs in and server-stored locale differs

1. Login mutation succeeds; session + settings fetched
2. `<LocaleSync />` effect: if `user.settings.locale !== i18n.language`, call `i18n.changeLanguage(user.settings.locale)` and write to `localStorage`
3. Mounted components re-render via react-i18next's subscription

### User changes language in Settings

1. Radio click → `useUpdateLocale('it')`
2. `PATCH /api/users/settings/ { locale: 'it' }` (with old `Accept-Language` — intentional for logs)
3. Django serializer validates + saves
4. On success: `i18n.changeLanguage('it')`, update localStorage, invalidate `['session']` query
5. Subsequent API calls send `Accept-Language: it`

### Rust error surfaces as a toast

1. `invoke('cmd')` rejects with `AppError`
2. Tauri serializes to `{ code: "keychain.access_denied", message: "<english>" }`
3. `src/lib/errors.ts` translates: `i18n.t('errors:keychain.access_denied')`
4. Unknown code → `errors:internal.unknown` + `console.warn`
5. `toast.error(translated)`; raw message logged for developers only

### Django DRF validation error

1. `POST /auth/registration/` with `Accept-Language: it`
2. `LocaleMiddleware` sets `request.LANGUAGE_CODE = 'it'`
3. Allauth serializer raises `ValidationError` with `gettext_lazy`-wrapped messages
4. Response body contains pre-translated Italian strings
5. Frontend displays verbatim — no frontend-side dictionary entry needed for DRF messages

## 6. Error handling and edge cases

| # | Situation | Behavior |
|---|-----------|----------|
| E1 | Translation JSON file fails to load | Log to console; per-key fallback to `en`; never crash |
| E2 | Key missing in current locale | i18next `fallbackLng: 'en'` + `fallbackNS: 'common'` handle it transparently |
| E3 | Rust returns unknown error code | Show generic `errors:internal.unknown`; log raw code + English message |
| E4 | Django `.mo` missing or stale | Silent fallback to English source string; CI check prevents merge |
| E5 | User's stored locale no longer supported | Coerce to `'en'` on read; migrate on next save |
| E6 | `plugin-os::locale()` returns `null` | Fall through to `'en'` in detect resolver |
| E7 | DRF returns English despite `Accept-Language: it` | Almost always an un-wrapped string; single canary test catches it |
| E8 | Pluralization | English and Italian both use two-form (one/other) rules — i18next `count` handles both natively |
| E9 | Date/number formatting | Out of scope; ISO formats everywhere until explicitly revisited |

## 7. Testing strategy

### Unit tests (Vitest — frontend)

**`src/lib/i18n/detect.test.ts`**
- localStorage hit → cached value
- OS returns `'it-IT'` → `'it'`
- OS returns `'fr-FR'` (unsupported) → `'en'`
- OS returns `null` → `'en'`

**`src/lib/errors.test.ts`**
- Known code → translated message
- Unknown code → `errors:internal.unknown`
- Raw English `message` never appears in return value

### Rust tests (`src-tauri/tests/error_codes.rs`)

- Each `AppError` variant serializes to `{ code, message }`
- `code` values match a hardcoded list (the test fails if the contract drifts)

### Django tests (`backend/apps/users/tests_i18n.py`)

- `PATCH /api/users/settings/ { locale: 'xx' }` → 400
- Valid locale persists to DB
- `POST /auth/login/` with `Accept-Language: it` + invalid credentials → Italian response
- Same request with `Accept-Language: en` → English response
- `.po` mtime ≤ `.mo` mtime (compile freshness)

### End-to-end (Playwright — `tests/e2e/i18n.spec.ts`)

One spec, four steps:

1. Boot in English: clear localStorage, stub `plugin-os::locale()` → `'en-US'`, assert login reads "Sign In".
2. Switch via Settings: log in, open `/settings`, click "Italiano", assert top bar "Sign Out" becomes "Esci".
3. Zod errors translate: submit empty login form, assert error text is Italian.
4. Django errors translate: register with existing email, assert API error toast is Italian (proves `Accept-Language` round-trip).

### Build-time guards

- `scripts/check-i18n-keys.mjs` diffs `public/locales/en/**` vs `public/locales/it/**`, fails CI on missing keys.
- `manage.py makemessages --dry-run --check` fails CI if any Python string isn't extracted.
- `manage.py compilemessages` fails CI on `.po` errors.

## 8. Migration and rollout

1. Land the plumbing (i18n bootstrap, empty `it` bundles, Django middleware) with English as default and only fully-populated language.
2. Fill `it` bundles namespace by namespace — `common` and `auth` first (highest-traffic pre-login surfaces), then `kanban`, `settings`, `errors`.
3. Add the Settings language switcher once both languages are ≥ 95% complete.
4. Enable OS-based detection last, so early testers don't get switched into a partially-translated Italian UI.

No feature flag — each namespace file is self-contained; missing keys transparently fall back to English.

## 9. Open questions

None at this time. All decision points (language list, detection order, scope, error strategy, testing depth) were resolved during brainstorming.

## 10. Non-goals recap

- No RTL.
- No translation of user-generated content.
- No extended localization (currency, addresses, relative dates) in v1.
- No per-tab locale.
