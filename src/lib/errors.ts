import { translateErrorKind } from "./i18n/error-codes";

export interface AppError {
  code: number;
  message: string;
  // Semantic error kind from the backend (separate from HTTP status). Lets the
  // UI react to specific error conditions without string-matching messages.
  kind?: string;
  // Per-field semantic codes: `{ email: ["auth.email_already_registered"], ... }`.
  // Surfaced by the Django custom exception handler; consumed by form-error
  // helpers that call react-hook-form's `setError` per field.
  fieldErrors?: Record<string, string[]>;
  // Seconds hint for rate-limit retries. Set when the server sends a
  // `Retry-After` header (429/503) or a `retry_after` field in the body.
  retryAfterSeconds?: number;
}

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: AppError;
  }
}

export const ErrorCode = {
  VALIDATION: 400,
  AUTH: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;

export const AppErrorKind = {
  EMAIL_NOT_VERIFIED: "auth.email_not_verified",
  INVALID_CREDENTIALS: "auth.invalid_credentials",
  EMAIL_ALREADY_REGISTERED: "auth.email_already_registered",
  PASSWORD_RESET_INVALID_TOKEN: "password_reset.invalid_token",
  RATE_LIMITED: "rate_limited",
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

/**
 * Returns true when the top-level error banner would add information beyond
 * what per-field inline messages already show. Rule: hide the banner only
 * when the error's top-level `kind` is also present in one of the field
 * error lists — i.e. the banner message and the field message would be
 * identical. Rate-limits, invalid credentials, network failures, and
 * mixed-scope errors all keep the banner because their `kind` isn't a
 * field-level code.
 */
export function shouldShowErrorBanner(error: AppError): boolean {
  if (!error.kind || !error.fieldErrors) return true;
  for (const codes of Object.values(error.fieldErrors)) {
    if (codes.includes(error.kind)) return false;
  }
  return true;
}

/**
 * Display text for a banner. Prefers kind-based translation (same English /
 * Italian regardless of what the server sent), falls back to the server's
 * already-translated `detail` string when the kind has no mapping.
 */
export function getDisplayMessage(error: AppError): string {
  if (error.kind) {
    // `rate_limited` without a retry hint renders a version that doesn't
    // promise a specific wait time — the `{{seconds}}` key would interpolate
    // empty otherwise.
    const kind =
      error.kind === AppErrorKind.RATE_LIMITED && error.retryAfterSeconds === undefined
        ? "rate_limited_generic"
        : error.kind;
    const translated = translateErrorKind(kind, {
      seconds: error.retryAfterSeconds,
    });
    if (translated !== null) return translated;
  }
  return error.message;
}
