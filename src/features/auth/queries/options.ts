import { queryOptions } from "@tanstack/react-query";
import { apiClient, clearClientAuth, getBearer } from "@/lib/api-client";
import { ErrorCode, isAppError } from "@/lib/errors";
import type { User } from "../types";
import { authKeys } from "./keys";

export const sessionQueryOptions = queryOptions({
  queryKey: authKeys.session(),
  queryFn: async (): Promise<User | null> => {
    const token = await getBearer();
    if (!token) return null;
    try {
      return await apiClient.get<User>("/auth/user/");
    } catch (error) {
      if (isAppError(error) && error.code === ErrorCode.AUTH) {
        // Token is dead server-side — clear it locally so the next reload
        // doesn't re-send it and loop through the 401 → /login bounce.
        await clearClientAuth();
        return null;
      }
      throw error;
    }
  },
  staleTime: 5 * 60 * 1000,
});
