export const APP_NAME = "Sofi";
export const APP_VERSION = "0.23.7";
export const APP_DESCRIPTION = "Agent Command Center";

// Tauri-registered deep link scheme; mirrored in src-tauri/tauri.conf.json.
export const DEEP_LINK_SCHEME = "sofi";

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
