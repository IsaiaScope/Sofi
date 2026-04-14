import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { useGitStore } from "../store/git-store";
import { DiffViewer } from "./diff-viewer";
import type { GitSubView } from "../types";

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
  const {
    subView,
    setSubView,
    files,
    hunks,
    branches,
    commits,
    selectedFile,
    setSelectedFile,
    repoPath,
    isLoading,
  } = useGitStore();

  // Prompt for repo path if none set (placeholder UX)
  useEffect(() => {
    if (!repoPath) {
      // For now, try loading the Sofi repo itself as demo
      useGitStore.getState().setRepoPath("/Volumes/Crucial-4T/repo/sofi");
    }
  }, [repoPath]);

  return (
    <div className="flex h-full flex-col">
      {/* Sub-view tabs */}
      <div className="flex shrink-0 items-center gap-1 border-b border-sofi-border bg-sofi-surface/50 px-3 py-1.5">
        {(["diff", "branches", "history"] as GitSubView[]).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setSubView(view)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
              subView === view
                ? "bg-sofi-orange/15 text-sofi-orange"
                : "text-sofi-text-muted hover:text-sofi-text",
            )}
          >
            {view}
          </button>
        ))}
        <div className="flex-1" />
        {subView === "diff" && files.length > 0 && (
          <span className="text-[10px] text-sofi-text-dim">
            {files.length} file{files.length !== 1 ? "s" : ""} changed
          </span>
        )}
      </div>

      {/* Content */}
      {subView === "diff" && (
        <div className="flex flex-1 overflow-hidden">
          {/* File sidebar */}
          <div className="hidden w-52 shrink-0 overflow-y-auto border-r border-sofi-border bg-white/[0.01] p-2 md:block">
            <p className="mb-2 font-label text-[9px] font-semibold uppercase tracking-wider text-sofi-text-dim">
              Changed Files
            </p>
            {files.length === 0 && (
              <p className="text-xs text-sofi-text-dim">No changes</p>
            )}
            {files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() =>
                  setSelectedFile(
                    selectedFile === file.path ? null : file.path,
                  )
                }
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
                Loading diff...
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
                  branch.is_head
                    ? "bg-sofi-green/10 text-sofi-green"
                    : "text-sofi-text-muted",
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
                  <span className="ml-auto rounded-full bg-sofi-green/20 px-2 py-0.5 text-[10px]">
                    HEAD
                  </span>
                )}
                {branch.upstream && (
                  <span className="text-[10px] text-sofi-text-dim">
                    {branch.upstream}
                  </span>
                )}
              </div>
            ))}
            {branches.length === 0 && (
              <p className="text-sm text-sofi-text-dim">
                No branches found. Connect a git repository.
              </p>
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
                <span className="font-mono text-xs text-sofi-purple">
                  {commit.id}
                </span>
                <span className="flex-1 truncate">{commit.message}</span>
                <span className="shrink-0 text-[10px] text-sofi-text-dim">
                  {commit.author}
                </span>
              </div>
            ))}
            {commits.length === 0 && (
              <p className="text-sm text-sofi-text-dim">
                No commits found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
