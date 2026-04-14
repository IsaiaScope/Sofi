import { create } from "zustand";
import { invoke } from "@/lib/tauri";
import type { ShellInfo, TerminalSession } from "../types";

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  availableShells: ShellInfo[];
  defaultShell: string;
  loadShells: () => Promise<void>;
  createSession: (opts?: {
    label?: string;
    shell?: string;
    cwd?: string;
    isAgent?: boolean;
    agentType?: string;
    taskTitle?: string;
  }) => Promise<string>;
  setActiveSession: (id: string) => void;
  removeSession: (id: string) => Promise<void>;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  availableShells: [],
  defaultShell: "/bin/zsh",

  loadShells: async () => {
    try {
      const [shells, defaultShell] = await Promise.all([
        invoke<ShellInfo[]>("list_shells"),
        invoke<string>("get_default_shell"),
      ]);
      set({ availableShells: shells, defaultShell });
    } catch (err) {
      console.error("Failed to load shells:", err);
    }
  },

  createSession: async (opts) => {
    const sessionId = crypto.randomUUID();
    const shell = opts?.shell ?? get().defaultShell;
    const cwd = opts?.cwd ?? undefined;
    const label =
      opts?.label ??
      (opts?.taskTitle
        ? `${opts.taskTitle} — ${opts.agentType ?? "agent"}`
        : `${shell.split("/").pop()} terminal`);

    try {
      await invoke<string>("create_terminal", {
        sessionId,
        shell,
        cwd,
        cols: null,
        rows: null,
      });

      const session: TerminalSession = {
        id: sessionId,
        label,
        shell,
        cwd: cwd ?? "~",
        isAgentSession: opts?.isAgent ?? false,
        agentType: opts?.agentType,
        taskTitle: opts?.taskTitle,
      };

      set((state) => ({
        sessions: [...state.sessions, session],
        activeSessionId: sessionId,
      }));

      return sessionId;
    } catch (err) {
      console.error("Failed to create terminal:", err);
      throw err;
    }
  },

  setActiveSession: (id) => set({ activeSessionId: id }),

  removeSession: async (id) => {
    try {
      await invoke("kill_terminal", { sessionId: id });
    } catch {
      // Session may already be dead
    }
    set((state) => {
      const sessions = state.sessions.filter((s) => s.id !== id);
      const activeSessionId =
        state.activeSessionId === id
          ? (sessions[sessions.length - 1]?.id ?? null)
          : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },
}));
