export type AppSection = "welcome" | "settings";

export const APP_SECTIONS: readonly AppSection[] = ["welcome", "settings"] as const;

export function getActiveSection(pathname: string): AppSection {
  return pathname.startsWith("/settings") ? "settings" : "welcome";
}
