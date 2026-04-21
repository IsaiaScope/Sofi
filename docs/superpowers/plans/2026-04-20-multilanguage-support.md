# Multi-Language Support (i18n) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Sofi fully bilingual (English default, Italian second) across the React UI, Zod validation, Rust error toasts, Django responses, and allauth email templates.

**Architecture:** `react-i18next` with lazy-loaded JSON bundles owns UI copy + Rust error slug translation; `zod-i18n-map` owns Zod errors; Django's native `gettext` + `LocaleMiddleware` owns server-side strings. `i18next.language` is the single source of truth at runtime; `UserSettings.locale` in Postgres is the persistent source.

**Tech Stack:** `i18next@^23`, `react-i18next@^14`, `i18next-http-backend@^2`, `i18next-browser-languagedetector@^7`, `zod-i18n-map@^2`, `tauri-plugin-os@^2`, Django 5.2 `gettext_lazy` + `LocaleMiddleware`.

## Deviation from spec

Spec section 4 says `AppError` serializes as `{ code: <string slug>, message }`. The existing `src/lib/errors.ts` type already has a `kind?: string` field (used by Django error responses) and a numeric `code`. **This plan puts the Rust error slug into `kind` rather than replacing `code`**, keeping `code` as an HTTP-like status across every error source. Result: the translation lookup becomes `i18n.t(\`errors:${err.kind}\`)` everywhere, and the existing `error.code === ErrorCode.AUTH` check in `src/main.tsx:29` keeps working unchanged. This is a cleaner migration with identical user-facing behavior.

## Phases

1. **Infrastructure** (Tasks 1–16) — plumbing, no user-visible change. App still displays English; i18n loaded and ready.
2. **Frontend extraction** (Tasks 17–22) — replace hardcoded English with `t()`. Only `en` bundle populated.
3. **Italian translations** (Tasks 23–28) — populate `it` bundles + Italian `.po`.
4. **Switcher and E2E** (Tasks 29–31) — user-facing Settings language switcher, full e2e test.

---

## Phase 1 — Infrastructure

### Task 1: Install frontend i18n dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run from repo root:

```bash
pnpm add i18next@^23 react-i18next@^14 i18next-http-backend@^2 i18next-browser-languagedetector@^7 zod-i18n-map@^2 @tauri-apps/plugin-os@^2
```

- [ ] **Step 2: Verify**

Run: `pnpm list i18next react-i18next i18next-http-backend i18next-browser-languagedetector zod-i18n-map @tauri-apps/plugin-os`

Expected: all six packages reported with matching versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(i18n): add i18next + zod-i18n-map + plugin-os deps"
```

---

### Task 2: Rust — add `tauri-plugin-os`

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Add Cargo dependency**

In `src-tauri/Cargo.toml`, inside `[dependencies]`:

```toml
tauri-plugin-os = "2"
```

- [ ] **Step 2: Register plugin in builder**

In `src-tauri/src/lib.rs`, after `.plugin(tauri_plugin_deep_link::init())`:

```rust
.plugin(tauri_plugin_os::init())
```

- [ ] **Step 3: Allow capability**

In `src-tauri/capabilities/default.json`, inside `"permissions"`:

```json
"os:default"
```

- [ ] **Step 4: Verify**

```bash
find src-tauri -name '._*' -delete
source ~/.cargo/env && (cd src-tauri && cargo check)
```

Expected: clean build, no errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat(tauri): add plugin-os for OS locale detection"
```

---

### Task 3: Frontend — i18n resources module

**Files:**
- Create: `src/lib/i18n/resources.ts`

- [ ] **Step 1: Write module**

```typescript
// src/lib/i18n/resources.ts
export const SUPPORTED_LANGUAGES = ["en", "it"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const NAMESPACES = ["common", "auth", "kanban", "settings", "errors", "zod"] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const LOCAL_STORAGE_KEY = "sofi_locale";
export const BACKEND_LOAD_PATH = "/locales/{{lng}}/{{ns}}.json";

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/i18n/resources.ts
git commit -m "feat(i18n): supported languages + namespaces contract"
```

---

### Task 4: Frontend — locale detector (with tests)

**Files:**
- Create: `src/lib/i18n/detect.ts`
- Create: `src/lib/i18n/detect.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/i18n/detect.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectLocale } from "./detect";
import { LOCAL_STORAGE_KEY } from "./resources";

const osLocaleMock = vi.fn();
vi.mock("@tauri-apps/plugin-os", () => ({ locale: () => osLocaleMock() }));

describe("detectLocale", () => {
  beforeEach(() => {
    localStorage.clear();
    osLocaleMock.mockReset();
  });
  afterEach(() => localStorage.clear());

  it("returns cached value from localStorage when supported", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "it");
    expect(await detectLocale()).toBe("it");
  });

  it("ignores unsupported cached value and falls through to OS", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "fr");
    osLocaleMock.mockResolvedValue("it-IT");
    expect(await detectLocale()).toBe("it");
  });

  it("strips region from OS locale", async () => {
    osLocaleMock.mockResolvedValue("it-IT");
    expect(await detectLocale()).toBe("it");
  });

  it("falls back to 'en' when OS locale unsupported", async () => {
    osLocaleMock.mockResolvedValue("fr-FR");
    expect(await detectLocale()).toBe("en");
  });

  it("falls back to 'en' when OS returns null", async () => {
    osLocaleMock.mockResolvedValue(null);
    expect(await detectLocale()).toBe("en");
  });

  it("falls back to 'en' when plugin throws", async () => {
    osLocaleMock.mockRejectedValue(new Error("no plugin"));
    expect(await detectLocale()).toBe("en");
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `pnpm vitest run src/lib/i18n/detect.test.ts`

Expected: FAIL — "Cannot find module './detect'".

- [ ] **Step 3: Implement**

```typescript
// src/lib/i18n/detect.ts
import { locale as osLocale } from "@tauri-apps/plugin-os";
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  LOCAL_STORAGE_KEY,
  type SupportedLanguage,
} from "./resources";

export async function detectLocale(): Promise<SupportedLanguage> {
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (isSupportedLanguage(cached)) return cached;

  try {
    const os = await osLocale();
    if (os) {
      const short = os.split("-")[0];
      if (isSupportedLanguage(short)) return short;
    }
  } catch {
    // plugin-os unavailable (e.g. running outside Tauri) — fall through.
  }

  return DEFAULT_LANGUAGE;
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm vitest run src/lib/i18n/detect.test.ts`

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n/detect.ts src/lib/i18n/detect.test.ts
git commit -m "feat(i18n): locale detector with OS fallback"
```

---

### Task 5: Frontend — i18n bootstrap

**Files:**
- Create: `src/lib/i18n/index.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write bootstrap**

```typescript
// src/lib/i18n/index.ts
import i18n from "i18next";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import { detectLocale } from "./detect";
import {
  BACKEND_LOAD_PATH,
  DEFAULT_LANGUAGE,
  LOCAL_STORAGE_KEY,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
} from "./resources";

let bootstrapPromise: Promise<typeof i18n> | null = null;

export function bootstrapI18n(): Promise<typeof i18n> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const initial = await detectLocale();
    await i18n
      .use(HttpBackend)
      .use(initReactI18next)
      .init({
        lng: initial,
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: [...SUPPORTED_LANGUAGES],
        ns: [...NAMESPACES],
        defaultNS: "common",
        fallbackNS: "common",
        backend: { loadPath: BACKEND_LOAD_PATH },
        interpolation: { escapeValue: false },
        react: { useSuspense: true },
        returnEmptyString: false,
      });
    localStorage.setItem(LOCAL_STORAGE_KEY, initial);
    return i18n;
  })();
  return bootstrapPromise;
}

