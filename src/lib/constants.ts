export const APP_NAME = "Sofi";
export const APP_VERSION = "0.1.0";
export const APP_DESCRIPTION = "Agent Command Center";

export const KANBAN_COLUMNS = {
  BACKLOG: "backlog",
  IN_PROGRESS: "in-progress",
  REVIEW: "review",
  DONE: "done",
} as const;

export const AGENT_TYPES = {
  CLAUDE_CODE: "claude-code",
  CODEX: "codex",
} as const;

export const VIEWS = {
  KANBAN: "kanban",
  TERMINAL: "terminal",
  GIT: "git",
  SETTINGS: "settings",
} as const;

export type View = (typeof VIEWS)[keyof typeof VIEWS];
