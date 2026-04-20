// scripts/check-i18n-keys.mjs
//
// CI guard: every locale namespace bundle must have the same set of keys as
// its English counterpart. Missing keys => runtime fallback to English;
// extra keys => dead translations.  Either way, we fail the build.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCALES = ["en", "it"];
const BASE = "public/locales";

function flatten(obj, prefix = "") {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
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
