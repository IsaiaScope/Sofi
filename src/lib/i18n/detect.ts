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
