import { queryOptions } from "@tanstack/react-query";
import { ErrorCode, isAppError } from "@/lib/errors";
import { invoke } from "@/lib/tauri";
import type { AuthResponse, User } from "../types";
import { authKeys } from "./keys";

const STORAGE_KEY = "sofi_token";

export const sessionQueryOptions = queryOptions({
  queryKey: authKeys.session(),
  queryFn: async (): Promise<User | null> => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) return null;
    try {
      const response = await invoke<AuthResponse>("check_session", {
        token,
      });
      return response.user;
    } catch (error) {
      if (isAppError(error) && error.code === ErrorCode.AUTH) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      throw error;
    }
  },
  staleTime: 5 * 60 * 1000,
});
