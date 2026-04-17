import { create } from "zustand";

interface GitUIState {
  repoPath: string | null;
  selectedFile: string | null;
  setRepoPath: (path: string | null) => void;
  setSelectedFile: (path: string | null) => void;
}

export const useGitUIStore = create<GitUIState>((set) => ({
  repoPath: null,
  selectedFile: null,
  setRepoPath: (path) => set({ repoPath: path }),
  setSelectedFile: (path) => set({ selectedFile: path }),
}));
