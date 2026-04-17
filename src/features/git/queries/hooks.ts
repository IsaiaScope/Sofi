import { useQuery } from "@tanstack/react-query";
import { gitBranchesOptions, gitDiffOptions, gitHistoryOptions, gitStatusOptions } from "./options";

export function useGitStatus(repoPath: string | null) {
  return useQuery({
    ...gitStatusOptions(repoPath ?? ""),
    enabled: repoPath !== null && repoPath !== "",
  });
}

export function useGitDiff(repoPath: string | null) {
  return useQuery({
    ...gitDiffOptions(repoPath ?? ""),
    enabled: repoPath !== null && repoPath !== "",
  });
}

export function useGitBranches(repoPath: string | null) {
  return useQuery({
    ...gitBranchesOptions(repoPath ?? ""),
    enabled: repoPath !== null && repoPath !== "",
  });
}

export function useGitHistory(repoPath: string | null) {
  return useQuery({
    ...gitHistoryOptions(repoPath ?? ""),
    enabled: repoPath !== null && repoPath !== "",
  });
}
