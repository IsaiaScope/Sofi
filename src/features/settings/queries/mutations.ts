import { useMutation, useQueryClient } from "@tanstack/react-query";
import i18next from "i18next";
import { authKeys } from "@/features/auth/queries/keys";
import { apiClient } from "@/lib/api-client";
import { LOCAL_STORAGE_KEY, type SupportedLanguage } from "@/lib/i18n/resources";
import type { ApiTokenCreated, UserSettings } from "../types";
import { settingsKeys } from "./keys";
import { API_TOKENS_PATH, USER_SETTINGS_PATH } from "./options";

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

export function useUpdateLocale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (locale: SupportedLanguage) =>
      apiClient.patch<UserSettings>(USER_SETTINGS_PATH, { locale }),
    onSuccess: async (response) => {
      await i18next.changeLanguage(response.locale);
      localStorage.setItem(LOCAL_STORAGE_KEY, response.locale);
      queryClient.setQueryData(settingsKeys.detail(), response);
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}
