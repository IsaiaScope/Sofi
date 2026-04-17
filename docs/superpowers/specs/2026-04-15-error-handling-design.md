# Error Handling Strategy — Design Spec

## Context

Sofi currently has no systematic error handling. Backend errors serialize as plain strings, the frontend has no toast system, no error boundaries, and no global error handlers beyond a fragile string-matching auth check. Errors in kanban, git, and terminal features are silently swallowed. This spec introduces a full-stack error management strategy.

## Overview

| Layer | Solution |
|-------|----------|
| Backend errors | Structured `{ code, message }` JSON from Rust `AppError` |
| Frontend error type | Shared `AppError` interface + `isAppError()` guard |
| Invoke wrapper | Normalizes all Tauri IPC errors to `AppError` |
| Toast notifications | [Sonner](https://sonner.emilkowal.ski/) (shadcn toast) |
| Global error handlers | `QueryCache.onError` + `MutationCache.onError` |
| React error boundary | Wraps `<RouterProvider>` as catastrophic fallback |
| Route-level errors | TanStack Router `errorComponent` / `notFoundComponent` |
| Form errors | Existing inline `FieldError` pattern (unchanged) |

## 1. Backend Structured Errors

**File:** `src-tauri/src/error.rs`

Change the `Serialize` impl from `serialize_str` to a struct with `code` (numeric) and `message` (user-friendly string):

```rust
impl AppError {
    fn status_code(&self) -> u16 {
        match self {
            Self::Validation(_) => 400,
            Self::Auth(_) => 401,
            Self::NotFound(_) => 404,
            Self::Database(_) | Self::Internal(_) => 500,
        }
    }

    fn user_message(&self) -> String {
        match self {
            Self::Database(e) => format!("A database error occurred: {e}"),
            Self::Auth(msg) | Self::NotFound(msg)
            | Self::Validation(msg) | Self::Internal(msg) => msg.clone(),
        }
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", &self.status_code())?;
        state.serialize_field("message", &self.user_message())?;
        state.end()
    }
}
```

**Frontend receives:** `{ code: 401, message: "Invalid password" }` as the rejected promise value from `invoke()`. Tauri 2.0 delivers the `Serialize` output directly — no wrapping.

### Error code mapping

| Variant | Code | Meaning |
|---------|------|---------|
| `Validation(String)` | 400 | Bad input (too short, invalid format) |
| `Auth(String)` | 401 | Authentication/authorization failure |
| `NotFound(String)` | 404 | Resource not found |
| `Database(sqlx::Error)` | 500 | Database error |
| `Internal(String)` | 500 | Catch-all internal error |

## 2. Frontend Error Type

**New file:** `src/lib/errors.ts`

```typescript
export interface AppError {
  code: number;
  message: string;
}

export const ErrorCode = {
  VALIDATION: 400,
  AUTH: 401,
  NOT_FOUND: 404,
  INTERNAL: 500,
} as const;

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as AppError).code === "number" &&
    typeof (error as AppError).message === "string"
  );
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  return {
    code: ErrorCode.INTERNAL,
    message: typeof error === "string" ? error : "An unexpected error occurred",
  };
}
```

## 3. Invoke Wrapper

**File:** `src/lib/tauri.ts`

Add try/catch that normalizes all errors to `AppError`:

```typescript
import { toAppError } from "./errors";

export async function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  if (!isTauri) {
    return getMockResponse<T>(cmd);
  }
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (error) {
    throw toAppError(error);
  }
}
```

This handles both:
- Structured `AppError` objects from Rust commands
- Unstructured strings from Tauri itself (e.g., `"command not found"`)

## 4. Toast Notifications (Sonner)

**Install:** `pnpm add sonner`

**Toaster placement** — in `src/routes/__root.tsx` (or `src/main.tsx`):

```tsx
import { Toaster } from "sonner";

// Inside root component:
<>
  <Outlet />
  <Toaster
    theme="dark"
    position="bottom-right"
    toastOptions={{
      style: {
        background: "var(--color-sofi-surface)",
        border: "1px solid var(--color-sofi-border)",
        color: "var(--color-sofi-text)",
      },
    }}
  />
</>
```

**Usage** — anywhere in the app:

```typescript
import { toast } from "sonner";

toast.error("Failed to create task");
toast.success("Board created");
```

## 5. Global Error Handlers (QueryCache + MutationCache)

**File:** `src/main.tsx`

TanStack Query v5 removed global `onError` from `defaultOptions.queries`. Use `QueryCache` and `MutationCache` constructors instead:

```typescript
import { QueryCache, MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAppError, ErrorCode } from "@/lib/errors";
import { authKeys } from "@/features/auth/queries/keys";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAppError(error) && error.code === ErrorCode.AUTH) {
        localStorage.removeItem("sofi_token");
        queryClient.setQueryData(authKeys.session(), null);
        return;
      }
      // Query errors get a toast (queries that show inline errors can suppress via meta)
      toast.error(isAppError(error) ? error.message : "An unexpected error occurred");
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (isAppError(error) && error.code === ErrorCode.AUTH) {
        localStorage.removeItem("sofi_token");
        queryClient.setQueryData(authKeys.session(), null);
        return;
      }
      // Skip toast for mutations that show inline errors (e.g., login/register forms)
      if (mutation.meta?.suppressToast) return;
      toast.error(isAppError(error) ? error.message : "An unexpected error occurred");
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});
```

### Suppressing duplicate toasts for inline errors

Auth forms already show inline errors. To prevent both an inline error AND a toast appearing:
- Use TanStack Query's `meta` field: `useMutation({ meta: { suppressToast: true } })`
- Check `meta` in the global handler: `if (mutation.meta?.suppressToast) return;`

## 6. React Error Boundary

**New file:** `src/components/error-boundary.tsx`

A small class component (~25 lines) wrapping `<RouterProvider>` in `src/main.tsx` as a catastrophic fallback for when the router itself fails:

```tsx
// In main.tsx:
<ErrorBoundary fallback={<CrashFallback />}>
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
    <Toaster ... />
  </QueryClientProvider>
</ErrorBoundary>
```

The fallback shows: app logo, "Something went wrong", a "Reload" button that calls `window.location.reload()`.

This does NOT catch most errors — TanStack Router's `errorComponent` catches route-level rendering errors. The boundary is only for catastrophic failures (router init crash, QueryClient crash).

## 7. TanStack Router Error Handling

**File:** `src/routes/__root.tsx`

```tsx
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RouteErrorFallback,
});

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster theme="dark" position="bottom-right" ... />
    </>
  );
}
```

`RouteErrorFallback` renders an in-app error page with the error message and a "Go back" / "Reload" button.

Individual routes (e.g., `_authenticated`) can define their own `errorComponent` for feature-specific fallbacks.

## 8. Fix Existing Inline Error Displays

After the refactor, `loginMutation.error` is an `AppError` object. `String(error)` returns `"[object Object]"`.

**Files to update:**
- `src/features/auth/components/login-page.tsx` line 49: `String(loginMutation.error)` → `loginMutation.error.message`
- `src/features/auth/components/register-page.tsx` line 49: same change

## 9. Fix sessionQueryOptions

**File:** `src/features/auth/queries/options.ts`

Currently catches ALL errors and returns `null` (looks like "not logged in"). Must discriminate:

```typescript
catch (error) {
  if (isAppError(error) && error.code === ErrorCode.AUTH) {
    localStorage.removeItem(STORAGE_KEY);
    return null; // Not authenticated — expected
  }
  throw error; // 500s should propagate, not masquerade as logged-out
}
```

## Files Changed

| File | Change |
|------|--------|
| `src-tauri/src/error.rs` | Structured serialization with `status_code()` + `user_message()` |
| `src/lib/errors.ts` | **NEW** — `AppError` interface, `ErrorCode`, `isAppError()`, `toAppError()` |
| `src/lib/tauri.ts` | Add try/catch with `toAppError()` |
| `src/main.tsx` | `QueryCache`/`MutationCache` global handlers, `ErrorBoundary` wrapper |
| `src/components/error-boundary.tsx` | **NEW** — React error boundary class component |
| `src/routes/__root.tsx` | `errorComponent`, `Toaster` placement |
| `src/features/auth/components/login-page.tsx` | `.error.message` instead of `String(.error)` |
| `src/features/auth/components/register-page.tsx` | `.error.message` instead of `String(.error)` |
| `src/features/auth/queries/options.ts` | Discriminate auth errors from 500s |
| `src/features/auth/queries/mutations.ts` | Add `meta: { suppressToast: true }` |
| `package.json` | Add `sonner` dependency |

## Dependencies

| Package | Purpose |
|---------|---------|
| `sonner` | Toast notifications (shadcn toast) |

No other new dependencies. The error boundary is a custom class component (~25 lines).

## Verification

1. **Rust backend**: `cargo check` from `src-tauri/` to verify `AppError` serialization compiles
2. **Frontend build**: `pnpm build` to verify TypeScript types align
3. **Auth flow**: Login with wrong credentials → should see inline error (not toast) with clean message
4. **Mutation error**: Delete a task, simulate backend failure → should see toast notification
5. **Query error**: Disconnect DB, load board → should see toast
6. **Crash recovery**: Throw in a component render → should see route error fallback, not white screen
7. **Lint**: `pnpm lint` passes with no violations
