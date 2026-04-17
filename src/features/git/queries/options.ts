import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { BranchInfo, CommitInfo, DiffHunk, FileStatus } from "../types";
import { gitKeys } from "./keys";

export function gitStatusOptions(repoPath: string) {
  return queryOptions({
    queryKey: gitKeys.status(repoPath),
    queryFn: () => invoke<FileStatus[]>("git_status", { repoPath }),
    enabled: !!repoPath,
  });
}

export function gitDiffOptions(repoPath: string) {
  return queryOptions({
    queryKey: gitKeys.diff(repoPath),
    queryFn: () => invoke<DiffHunk[]>("git_diff", { repoPath }),
    enabled: !!repoPath,
  });
}

export function gitBranchesOptions(repoPath: string) {
  return queryOptions({
    queryKey: gitKeys.branches(repoPath),
    queryFn: () => invoke<BranchInfo[]>("git_branches", { repoPath }),
    enabled: !!repoPath,
  });
}

export function gitHistoryOptions(repoPath: string) {
  return queryOptions({
    queryKey: gitKeys.history(repoPath),
    queryFn: () => invoke<CommitInfo[]>("git_log", { repoPath, count: 50 }),
    enabled: !!repoPath,
  });
}
