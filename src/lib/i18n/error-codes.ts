import i18next from "i18next";

/**
 * Translate a semantic error kind (e.g. `"auth.invalid_credentials"`) into the
 * active-locale message from the `errors` namespace.
 *
 * Returns `null` when the key isn't mapped — callers should fall back to the
 * server-provided detail (which is already translated by Django's
 * LocaleMiddleware thanks to our `Accept-Language` header).
 *
 * Interpolation values are passed through to i18next (e.g. `{ seconds: 30 }`
 * for the `rate_limited` key which renders "Try again in {{seconds}}s").
 */
export function translateErrorKind(
  kind: string | undefined,
  values?: Record<string, unknown>,
): string | null {
  if (!kind) return null;
  const key = `errors:${kind}`;
  const translated = i18next.t(key, values ?? {});
  // i18next returns the key (sometimes with namespace stripped) on a miss.
  if (translated === key || translated === kind) {
    console.warn("[i18n] unmapped error kind", kind);
    return null;
  }
  return translated;
}
