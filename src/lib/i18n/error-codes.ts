import i18next from "i18next";

const UNKNOWN_KEY = "errors:internal.unknown";

export function translateErrorKind(kind: string | undefined): string {
  if (!kind) return i18next.t(UNKNOWN_KEY);
  const key = `errors:${kind}`;
  const translated = i18next.t(key);
  // i18next returns the key (sans namespace) when a translation is missing.
  if (translated === key || translated === kind) {
    console.warn("[i18n] unmapped error kind", kind);
    return i18next.t(UNKNOWN_KEY);
  }
  return translated;
}