export { i18n };
```

- [ ] **Step 2: Wire into main.tsx**

In `src/main.tsx`, replace the imports block top with:

```tsx
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { authKeys } from "@/features/auth/queries/keys";
import { invalidateBearerCache } from "@/lib/api-client";
import { ErrorCode, isAppError } from "@/lib/errors";
import { bootstrapI18n } from "@/lib/i18n";
import { invoke } from "@/lib/tauri";
import { createAppRouter } from "./router";
import "./styles/globals.css";
```

Then replace the `ReactDOM.createRoot(...)` call at the bottom with:

```tsx
bootstrapI18n().then(() => {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <Suspense fallback={null}>
              <RouterProvider router={router} />
            </Suspense>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
});
```

`invalidateBearerCache` does not exist in the codebase under that name; if `pnpm tsc --noEmit` complains, replace with the existing `clearClientAuth` flow from `src/lib/api-client.ts` (this plan treats `main.tsx` as otherwise unchanged — do not refactor existing logic in this task).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/index.ts src/main.tsx
git commit -m "feat(i18n): bootstrap i18next before React mounts"
```

---

### Task 6: Frontend — seed English bundle files (empty shells)

**Files:**
- Create: `public/locales/en/common.json`
- Create: `public/locales/en/auth.json`
- Create: `public/locales/en/kanban.json`
- Create: `public/locales/en/settings.json`
- Create: `public/locales/en/errors.json`
- Create: `public/locales/en/zod.json`
- Create: `public/locales/it/common.json`
- Create: `public/locales/it/auth.json`
- Create: `public/locales/it/kanban.json`
- Create: `public/locales/it/settings.json`
- Create: `public/locales/it/errors.json`
- Create: `public/locales/it/zod.json`

- [ ] **Step 1: Create the twelve files**

Each of the twelve files contains `{}`, except `en/zod.json` and `it/zod.json` which are copied from the package:

```bash
mkdir -p public/locales/en public/locales/it
for f in common auth kanban settings errors; do
  printf '{}\n' > "public/locales/en/$f.json"
  printf '{}\n' > "public/locales/it/$f.json"
done
cp node_modules/zod-i18n-map/locales/en/zod.json public/locales/en/zod.json
cp node_modules/zod-i18n-map/locales/it/zod.json public/locales/it/zod.json
```

- [ ] **Step 2: Commit**

```bash
git add public/locales/
git commit -m "feat(i18n): seed empty JSON bundles for en + it"
```

---

### Task 7: Frontend — Rust error translator (with tests)

**Files:**
- Create: `src/lib/i18n/error-codes.ts`
- Create: `src/lib/i18n/error-codes.test.ts`
- Modify: `src/lib/errors.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/i18n/error-codes.test.ts
import i18n from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import { translateErrorKind } from "./error-codes";

beforeAll(async () => {
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: {
        errors: {
          "keychain.access_denied": "Cannot access system keychain.",
          "internal.unknown": "Something went wrong.",
        },
      },
    },
  });
});

describe("translateErrorKind", () => {
  it("returns translated string for known kind", () => {
    expect(translateErrorKind("keychain.access_denied")).toBe("Cannot access system keychain.");
  });

  it("falls back to internal.unknown for unknown kind", () => {
    expect(translateErrorKind("something.new")).toBe("Something went wrong.");
  });

  it("falls back to internal.unknown when kind undefined", () => {
    expect(translateErrorKind(undefined)).toBe("Something went wrong.");
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm vitest run src/lib/i18n/error-codes.test.ts`

Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```typescript
// src/lib/i18n/error-codes.ts
import { i18n } from "./index";

const UNKNOWN_KEY = "errors:internal.unknown";

export function translateErrorKind(kind: string | undefined): string {
  if (!kind) return i18n.t(UNKNOWN_KEY);
  const key = `errors:${kind}`;
  const translated = i18n.t(key);
  if (translated === key) {
    console.warn("[i18n] unmapped error kind", kind);
    return i18n.t(UNKNOWN_KEY);
  }
  return translated;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `pnpm vitest run src/lib/i18n/error-codes.test.ts`

Expected: PASS.

- [ ] **Step 5: Wire into errors.ts**

In `src/lib/errors.ts`, add at the bottom:

```typescript
import { translateErrorKind } from "./i18n/error-codes";

export function getDisplayMessage(error: AppError): string {
  if (error.kind) return translateErrorKind(error.kind);
  return error.message;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/i18n/error-codes.ts src/lib/i18n/error-codes.test.ts src/lib/errors.ts
git commit -m "feat(i18n): translate AppError via kind slug"
```

---

### Task 8: Rust — refactor `AppError` to carry a `kind` slug

**Files:**
- Modify: `src-tauri/src/error.rs`
- Create: `src-tauri/tests/error_kinds.rs`

- [ ] **Step 1: Write failing Rust test**

```rust
// src-tauri/tests/error_kinds.rs
use sofi_lib::error::AppError;
use serde_json::Value;

#[test]
fn keychain_access_denied_serializes_with_kind() {
    let err = AppError::KeychainAccessDenied("macos -25293".into());
    let v: Value = serde_json::to_value(&err).unwrap();
    assert_eq!(v["kind"], "keychain.access_denied");
    assert_eq!(v["code"], 500);
    assert_eq!(v["message"], "macos -25293");
}

#[test]
fn oauth_cancelled_serializes_without_message_arg() {
    let err = AppError::OauthCancelled;
    let v: Value = serde_json::to_value(&err).unwrap();
    assert_eq!(v["kind"], "oauth.cancelled");
    assert_eq!(v["message"], "OAuth sign-in was cancelled.");
}
```

Note: `sofi_lib` here is the crate name defined in `src-tauri/Cargo.toml` (usually `lib.name = "sofi_lib"` or the package name). Adjust the import if the crate is named differently.

- [ ] **Step 2: Run — expect fail**

```bash
source ~/.cargo/env && (cd src-tauri && cargo test --test error_kinds)
```

Expected: FAIL — variants don't exist yet.

- [ ] **Step 3: Replace `AppError` in `src-tauri/src/error.rs`**

```rust
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Keychain access denied: {0}")]
    KeychainAccessDenied(String),

    #[error("Keychain unavailable: {0}")]
    KeychainUnavailable(String),

    #[error("OAuth sign-in was cancelled.")]
    OauthCancelled,

    #[error("OAuth provider error: {0}")]
    OauthProviderError(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl AppError {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::KeychainAccessDenied(_) => "keychain.access_denied",
            Self::KeychainUnavailable(_) => "keychain.unavailable",
            Self::OauthCancelled => "oauth.cancelled",
            Self::OauthProviderError(_) => "oauth.provider_error",
            Self::Internal(_) => "internal.unknown",
        }
    }

    pub fn status_code(&self) -> u16 {
        500
    }

    pub fn user_message(&self) -> String {
        self.to_string()
    }
}

