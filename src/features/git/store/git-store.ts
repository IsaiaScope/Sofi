import { create } from "zustand";
import { invoke } from "@/lib/tauri";
import type {
  BranchInfo,
  CommitInfo,
  DiffHunk,
  FileStatus,
  GitSubView,
} from "../types";

interface GitState {
  repoPath: string | null;
  subView: GitSubView;
  files: FileStatus[];
  hunks: DiffHunk[];
  branches: BranchInfo[];
  commits: CommitInfo[];
  selectedFile: string | null;
  isLoading: boolean;
  setRepoPath: (path: string) => void;
  setSubView: (view: GitSubView) => void;
  setSelectedFile: (path: string | null) => void;
  loadStatus: () => Promise<void>;
  loadDiff: () => Promise<void>;
  loadBranches: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

export const useGitStore = create<GitState>((set, get) => ({
  repoPath: null,
  subView: "diff",
  files: [],
  hunks: [],
  branches: [],
  commits: [],
  selectedFile: null,
  isLoading: false,

  setRepoPath: (path) => {
    set({ repoPath: path });
    get().loadStatus();
    get().loadDiff();
  },

  setSubView: (view) => {
    set({ subView: view });
    if (view === "branches") get().loadBranches();
    if (view === "history") get().loadHistory();
  },

  setSelectedFile: (path) => set({ selectedFile: path }),

  loadStatus: async () => {
    const repoPath = get().repoPath;
    if (!repoPath) return;
    try {
      const files = await invoke<FileStatus[]>("git_status", { repoPath });
      set({ files });
    } catch (err) {
      console.error("Failed to load git status:", err);
      set({ files: [] });
    }
  },

  loadDiff: async () => {
    const repoPath = get().repoPath;
    if (!repoPath) return;
    set({ isLoading: true });
    try {
      const hunks = await invoke<DiffHunk[]>("git_diff", { repoPath });
      set({ hunks, isLoading: false });
    } catch (err) {
      console.error("Failed to load diff:", err);
      set({ hunks: [], isLoading: false });
    }
  },

  loadBranches: async () => {
    const repoPath = get().repoPath;
    if (!repoPath) return;
    try {
      const branches = await invoke<BranchInfo[]>("git_branches", { repoPath });
      set({ branches });
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  },

  loadHistory: async () => {
    const repoPath = get().repoPath;
    if (!repoPath) return;
    try {
      const commits = await invoke<CommitInfo[]>("git_log", { repoPath, count: 50 });
      set({ commits });
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  },
}));
