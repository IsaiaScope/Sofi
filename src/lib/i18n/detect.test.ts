import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectLocale } from "./detect";
import { LOCAL_STORAGE_KEY } from "./resources";

const osLocaleMock = vi.fn();
vi.mock("@tauri-apps/plugin-os", () => ({ locale: () => osLocaleMock() }));

describe("detectLocale", () => {
  beforeEach(() => {
    localStorage.clear();
    osLocaleMock.mockReset();
  });
  afterEach(() => localStorage.clear());

  it("returns cached value from localStorage when supported", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "it");
    expect(await detectLocale()).toBe("it");
  });

  it("ignores unsupported cached value and falls through to OS", async () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, "fr");
    osLocaleMock.mockResolvedValue("it-IT");
    expect(await detectLocale()).toBe("it");
  });

  it("strips region from OS locale", async () => {
    osLocaleMock.mockResolvedValue("it-IT");
    expect(await detectLocale()).toBe("it");
  });

  it("falls back to 'en' when OS locale unsupported", async () => {
    osLocaleMock.mockResolvedValue("fr-FR");
    expect(await detectLocale()).toBe("en");
  });

  it("falls back to 'en' when OS returns null", async () => {
    osLocaleMock.mockResolvedValue(null);
    expect(await detectLocale()).toBe("en");
  });

  it("falls back to 'en' when plugin throws", async () => {
    osLocaleMock.mockRejectedValue(new Error("no plugin"));
    expect(await detectLocale()).toBe("en");
  });
});
