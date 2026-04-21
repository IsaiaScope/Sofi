import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { useKanbanUIStore } from "@/features/kanban/store/kanban-ui-store";
import { cn } from "@/lib/cn";
import { getGitSubView } from "@/lib/routes";
import { useGitBranches, useGitDiff, useGitHistory, useGitStatus } from "../queries/hooks";
import { useGitUIStore } from "../store/git-ui-store";
import { DiffViewer } from "./diff-viewer";

const STATUS_COLORS: Record<string, string> = {
  new: "text-sofi-green",
  modified: "text-sofi-orange",
  deleted: "text-sofi-red",
  renamed: "text-sofi-blue",
};

const STATUS_ICONS: Record<string, string> = {
  new: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
};

export function GitView() {
  const { t } = useTranslation("common");
  const { selectedFile, setSelectedFile, repoPath, setRepoPath } = useGitUIStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const subView = getGitSubView(pathname);
  const activeBoard = useKanbanUIStore((s) => s.activeBoard);

  const statusQuery = useGitStatus(repoPath);
  const diffQuery = useGitDiff(repoPath);
  const branchesQuery = useGitBranches(subView === "branches" ? repoPath : null);
  const historyQuery = useGitHistory(subView === "history" ? repoPath : null);

  const files = statusQuery.data ?? [];
  const hunks = diffQuery.data ?? [];
  const branches = branchesQuery.data ?? [];
  const commits = historyQuery.data ?? [];
  const isLoading = diffQuery.isPending;

  // Sync repo path from active board
  useEffect(() => {
    const boardRepo = activeBoard?.repo_path;
    if (boardRepo && boardRepo !== repoPath) {
      setRepoPath(boardRepo);
    }
  }, [activeBoard?.repo_path, repoPath, setRepoPath]);

  if (!repoPath) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-3xl text-sofi-text-dim">&#9683;</div>
        <p className="text-sm text-sofi-text-muted">{t("git.noRepoTitle")}</p>
        <p className="text-xs text-sofi-text-dim">
          {t("git.noRepoHelp")}
          <br />
          {t("git.noRepoHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Content */}
      {subView === "diff" && (
        <div className="flex flex-1 overflow-hidden">
          {/* File sidebar */}
          <div className="hidden w-52 shrink-0 overflow-y-auto border-r border-sofi-border bg-white/[0.01] p-2 md:block">
            <p className="mb-2 font-label text-[9px] font-semibold uppercase tracking-wider text-sofi-text-dim">
              {t("git.changedFiles")}
            </p>
            {files.length === 0 && (
              <p className="text-xs text-sofi-text-dim">{t("git.noChanges")}</p>
            )}
            {files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedFile(selectedFile === file.path ? null : file.path)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[11px] transition-colors",
                  selectedFile === file.path
                    ? "bg-sofi-orange/10 text-sofi-orange"
                    : "text-sofi-text-muted hover:bg-sofi-elevated",
                )}
              >
                <span
                  className={cn(
                    "font-mono text-[9px] font-bold",
                    STATUS_COLORS[file.status] ?? "text-sofi-text-dim",
                  )}
                >
                  {STATUS_ICONS[file.status] ?? "?"}
                </span>
                <span className="truncate">{file.path}</span>
              </button>
            ))}
          </div>

          {/* Diff area */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-sofi-text-dim">
                {t("git.loadingDiff")}
              </div>
            ) : (
              <DiffViewer hunks={hunks} selectedFile={selectedFile} />
            )}
          </div>
        </div>
      )}

      {subView === "branches" && (
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                  branch.is_head ? "bg-sofi-green/10 text-sofi-green" : "text-sofi-text-muted",
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    branch.is_head ? "bg-sofi-green" : "bg-sofi-text-dim",
                  )}
                />
                <span className="font-mono">{branch.name}</span>
                {branch.is_head && (
                  <Badge tone="success" className="ml-auto">
                    HEAD
                  </Badge>
                )}
              </div>
            ))}
            {branches.length === 0 && (
              <p className="text-sm text-sofi-text-dim">{t("git.noBranches")}</p>
            )}
          </div>
        </div>
      )}

      {subView === "history" && (
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-1">
            {commits.map((commit) => (
              <div
                key={commit.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sofi-text-muted hover:bg-sofi-elevated"
              >
                <span className="font-mono text-xs text-sofi-purple">{commit.id}</span>
                <span className="flex-1 truncate">{commit.message}</span>
                <span className="shrink-0 text-caption text-sofi-text-dim">{commit.author}</span>
              </div>
            ))}
            {commits.length === 0 && (
              <p className="text-sm text-sofi-text-dim">{t("git.noCommits")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
