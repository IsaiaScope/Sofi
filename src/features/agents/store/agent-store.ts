import { create } from "zustand";
import { invoke } from "@/lib/tauri";
import type { AgentAvailability } from "../types";

interface AgentState {
  agents: AgentAvailability[];
  isLoaded: boolean;
  loadAgents: () => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  isLoaded: false,

  loadAgents: async () => {
    if (get().isLoaded) return;
    try {
      const agents = await invoke<AgentAvailability[]>("list_agents");
      set({ agents, isLoaded: true });
    } catch (err) {
      console.error("Failed to load agents:", err);
      set({ isLoaded: true });
    }
  },
}));
