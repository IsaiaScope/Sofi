import { create } from "zustand";
import type { TerminalSession } from "../types";

interface TerminalUIState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  addSession: (session: TerminalSession) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
}

export const useTerminalUIStore = create<TerminalUIState>((set) => ({
  sessions: [],
  activeSessionId: null,
  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
    })),
  removeSession: (id) =>
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const activeSessionId =
        state.activeSessionId === id
          ? (sessions[sessions.length - 1]?.id ?? null)
          : state.activeSessionId;
      return { sessions, activeSessionId };
    }),
  setActiveSession: (id) => set({ activeSessionId: id }),
}));