impl From<keyring::Error> for AppError {
    fn from(err: keyring::Error) -> Self {
        match err {
            keyring::Error::NoStorageAccess(_) | keyring::Error::PlatformFailure(_) => {
                Self::KeychainAccessDenied(err.to_string())
            }
            _ => Self::KeychainUnavailable(err.to_string()),
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 3)?;
        state.serialize_field("code", &self.status_code())?;
        state.serialize_field("kind", self.kind())?;
        state.serialize_field("message", &self.user_message())?;
        state.end()
    }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
(cd src-tauri && cargo test --test error_kinds)
```

Expected: both tests PASS.

- [ ] **Step 5: Audit callers**

```bash
rg 'AppError::(Keychain|Oauth|Internal)\(' src-tauri/src
```

Each hit must map to one of the five new variants. If a caller uses the old `Keychain(msg)` / `Oauth(msg)`, rename to `KeychainUnavailable(msg)` / `OauthProviderError(msg)` (safer default for unknown paths).

- [ ] **Step 6: Full Rust build**

```bash
find src-tauri -name '._*' -delete
(cd src-tauri && cargo check && cargo test)
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/error.rs src-tauri/tests/error_kinds.rs
git commit -m "refactor(rust): AppError exposes kind slug for i18n translation"
```

---

### Task 9: Frontend — seed `errors.json` with the five Rust slugs

**Files:**
- Modify: `public/locales/en/errors.json`

- [ ] **Step 1: Write content**

```json
{
  "keychain.access_denied": "Sofi can't access your system keychain. Please check your OS keychain settings.",
  "keychain.unavailable": "System keychain is unavailable on this device.",
  "oauth.cancelled": "Sign-in was cancelled.",
  "oauth.provider_error": "The identity provider returned an error. Please try again.",
  "internal.unknown": "Something went wrong. Please try again."
}
```

- [ ] **Step 2: Commit**

```bash
git add public/locales/en/errors.json
git commit -m "feat(i18n): English strings for Rust error kinds"
```

---

### Task 10: Frontend — inject `Accept-Language` header

**Files:**
- Modify: `src/lib/api-client.ts`

- [ ] **Step 1: Add import at top of file**

```typescript
import { i18n } from "./i18n";
```

- [ ] **Step 2: Set header inside `request()`**

Inside `src/lib/api-client.ts::request()`, immediately after the `mergedHeaders = new Headers(headers)` line (currently line 59), add:

```typescript
mergedHeaders.set("Accept-Language", i18n.language || "en");
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat(i18n): send Accept-Language on every API call"
```

---

### Task 11: Django — enable LocaleMiddleware + LANGUAGES + LOCALE_PATHS

**Files:**
- Modify: `backend/sofi_api/settings/base.py`

- [ ] **Step 1: Add MIDDLEWARE entry**

In `backend/sofi_api/settings/base.py`, in the `MIDDLEWARE` list, insert `django.middleware.locale.LocaleMiddleware` *between* `SessionMiddleware` and `CommonMiddleware`:

```python
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]
```

- [ ] **Step 2: Add LANGUAGES, LOCALE_PATHS, keep existing LANGUAGE_CODE**

Replace the existing `LANGUAGE_CODE = "en-us"` line with:

```python
from django.utils.translation import gettext_lazy as _

LANGUAGE_CODE = "en"
LANGUAGES = [
    ("en", _("English")),
    ("it", _("Italian")),
]
LOCALE_PATHS = [BASE_DIR / "locale"]
```

Ensure the `gettext_lazy` import sits near the top of the file with the other imports.

- [ ] **Step 3: Verify Django still boots**

```bash
cd backend && uv run python manage.py check
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 4: Commit**

```bash
git add backend/sofi_api/settings/base.py
git commit -m "feat(django): enable LocaleMiddleware + LANGUAGES for i18n"
```

---

### Task 12: Django — `UserSettings.locale` field + migration

**Files:**
- Modify: `backend/apps/users/models.py`
- Create: `backend/apps/users/migrations/0004_usersettings_locale.py` (auto-generated)

- [ ] **Step 1: Extend the model**

In `backend/apps/users/models.py`, inside `class UserSettings`:

```python
class UserSettings(models.Model):
    class Theme(models.TextChoices):
        SYSTEM = "system", "System"
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"

    class Locale(models.TextChoices):
        ENGLISH = "en", "English"
        ITALIAN = "it", "Italiano"

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="settings"
    )
    theme = models.CharField(max_length=16, choices=Theme.choices, default=Theme.SYSTEM)
    locale = models.CharField(max_length=8, choices=Locale.choices, default=Locale.ENGLISH)
    default_agent_type = models.CharField(max_length=64, default="claude-code")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

- [ ] **Step 2: Generate migration**

```bash
cd backend && uv run python manage.py makemigrations users
```

Expected: `Migrations for 'users': 0004_usersettings_locale.py`.

- [ ] **Step 3: Apply migration locally**

```bash
cd backend && uv run python manage.py migrate
```

Expected: `Applying users.0004_usersettings_locale... OK`.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/users/models.py backend/apps/users/migrations/0004_usersettings_locale.py
git commit -m "feat(db): add UserSettings.locale field"
```

---

### Task 13: Django — expose `/api/users/settings/` for PATCH

**Files:**
- Modify: `backend/apps/users/serializers.py`
- Modify: `backend/apps/users/views.py`
- Modify: `backend/apps/users/urls_tokens.py`
- Create: `backend/apps/users/tests_settings.py`

- [ ] **Step 1: Extend UserSettingsSerializer**

In `backend/apps/users/serializers.py`, replace the existing `UserSettingsSerializer` block with:

```python
class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ("theme", "locale", "default_agent_type", "updated_at")
        read_only_fields = ("updated_at",)
```

- [ ] **Step 2: Add view**

In `backend/apps/users/views.py`, after `class ApiTokenViewSet`, add:

```python
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import UserSettings
from .serializers import UserSettingsSerializer


class UserSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        return Response(UserSettingsSerializer(settings).data)

    def patch(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
```

- [ ] **Step 3: Route the endpoint**

At the top of `backend/sofi_api/urls.py`, import and wire it. Locate the block that routes `users/` and add a path. If `urls_tokens.py` is the only users-scoped router, create `backend/apps/users/urls.py`:

```python
# backend/apps/users/urls.py
from django.urls import path
from .views import UserSettingsView

urlpatterns = [
    path("settings/", UserSettingsView.as_view(), name="user-settings"),
]
```

And include it in `backend/sofi_api/urls.py` (add an include line alongside the existing ones):

