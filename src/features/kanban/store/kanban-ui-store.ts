import { create } from "zustand";
import type { Board } from "../types";

interface KanbanUIState {
  activeBoard: Board | null;
  setActiveBoard: (board: Board | null) => void;
}

export const useKanbanUIStore = create<KanbanUIState>((set) => ({
  activeBoard: null,
  setActiveBoard: (board) => set({ activeBoard: board }),
}));
