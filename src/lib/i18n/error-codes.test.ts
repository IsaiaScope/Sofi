import i18n from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import { translateErrorKind } from "./error-codes";

beforeAll(async () => {
  await i18n.init({
    lng: "en",
    fallbackLng: "en",
    resources: {
      en: {
        errors: {
          "keychain.access_denied": "Cannot access system keychain.",
          "internal.unknown": "Something went wrong.",
        },
      },
    },
  });
});

describe("translateErrorKind", () => {
  it("returns translated string for known kind", () => {
    expect(translateErrorKind("keychain.access_denied")).toBe("Cannot access system keychain.");
  });

  it("falls back to internal.unknown for unknown kind", () => {
    expect(translateErrorKind("something.new")).toBe("Something went wrong.");
  });

  it("falls back to internal.unknown when kind undefined", () => {
    expect(translateErrorKind(undefined)).toBe("Something went wrong.");
  });
});
