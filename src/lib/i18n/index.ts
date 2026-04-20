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
    const { z } = await import("zod");
    const { makeZodI18nMap } = await import("zod-i18n-map");
    z.setErrorMap(makeZodI18nMap({ t: i18n.t.bind(i18n), ns: "zod" }));
    return i18n;
  })();
  return bootstrapPromise;
}

export { i18n };
