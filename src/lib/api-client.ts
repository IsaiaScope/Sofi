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

function normalizeError(status: number, body: unknown): AppError {
  const statusCode = Number.isInteger(status) ? status : ErrorCode.INTERNAL;
  let message = "Request failed";
  let kind: string | undefined;
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.code === "string") kind = record.code;
    if (typeof record.detail === "string") message = record.detail;
    else if (
      typeof record.non_field_errors === "object" &&
      Array.isArray(record.non_field_errors)
    ) {
      message = String(record.non_field_errors[0] ?? message);
    } else {
      const firstKey = Object.keys(record).find((k) => k !== "code");
      const firstVal = firstKey ? record[firstKey] : undefined;
      if (Array.isArray(firstVal) && typeof firstVal[0] === "string") {
        message = `${firstKey}: ${firstVal[0]}`;
      } else if (typeof firstVal === "string") {
        message = `${firstKey}: ${firstVal}`;
      }
    }
  } else if (typeof body === "string" && body.trim().length > 0) {
    message = body;
  }
  return toAppError({ code: statusCode, message, kind });
}

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, authenticate = true, headers, ...rest } = options;
  const mergedHeaders = new Headers(headers);
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
    throw normalizeError(response.status, parsed);
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
