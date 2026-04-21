import i18next from "i18next";
import { type AppError, ErrorCode, toAppError } from "./errors";
import { invoke } from "./tauri";

const API_BASE = import.meta.env.VITE_SOFI_API_BASE ?? "http://localhost:8000";

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Include bearer token? Default true. Set false for public endpoints. */
  authenticate?: boolean;
}

let cachedToken: string | null | undefined;

export function setBearerCache(token: string | null): void {
  cachedToken = token;
}

export async function getBearer(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;
  cachedToken = await invoke<string | null>("auth_get_token");
  return cachedToken;
}

export async function clearClientAuth(): Promise<void> {
  await invoke("auth_clear_token").catch(() => {});
  setBearerCache(null);
}

// Parse `Retry-After` which per RFC 7231 is either a delta-seconds integer or
// an HTTP-date. Returns seconds from now, or undefined if unparsable.
function parseRetryAfter(headerValue: string | null): number | undefined {
  if (!headerValue) return undefined;
  const asInt = Number.parseInt(headerValue, 10);
  if (Number.isFinite(asInt) && asInt >= 0) return asInt;
  const asDate = Date.parse(headerValue);
  if (!Number.isNaN(asDate)) {
    return Math.max(0, Math.ceil((asDate - Date.now()) / 1000));
  }
  return undefined;
}

function normalizeFieldErrors(raw: unknown): Record<string, string[]> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value.filter((v): v is string => typeof v === "string");
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeError(
  status: number,
  body: unknown,
  headerRetryAfter: number | undefined,
): AppError {
  const statusCode = Number.isInteger(status) ? status : ErrorCode.INTERNAL;
  let message = "Request failed";
  let kind: string | undefined;
  let fieldErrors: Record<string, string[]> | undefined;
  let retryAfterSeconds = headerRetryAfter;

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    // Sofi envelope (post-exception-handler shape).
    if (typeof record.code === "string") kind = record.code;
    if (typeof record.detail === "string") message = record.detail;
    fieldErrors = normalizeFieldErrors(record.field_errors);
    if (typeof record.retry_after === "number") {
      retryAfterSeconds = retryAfterSeconds ?? record.retry_after;
    }
    // Fallback: older/un-reshaped payloads (e.g. third-party routes that
    // bypass the DRF exception handler). Take any string value we can find.
    if (message === "Request failed") {
      if (Array.isArray(record.non_field_errors) && record.non_field_errors.length > 0) {
        message = String(record.non_field_errors[0]);
      } else {
        for (const [, value] of Object.entries(record)) {
          if (Array.isArray(value) && typeof value[0] === "string") {
            message = value[0];
            break;
          }
          if (typeof value === "string" && value.length > 0) {
            message = value;
            break;
          }
        }
      }
    }
  } else if (typeof body === "string" && body.trim().length > 0) {
    message = body;
  }

  return toAppError({ code: statusCode, message, kind, fieldErrors, retryAfterSeconds });
}

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, authenticate = true, headers, ...rest } = options;
  const mergedHeaders = new Headers(headers);
  mergedHeaders.set("Accept-Language", i18next.language || "en");
  if (body !== undefined && !(body instanceof FormData)) {
    mergedHeaders.set("Content-Type", "application/json");
  }
  if (authenticate) {
    const token = await getBearer();
    if (token) mergedHeaders.set("Authorization", `Token ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: mergedHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  }).catch((e) => {
    // Per the fetch spec, network-layer failures (connection refused, DNS,
    // CORS reject) throw TypeError. Other errors (AbortError, etc.) fall
    // through with their raw message.
    // Per fetch spec, network-layer failures (DNS, connection refused, CORS reject) throw TypeError.
    throw toAppError({
      code: ErrorCode.INTERNAL,
      message:
        e instanceof TypeError
          ? `Can't reach Sofi backend at ${API_BASE}. Is Django running? (\`pnpm dev:backend\`)`
          : `Network error: ${e instanceof Error ? e.message : String(e)}`,
    });
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  const parsed: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text();

  if (!response.ok) {
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    throw normalizeError(response.status, parsed, retryAfter);
  }
  return parsed as T;
}

export const apiClient = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
