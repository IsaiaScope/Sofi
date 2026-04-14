import { create } from "zustand";
import { invoke } from "@/lib/tauri";
import type { AuthResponse, LoginInput, RegisterInput, User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  checkSession: () => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "sofi_token";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  error: null,

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const response = await invoke<AuthResponse>("login", { input });
      localStorage.setItem(STORAGE_KEY, response.token);
      set({ user: response.user, token: response.token, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const response = await invoke<AuthResponse>("register", { input });
      localStorage.setItem(STORAGE_KEY, response.token);
      set({ user: response.user, token: response.token, isLoading: false });
    } catch (err) {
      set({ error: String(err), isLoading: false });
    }
  },

  checkSession: async () => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      const response = await invoke<AuthResponse>("check_session", { token });
      set({ user: response.user, token: response.token, isLoading: false });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null, error: null });
  },
}));
