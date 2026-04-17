export type AppSection = "kanban" | "terminal" | "git" | "settings";

export const APP_SECTIONS: readonly AppSection[] = [
  "kanban",
  "terminal",
  "git",
  "settings",
] as const;

export function getActiveSection(pathname: string): AppSection {
  const segment = pathname.split("/")[1];
  return APP_SECTIONS.includes(segment as AppSection) ? (segment as AppSection) : "kanban";
}

export type GitSubView = "diff" | "branches" | "history";

export function getGitSubView(pathname: string): GitSubView {
  if (pathname.includes("/git/branches")) return "branches";
  if (pathname.includes("/git/history")) return "history";
  return "diff";
}