```python
path("api/users/", include("apps.users.urls")),
```

- [ ] **Step 4: Write test**

```python
# backend/apps/users/tests_settings.py
import pytest
from rest_framework.test import APIClient
from apps.users.models import User, UserSettings


@pytest.fixture
def authed_client(db):
    user = User.objects.create_user(email="u@example.com", password="pw12345678")
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def test_patch_locale_persists(authed_client):
    client, user = authed_client
    response = client.patch("/api/users/settings/", {"locale": "it"}, format="json")
    assert response.status_code == 200
    assert response.data["locale"] == "it"
    user.settings.refresh_from_db()
    assert user.settings.locale == "it"


def test_patch_invalid_locale_rejected(authed_client):
    client, _ = authed_client
    response = client.patch("/api/users/settings/", {"locale": "xx"}, format="json")
    assert response.status_code == 400
```

- [ ] **Step 5: Run — expect pass**

```bash
cd backend && uv run pytest apps/users/tests_settings.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/apps/users/serializers.py backend/apps/users/views.py backend/apps/users/urls.py backend/sofi_api/urls.py backend/apps/users/tests_settings.py
git commit -m "feat(api): PATCH /api/users/settings/ for locale + theme updates"
```

---

### Task 14: Django — wrap allauth email templates with `{% trans %}`

**Files:**
- Modify: `backend/apps/users/templates/account/email/email_confirmation_subject.txt`
- Modify: `backend/apps/users/templates/account/email/email_confirmation_message.txt`
- Modify: `backend/apps/users/templates/users/email_verified.html`

- [ ] **Step 1: Update subject template**

Replace the entire file content of `email_confirmation_subject.txt` with:

```
{% load i18n %}{% blocktrans %}Confirm your Sofi email{% endblocktrans %}
```

- [ ] **Step 2: Update message template**

Replace the entire file content of `email_confirmation_message.txt` with:

```
{% load i18n %}{% blocktrans with site_name=current_site.name user_display=user_display activate_url=activate_url %}
Hello {{ user_display }},

Welcome to {{ site_name }}. Please confirm your email by clicking the link below:

{{ activate_url }}

If you did not create an account, ignore this message.
{% endblocktrans %}
```

- [ ] **Step 3: Update landing page**

In `email_verified.html`, at the top add `{% load i18n %}`, then wrap every user-facing string with `{% trans "..." %}`. For example:

```html
{% load i18n %}
<!DOCTYPE html>
<html>
<head><title>{% trans "Email verified" %}</title></head>
<body>
  <h1>{% trans "Your email is verified" %}</h1>
  <p>{% trans "You can return to the Sofi app now." %}</p>
  <a href="sofi://verified">{% trans "Open Sofi" %}</a>
</body>
</html>
```

(Adjust the HTML to match the existing structure — replace the text between tags with `{% trans %}` calls, keep layout as-is.)

- [ ] **Step 4: Commit**

```bash
git add backend/apps/users/templates/
git commit -m "feat(i18n): wrap allauth email templates with gettext"
```

---

### Task 15: Django — wrap serializer validation strings

**Files:**
- Modify: `backend/apps/users/serializers.py`

- [ ] **Step 1: Add gettext import**

At the top of `backend/apps/users/serializers.py`:

```python
from django.utils.translation import gettext_lazy as _
```

- [ ] **Step 2: Wrap the one custom message**

In `RegisterSerializer.validate_email`, change:

```python
raise serializers.ValidationError(
    "A user is already registered with this e-mail address.",
)
```

to:

```python
raise serializers.ValidationError(
    _("A user is already registered with this e-mail address."),
)
```

- [ ] **Step 3: Audit remaining user-facing strings**

Run:

```bash
cd backend && rg 'ValidationError\(["\x27]' apps/
```

For each hit not yet wrapped in `_()`, wrap it. For allauth / dj-rest-auth / password validators, **no action needed** — they use `gettext_lazy` internally.

- [ ] **Step 4: Commit**

```bash
git add backend/apps/users/serializers.py
git commit -m "feat(i18n): wrap custom serializer validation messages with gettext"
```

---

### Task 16: Django — generate `.po` files

**Files:**
- Create: `backend/locale/en/LC_MESSAGES/django.po`
- Create: `backend/locale/it/LC_MESSAGES/django.po`

- [ ] **Step 1: Create locale directory**

```bash
mkdir -p backend/locale
```

- [ ] **Step 2: Run makemessages**

```bash
cd backend && uv run python manage.py makemessages -l en -l it
```

Expected: `processing locale en` and `processing locale it`, creating `backend/locale/{en,it}/LC_MESSAGES/django.po`.

- [ ] **Step 3: Compile**

```bash
cd backend && uv run python manage.py compilemessages
```

Expected: `processing file django.po in ...` for both locales.

- [ ] **Step 4: Commit `.po` files only (not `.mo`)**

```bash
echo '*.mo' >> backend/locale/.gitignore
git add backend/locale/
git commit -m "feat(i18n): initial en + it .po files (empty Italian)"
```

---

## Phase 2 — Frontend extraction

Each task in this phase replaces hardcoded English strings in one namespace with `t()` calls and populates the `en/<namespace>.json` bundle. Italian bundles stay empty (fall back to `en` transparently).

**Template for every Phase-2 task:**

1. Open the file(s) for the namespace.
2. For each hardcoded English string:
   - Add a key to `public/locales/en/<namespace>.json`.
   - Replace the literal in JSX with `{t('<namespace>:<key>')}`.
3. Call `useTranslation('<namespace>')` at the top of each component that uses `t`.
4. Run `pnpm tsc --noEmit` and `pnpm lint`.
5. Start `pnpm tauri dev`, click through the affected screens, verify no raw keys or `undefined` appear.
6. Commit.

---

### Task 17: Extract `common` namespace (top bar + shared buttons)

**Files:**
- Modify: `src/components/top-bar/top-bar.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/shared/empty-state.tsx`
- Modify: `public/locales/en/common.json`

- [ ] **Step 1: Populate `en/common.json`**

```json
{
  "topbar": {
    "kanban": "Kanban",
    "terminal": "TERMINAL",
    "git": "GIT",
    "boards": "Boards",
    "newBoard": "+ New Board...",
    "signOut": "Sign Out",
    "newBoardDialog": {
      "title": "New Board",
      "nameLabel": "Board Name",
      "namePlaceholder": "My Project",
      "repoLabel": "Repository Path (optional)",
      "repoPlaceholder": "/path/to/git/repo",
      "browse": "Browse",
      "create": "Create Board",
      "defaultName": "Untitled Board"
    }
  },
  "actions": {
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "retry": "Retry"
  }
}
```

- [ ] **Step 2: Replace literals in `top-bar.tsx`**

At the top of the component body in `src/components/top-bar/top-bar.tsx`:

```typescript
import { useTranslation } from "react-i18next";
// ...
export function TopBar() {
  const { t } = useTranslation("common");
  // ... existing code
}
```

