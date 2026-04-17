export const terminalKeys = {
  all: () => ["terminal"] as const,
  sessions: () => [...terminalKeys.all(), "sessions"] as const,
  shells: () => [...terminalKeys.all(), "shells"] as const,
} as const;
