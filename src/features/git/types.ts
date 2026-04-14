export interface FileStatus {
  path: string;
  status: "new" | "modified" | "deleted" | "renamed" | "unknown";
}

export interface DiffLine {
  origin: "+" | "-" | " ";
  content: string;
  old_lineno: number | null;
  new_lineno: number | null;
}

export interface DiffHunk {
  file_path: string;
  old_start: number;
  old_lines: number;
  new_start: number;
  new_lines: number;
  lines: DiffLine[];
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
  upstream: string | null;
}

export interface CommitInfo {
  id: string;
  message: string;
  author: string;
  time: number;
}

export type GitSubView = "diff" | "branches" | "history";
