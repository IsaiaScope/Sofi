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