Swap:
- `label={activeBoard?.name ?? "Kanban"}` → `label={activeBoard?.name ?? t("topbar.kanban")}`
- `label="TERMINAL"` → `label={t("topbar.terminal")}`
- `label="GIT"` → `label={t("topbar.git")}`
- `<MenuLabel>Boards</MenuLabel>` → `<MenuLabel>{t("topbar.boards")}</MenuLabel>`
- `<MenuItem onClick={() => setShowNewBoard(true)}>+ New Board...</MenuItem>` → `<MenuItem onClick={...}>{t("topbar.newBoard")}</MenuItem>`
- `<MenuItem onClick={() => logout.mutate()}>Sign Out</MenuItem>` → `<MenuItem ...>{t("topbar.signOut")}</MenuItem>`
- `"Untitled Board"` → `t("topbar.newBoardDialog.defaultName")`
- Dialog `title="New Board"` → `title={t("topbar.newBoardDialog.title")}`
- Field labels / placeholders / button labels → corresponding keys.

- [ ] **Step 3: Walk sidebar.tsx and empty-state.tsx**

Same pattern. Extract each visible string; add under a namespace of your choice (`sidebar.*`, `empty.*`) inside `common.json`.

- [ ] **Step 4: Verify**

```bash
pnpm tsc --noEmit && pnpm lint
pnpm tauri dev     # manually visit the top bar, open the New Board dialog
```

Expected: UI renders identically; no `t` keys appear as raw strings.

- [ ] **Step 5: Commit**

```bash
git add src/components/ public/locales/en/common.json
git commit -m "feat(i18n): extract common namespace (top bar, sidebar)"
```

---

### Task 18: Extract `auth` namespace

**Files:**
- Modify: `src/features/auth/components/login-page.tsx`
- Modify: `src/features/auth/components/register-page.tsx`
- Modify: `src/features/auth/components/check-email-page.tsx`
- Modify: `src/features/auth/components/verify-success-page.tsx`
- Modify: `src/features/auth/schemas.ts`
- Modify: `public/locales/en/auth.json`

- [ ] **Step 1: Populate `en/auth.json`**

```json
{
  "login": {
    "title": "Sign In",
    "signingIn": "Signing in...",
    "emailLabel": "Email",
    "emailPlaceholder": "you@example.com",
    "passwordLabel": "Password",
    "passwordPlaceholder": "••••••••",
    "or": "OR",
    "continueWithGoogle": "Continue with Google",
    "continueWithGithub": "Continue with GitHub",
    "newOperator": "New operator?",
    "createAccount": "Create account",
    "switchTheme": {
      "toLight": "Switch to light theme",
      "toDark": "Switch to dark theme"
    }
  },
  "register": {
    "title": "Create Account",
    "creating": "Creating...",
    "signUp": "Sign Up",
    "displayNameLabel": "Display Name",
    "displayNamePlaceholder": "Your name",
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "confirmPasswordLabel": "Confirm Password",
    "haveAccess": "Already have access?",
    "signIn": "Sign In"
  },
  "checkEmail": {
    "title": "Check your email",
    "body": "We sent a confirmation link to {{email}}. Click it to activate your account.",
    "resend": "Resend email",
    "resending": "Sending..."
  },
  "verifySuccess": {
    "title": "Email verified",
    "body": "You can return to the Sofi app now."
  },
  "validation": {
    "emailInvalid": "Invalid email address",
    "passwordRequired": "Password is required",
    "passwordMinLength": "At least 8 characters",
    "passwordMismatch": "Passwords do not match"
  }
}
```

- [ ] **Step 2: Switch Zod messages to `t()`**

In `src/features/auth/schemas.ts`:

```typescript
import { z } from "zod";
import { i18n } from "@/lib/i18n";

const tAuth = (key: string) => i18n.t(`auth:validation.${key}`);

export const loginSchema = z.object({
  email: z.string().email(() => tAuth("emailInvalid")),
  password: z.string().min(1, () => tAuth("passwordRequired")),
});

export const registerSchema = z
  .object({
    email: z.string().email(() => tAuth("emailInvalid")),
    password1: z.string().min(8, () => tAuth("passwordMinLength")),
    password2: z.string(),
    displayName: z.string().optional(),
  })
  .refine((d) => d.password1 === d.password2, {
    message: () => tAuth("passwordMismatch"),
    path: ["password2"],
  });
```

Using a function form (`() => tAuth(...)`) defers resolution until the error fires, so mid-session language changes take effect.

- [ ] **Step 3: Walk each page component**

Same pattern as Task 17: `useTranslation("auth")` at top, swap literals.

- [ ] **Step 4: Verify**

```bash
pnpm tsc --noEmit && pnpm lint
pnpm tauri dev   # manually: login page, register page, submit empty form, check error text
```

Expected: form errors in English, identical to before.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/ public/locales/en/auth.json
git commit -m "feat(i18n): extract auth namespace (login, register, verify)"
```

---

### Task 19: Extract `kanban` namespace

**Files:**
- Modify: `src/features/kanban/components/board.tsx`
- Modify: `src/features/kanban/components/column.tsx`
- Modify: `src/features/kanban/components/task-card.tsx`
- Modify: `src/features/kanban/components/task-detail-modal.tsx`
- Modify: `public/locales/en/kanban.json`

- [ ] **Step 1: Populate `en/kanban.json`**

Pattern: enumerate column titles, empty-state prompts, dialog labels, action buttons. Example keys:

```json
{
  "board": {
    "empty": "No boards yet. Create one to get started.",
    "emptyCta": "Create board"
  },
  "column": {
    "addTask": "Add task",
    "tasksCount_one": "{{count}} task",
    "tasksCount_other": "{{count}} tasks"
  },
  "taskCard": {
    "noDescription": "No description"
  },
  "taskDialog": {
    "edit": "Edit task",
    "create": "New task",
    "titleLabel": "Title",
    "descriptionLabel": "Description",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "confirmDelete": "Delete this task?"
  }
}
```

- [ ] **Step 2: Walk each file**

`useTranslation("kanban")` at top; swap each English literal.

- [ ] **Step 3: Verify**

```bash
pnpm tsc --noEmit && pnpm lint
pnpm tauri dev   # click through kanban flows: empty, create board, add column, add/edit/delete task
```

- [ ] **Step 4: Commit**

```bash
git add src/features/kanban/ public/locales/en/kanban.json
git commit -m "feat(i18n): extract kanban namespace"
```

---

### Task 20: Extract `settings` namespace

**Files:**
- Modify: `src/features/settings/components/settings-page.tsx`
- Modify: `src/features/settings/components/api-tokens-section.tsx`
- Modify: `public/locales/en/settings.json`

- [ ] **Step 1: Populate `en/settings.json`**

```json
{
  "page": {
    "title": "Settings"
  },
  "appearance": {
    "title": "Appearance",
    "description": "Choose how Sofi looks. System matches your OS preference automatically.",
    "system": "System",
    "systemDescription": "Follow your operating system",
    "light": "Light",
    "lightDescription": "Daylight mode",
    "dark": "Dark",
    "darkDescription": "Sofi's default cyberpunk feel"
  },
  "language": {
    "title": "Language",
    "description": "Choose your preferred language. Sofi will restart the UI in the selected language.",
    "english": "English",
    "italian": "Italiano"
  },
  "apiTokens": {
    "title": "API Tokens",
    "description": "Create named tokens for CLI access and external integrations.",
    "createButton": "+ New Token",
    "revoke": "Revoke",
    "confirmRevoke": "Revoke this token?"
  }
}
```

- [ ] **Step 2: Walk both files**

Add `useTranslation("settings")` and swap literals. Note the appearance-section radio options are derived in-component — convert to `t()` calls per option.

- [ ] **Step 3: Verify**

```bash
pnpm tsc --noEmit && pnpm lint
pnpm tauri dev   # visit Settings page
```

- [ ] **Step 4: Commit**

```bash
git add src/features/settings/ public/locales/en/settings.json
git commit -m "feat(i18n): extract settings namespace"
```

---

### Task 21: Hook Zod error map into `zod-i18n-map`

**Files:**
- Modify: `src/lib/i18n/index.ts`

- [ ] **Step 1: Add Zod error map after i18n init**

Append to the end of `bootstrapI18n()`'s inner async IIFE, just before the `return i18n;` line:

```typescript
const { z } = await import("zod");
const { makeZodI18nMap } = await import("zod-i18n-map");
z.setErrorMap(makeZodI18nMap({ t: i18n.t.bind(i18n), ns: "zod" }));
```

- [ ] **Step 2: Verify Zod errors are still English**

```bash
pnpm tauri dev   # submit empty login form
```

Expected: default Zod messages in English (now sourced from `zod.json`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/index.ts
git commit -m "feat(i18n): wire zod-i18n-map into bootstrap"
```

