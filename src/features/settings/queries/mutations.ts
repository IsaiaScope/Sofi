import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ApiTokenCreated } from "../types";
import { settingsKeys } from "./keys";
import { API_TOKENS_PATH } from "./options";

export function useCreateApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<ApiTokenCreated>(API_TOKENS_PATH),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.apiTokens() });
    },
  });
}

export function useRevokeApiToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (digest: string) =>
      apiClient.delete<void>(`${API_TOKENS_PATH}${encodeURIComponent(digest)}/`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.apiTokens() });
    },
  });
}
