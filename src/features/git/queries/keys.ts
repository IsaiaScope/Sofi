export const gitKeys = {
  all: () => ["git"] as const,
  status: (repoPath: string) => [...gitKeys.all(), "status", repoPath] as const,
  diff: (repoPath: string) => [...gitKeys.all(), "diff", repoPath] as const,
  branches: (repoPath: string) => [...gitKeys.all(), "branches", repoPath] as const,
  history: (repoPath: string) => [...gitKeys.all(), "history", repoPath] as const,
} as const;
