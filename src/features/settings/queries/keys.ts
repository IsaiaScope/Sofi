export const settingsKeys = {
  all: () => ["settings"] as const,
  apiTokens: () => [...settingsKeys.all(), "api-tokens"] as const,
  detail: () => [...settingsKeys.all(), "detail"] as const,
} as const;
