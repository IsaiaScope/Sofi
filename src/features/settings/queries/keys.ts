export const settingsKeys = {
  all: () => ["settings"] as const,
  apiTokens: () => [...settingsKeys.all(), "api-tokens"] as const,
} as const;