---

### Task 22: Auto-translate Rust error toasts

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Use `getDisplayMessage` in toast handlers**

In `src/main.tsx`, replace the `getErrorMessage` helper body:

```typescript
import { getDisplayMessage } from "@/lib/errors";

function getErrorMessage(error: unknown): string {
  return isAppError(error) ? getDisplayMessage(error) : "An unexpected error occurred";
}
```

Then swap the remaining English literal:

```typescript
return isAppError(error) ? getDisplayMessage(error) : i18n.t("errors:internal.unknown");
```

Add `import { i18n } from "@/lib/i18n";` at the top if not already present.

- [ ] **Step 2: Verify**

```bash
pnpm tsc --noEmit
pnpm tauri dev   # trigger a failure (e.g., invalid OAuth state) and confirm toast text
```

- [ ] **Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "feat(i18n): toast messages resolve via getDisplayMessage"
```

---

## Phase 3 — Italian translations

### Task 23: Fill `it/common.json`

**Files:**
- Modify: `public/locales/it/common.json`

- [ ] **Step 1: Translate every key from `en/common.json`**

Preserve the JSON tree shape exactly. Italian strings:

```json
{
  "topbar": {
    "kanban": "Kanban",
    "terminal": "TERMINALE",
    "git": "GIT",
    "boards": "Bacheche",
    "newBoard": "+ Nuova bacheca...",
    "signOut": "Esci",
    "newBoardDialog": {
      "title": "Nuova bacheca",
      "nameLabel": "Nome bacheca",
      "namePlaceholder": "Il mio progetto",
      "repoLabel": "Percorso repository (opzionale)",
      "repoPlaceholder": "/percorso/al/repo/git",
      "browse": "Sfoglia",
      "create": "Crea bacheca",
      "defaultName": "Bacheca senza titolo"
    }
  },
  "actions": {
    "cancel": "Annulla",
    "save": "Salva",
    "delete": "Elimina",
    "retry": "Riprova"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/locales/it/common.json
git commit -m "i18n(it): common namespace"
```

---

### Task 24: Fill `it/auth.json`

**Files:**
- Modify: `public/locales/it/auth.json`

- [ ] **Step 1: Translate**

```json
{
  "login": {
    "title": "Accedi",
    "signingIn": "Accesso in corso...",
    "emailLabel": "Email",
    "emailPlaceholder": "tu@esempio.com",
    "passwordLabel": "Password",
    "passwordPlaceholder": "••••••••",
    "or": "OPPURE",
    "continueWithGoogle": "Continua con Google",
    "continueWithGithub": "Continua con GitHub",
    "newOperator": "Nuovo operatore?",
    "createAccount": "Crea account",
    "switchTheme": {
      "toLight": "Passa al tema chiaro",
      "toDark": "Passa al tema scuro"
    }
  },
  "register": {
    "title": "Crea account",
    "creating": "Creazione...",
    "signUp": "Registrati",
    "displayNameLabel": "Nome visualizzato",
    "displayNamePlaceholder": "Il tuo nome",
    "emailLabel": "Email",
    "passwordLabel": "Password",
    "confirmPasswordLabel": "Conferma password",
    "haveAccess": "Hai già accesso?",
    "signIn": "Accedi"
  },
  "checkEmail": {
    "title": "Controlla la tua email",
    "body": "Abbiamo inviato un link di conferma a {{email}}. Cliccalo per attivare il tuo account.",
    "resend": "Invia di nuovo",
    "resending": "Invio in corso..."
  },
  "verifySuccess": {
    "title": "Email verificata",
    "body": "Ora puoi tornare all'app Sofi."
  },
  "validation": {
    "emailInvalid": "Indirizzo email non valido",
    "passwordRequired": "La password è obbligatoria",
    "passwordMinLength": "Almeno 8 caratteri",
    "passwordMismatch": "Le password non corrispondono"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/locales/it/auth.json
git commit -m "i18n(it): auth namespace"
```

---

### Task 25: Fill `it/kanban.json`

**Files:**
- Modify: `public/locales/it/kanban.json`

- [ ] **Step 1: Translate every key from `en/kanban.json`** — mirror shape exactly. Sample:

```json
{
  "board": {
    "empty": "Nessuna bacheca. Creane una per iniziare.",
    "emptyCta": "Crea bacheca"
  },
  "column": {
    "addTask": "Aggiungi attività",
    "tasksCount_one": "{{count}} attività",
    "tasksCount_other": "{{count}} attività"
  },
  "taskCard": {
    "noDescription": "Nessuna descrizione"
  },
  "taskDialog": {
    "edit": "Modifica attività",
    "create": "Nuova attività",
    "titleLabel": "Titolo",
    "descriptionLabel": "Descrizione",
    "save": "Salva",
    "cancel": "Annulla",
    "delete": "Elimina",
    "confirmDelete": "Eliminare questa attività?"
  }
}
```

Extend with whatever keys you added while doing Task 19. If a key in `en/kanban.json` has no Italian entry, that key will fall back to English at runtime — acceptable mid-development but must be filled before shipping.

- [ ] **Step 2: Commit**

```bash
git add public/locales/it/kanban.json
git commit -m "i18n(it): kanban namespace"
```

---

### Task 26: Fill `it/settings.json` and `it/errors.json`

**Files:**
- Modify: `public/locales/it/settings.json`
- Modify: `public/locales/it/errors.json`

- [ ] **Step 1: `it/settings.json`**

```json
{
  "page": {
    "title": "Impostazioni"
  },
  "appearance": {
    "title": "Aspetto",
    "description": "Scegli come appare Sofi. \"Sistema\" segue la preferenza del tuo sistema operativo.",
    "system": "Sistema",
    "systemDescription": "Segue il sistema operativo",
    "light": "Chiaro",
    "lightDescription": "Modalità giorno",
    "dark": "Scuro",
    "darkDescription": "L'aspetto cyberpunk predefinito di Sofi"
  },
  "language": {
    "title": "Lingua",
    "description": "Scegli la lingua preferita. Sofi riavvierà l'interfaccia nella lingua selezionata.",
    "english": "English",
    "italian": "Italiano"
  },
  "apiTokens": {
    "title": "Token API",
    "description": "Crea token denominati per accesso CLI e integrazioni esterne.",
    "createButton": "+ Nuovo token",
    "revoke": "Revoca",
    "confirmRevoke": "Revocare questo token?"
  }
}
```

- [ ] **Step 2: `it/errors.json`**

```json
{
  "keychain.access_denied": "Sofi non può accedere al portachiavi di sistema. Controlla le impostazioni del portachiavi.",
  "keychain.unavailable": "Il portachiavi di sistema non è disponibile su questo dispositivo.",
  "oauth.cancelled": "Accesso annullato.",
  "oauth.provider_error": "Il provider di identità ha restituito un errore. Riprova.",
  "internal.unknown": "Si è verificato un errore. Riprova."
}
```

- [ ] **Step 3: Commit**

```bash
git add public/locales/it/settings.json public/locales/it/errors.json
git commit -m "i18n(it): settings + errors namespaces"
```

---

### Task 27: Fill Italian `django.po`

**Files:**
- Modify: `backend/locale/it/LC_MESSAGES/django.po`

- [ ] **Step 1: Translate every `msgid` in the Italian file**

Open `backend/locale/it/LC_MESSAGES/django.po`. For each entry:

```
msgid "English"
msgstr "Inglese"

msgid "Italian"
msgstr "Italiano"

msgid "A user is already registered with this e-mail address."
msgstr "Un utente è già registrato con questo indirizzo email."

msgid "Confirm your Sofi email"
msgstr "Conferma la tua email Sofi"
```

Continue for every auto-extracted string. Strings from allauth/password-validators are already translated upstream — your `.po` only needs to cover strings you wrapped yourself.

- [ ] **Step 2: Compile**

```bash
cd backend && uv run python manage.py compilemessages
```

Expected: `processing file django.po in backend/locale/it/LC_MESSAGES`.

- [ ] **Step 3: Smoke test**

```bash
cd backend && uv run python manage.py shell <<'PY'
from django.utils.translation import activate, gettext
activate('it')
print(gettext('A user is already registered with this e-mail address.'))
PY
```

Expected: Italian output.

- [ ] **Step 4: Commit**

```bash
git add backend/locale/it/LC_MESSAGES/django.po
git commit -m "i18n(it): Django .po translations"
```

---

### Task 28: Add Django test — `Accept-Language` round-trip

**Files:**
- Create: `backend/apps/users/tests_i18n.py`

- [ ] **Step 1: Write test**

```python
# backend/apps/users/tests_i18n.py
import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_register_dup_email_italian():
    from apps.users.models import User
    User.objects.create_user(email="dup@example.com", password="pw12345678")

    client = APIClient()
    response = client.post(
        "/auth/registration/",
        {
            "email": "dup@example.com",
            "password1": "another1234",
            "password2": "another1234",
        },
        format="json",
        HTTP_ACCEPT_LANGUAGE="it",
    )
    assert response.status_code == 400
    body = response.json()
    # Django returns serializer errors like {"email": ["..."]}.
    assert "Un utente" in str(body) or "registrato" in str(body)


@pytest.mark.django_db
def test_register_dup_email_english():
    from apps.users.models import User
    User.objects.create_user(email="dup2@example.com", password="pw12345678")

    client = APIClient()
    response = client.post(
        "/auth/registration/",
        {
            "email": "dup2@example.com",
            "password1": "another1234",
            "password2": "another1234",
        },
        format="json",
        HTTP_ACCEPT_LANGUAGE="en",
    )
    assert response.status_code == 400
    body = response.json()
    assert "already registered" in str(body)
```

- [ ] **Step 2: Run**

```bash
cd backend && uv run pytest apps/users/tests_i18n.py -v
```

Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add backend/apps/users/tests_i18n.py
git commit -m "test(i18n): Accept-Language round-trip for DRF errors"
```

---

## Phase 4 — Switcher and e2e

### Task 29: Frontend — LocaleSync component

**Files:**
- Create: `src/lib/i18n/locale-sync.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/lib/i18n/locale-sync.tsx
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/features/auth/queries/hooks";
import { LOCAL_STORAGE_KEY, isSupportedLanguage } from "./resources";

export function LocaleSync() {
  const { i18n } = useTranslation();
  const { data: user } = useSession();

  useEffect(() => {
    const remote = (user as { settings?: { locale?: string } } | undefined)?.settings?.locale;
    if (!remote || !isSupportedLanguage(remote)) return;
    if (remote === i18n.language) return;
    i18n.changeLanguage(remote);
    localStorage.setItem(LOCAL_STORAGE_KEY, remote);
  }, [user, i18n]);

  return null;
}
```

If `useSession` doesn't return `settings` today, this effect is a no-op until Task 30 adds it to the session payload — acceptable. The session hook should be extended in Task 30 step 1.

- [ ] **Step 2: Mount inside main.tsx**

In `src/main.tsx`'s render tree, immediately inside `<QueryClientProvider>`:

```tsx
import { LocaleSync } from "@/lib/i18n/locale-sync";
// ...
<QueryClientProvider client={queryClient}>
  <LocaleSync />
  <Suspense fallback={null}>
    <RouterProvider router={router} />
  </Suspense>
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/i18n/locale-sync.tsx src/main.tsx
git commit -m "feat(i18n): LocaleSync syncs i18n.language from session"
```

---

### Task 30: Settings — language switcher section

**Files:**
- Create: `src/features/settings/components/language-section.tsx`
- Create: `src/features/settings/queries/mutations.ts`
- Modify: `src/features/settings/queries/keys.ts`
- Modify: `src/features/settings/components/settings-page.tsx`
- Modify: `src/features/auth/queries/options.ts` (to include settings in session payload)

- [ ] **Step 1: Extend session to include settings**

In `src/features/auth/queries/options.ts`, update the session fetch to merge `/api/users/settings/` into the returned user object (or add a parallel `useUserSettings` hook if cleaner — see existing patterns in `queries/options.ts`).

- [ ] **Step 2: Write mutation**

```typescript
// src/features/settings/queries/mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { authKeys } from "@/features/auth/queries/keys";
import type { SupportedLanguage } from "@/lib/i18n/resources";
import { i18n } from "@/lib/i18n";
import { LOCAL_STORAGE_KEY } from "@/lib/i18n/resources";

export function useUpdateLocale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locale: SupportedLanguage) =>
      apiClient.patch<{ locale: SupportedLanguage }>("/api/users/settings/", { locale }),
    onSuccess: async ({ locale }) => {
      await i18n.changeLanguage(locale);
      localStorage.setItem(LOCAL_STORAGE_KEY, locale);
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}
```

- [ ] **Step 3: Write LanguageSection**

```tsx
// src/features/settings/components/language-section.tsx
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/resources";
import { useUpdateLocale } from "../queries/mutations";

export function LanguageSection() {
  const { t, i18n } = useTranslation("settings");
  const mutation = useUpdateLocale();

  const labels: Record<SupportedLanguage, string> = {
    en: t("language.english"),
    it: t("language.italian"),
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-sofi-text">{t("language.title")}</h2>
        <p className="text-base text-sofi-text-muted">{t("language.description")}</p>
      </div>
      <div
        role="radiogroup"
        aria-label={t("language.title")}
        className="flex items-center gap-2 rounded-lg border border-sofi-border bg-sofi-elevated p-1"
      >
        {SUPPORTED_LANGUAGES.map((code) => {
          const isActive = i18n.language === code;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => mutation.mutate(code)}
              disabled={mutation.isPending}
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-base font-medium transition-colors",
                isActive
                  ? "bg-violet-primary text-white shadow-lg shadow-violet-primary/20"
                  : "text-sofi-text-muted hover:bg-sofi-border hover:text-sofi-text",
              )}
            >
              {labels[code]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Render in SettingsPage**

In `src/features/settings/components/settings-page.tsx`, after `<AppearanceSection />`:

```tsx
import { LanguageSection } from "./language-section";
// ...
<AppearanceSection />
<LanguageSection />
<ApiTokensSection />
```

- [ ] **Step 5: Verify**

```bash
pnpm tsc --noEmit && pnpm lint
pnpm tauri dev
# 1. Go to Settings
# 2. Click Italiano — observe top bar text switch to Italian immediately
# 3. Click English — back to English
```

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/ src/features/auth/queries/options.ts
git commit -m "feat(settings): language switcher with server-side persistence"
```

---

### Task 31: Playwright e2e — i18n round-trip

**Files:**
- Create: `tests/e2e/i18n.spec.ts`

- [ ] **Step 1: Write the spec**

```typescript
// tests/e2e/i18n.spec.ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    // stub plugin-os locale() to return English on cold start
    // @ts-expect-error test-only global
    window.__TAURI_INTERNALS__ = {
      ...(window.__TAURI_INTERNALS__ ?? {}),
      invoke: async (cmd: string) => (cmd === "plugin:os|locale" ? "en-US" : null),
    };
  });
});

test("boots in English, switches via Settings, translates Zod and Django errors", async ({
  page,
}) => {
  // Step 1: Boot in English.
  await page.goto("/");
  await expect(page.getByText("Sign In")).toBeVisible();

  // Step 2: Sign in (reuse an existing seeded user, or adjust to your test auth setup).
  await page.fill("input[type=email]", "test@example.com");
  await page.fill("input[type=password]", "correcthorse");
  await page.click('button:has-text("Sign In")');

  // Step 3: Switch language.
  await page.goto("/settings");
  await page.click('button:has-text("Italiano")');
  await expect(page.getByText("Esci")).toBeVisible();

  // Step 4: Zod error in Italian.
  await page.goto("/login");
  await page.click('button:has-text("Accedi")');
  await expect(page.getByText(/Indirizzo email non valido|obbligatoria/)).toBeVisible();
});
```

- [ ] **Step 2: Run**

```bash
pnpm test:e2e tests/e2e/i18n.spec.ts
```

Expected: 1 passed. (Adjust locators to match your existing auth/test fixtures if the seeded user pattern is different — check `tests/e2e/auth.spec.ts` for conventions.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/i18n.spec.ts
git commit -m "test(e2e): i18n round-trip (boot → switch → Zod → DRF)"
```

---

### Task 32: CI guards — key parity + compilemessages freshness

**Files:**
- Create: `scripts/check-i18n-keys.mjs`
- Modify: `package.json`
- Modify: `.husky/pre-commit` or CI workflow (whichever the repo uses)

- [ ] **Step 1: Write parity checker**

```javascript
// scripts/check-i18n-keys.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "it"];
const BASE = "public/locales";

function flatten(obj, prefix = "") {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      for (const nested of flatten(v, key)) out.add(nested);
    } else {
      out.add(key);
    }
  }
  return out;
}

const namespaces = readdirSync(join(BASE, "en"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));

let failed = false;
for (const ns of namespaces) {
  const bundles = Object.fromEntries(
    LOCALES.map((lng) => [
      lng,
      flatten(JSON.parse(readFileSync(join(BASE, lng, `${ns}.json`), "utf8"))),
    ]),
  );
  const en = bundles.en;
  for (const lng of LOCALES.filter((l) => l !== "en")) {
    const missing = [...en].filter((k) => !bundles[lng].has(k));
    const extra = [...bundles[lng]].filter((k) => !en.has(k));
    if (missing.length) {
      console.error(`[i18n] ${lng}/${ns}.json missing keys:\n  ${missing.join("\n  ")}`);
      failed = true;
    }
    if (extra.length) {
      console.error(`[i18n] ${lng}/${ns}.json has extra keys:\n  ${extra.join("\n  ")}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log("[i18n] key parity OK");
```

- [ ] **Step 2: Add npm script**

In `package.json` under `"scripts"`:

```json
"i18n:check": "node scripts/check-i18n-keys.mjs"
```

- [ ] **Step 3: Wire into pre-commit**

In `.husky/pre-commit`, append:

```bash
pnpm i18n:check
cd backend && uv run python manage.py compilemessages
```

- [ ] **Step 4: Run**

```bash
pnpm i18n:check
```

Expected: `[i18n] key parity OK`.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-i18n-keys.mjs package.json .husky/pre-commit
git commit -m "ci(i18n): key parity + compilemessages pre-commit guards"
```

---

## Rollout

Once Phase 4 is green:

1. Merge the branch to `dev`.
2. Take the app out for a manual bilingual smoke test: boot in English (OS=en), switch to Italian, click through kanban → terminal → settings → git, trigger a failing login, trigger a failing registration, open email-confirmation link.
3. If anything reads English mid-Italian-UI, find the missing key (`public/locales/it/*.json` or `backend/locale/it/LC_MESSAGES/django.po`), fix, push.

## Verification checklist

- [ ] `pnpm vitest run` — all frontend unit tests green
- [ ] `(cd src-tauri && cargo test)` — Rust error-kind tests green
- [ ] `cd backend && uv run pytest` — Django test suite green (including new settings and i18n tests)
- [ ] `pnpm test:e2e tests/e2e/i18n.spec.ts` — Playwright i18n spec green
- [ ] `pnpm i18n:check` — key parity green
- [ ] Manual smoke test as above — passes without English bleed-through in Italian mode
