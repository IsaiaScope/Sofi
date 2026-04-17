export const agentKeys = {
  all: () => ["agents"] as const,
  list: () => [...agentKeys.all(), "list"] as const,
} as const;
