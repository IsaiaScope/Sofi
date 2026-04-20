import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ApiToken, UserSettings } from "../types";
import { settingsKeys } from "./keys";

export const API_TOKENS_PATH = "/auth/tokens/";
export const USER_SETTINGS_PATH = "/api/users/settings/";

export function apiTokensQueryOptions() {
  return queryOptions({
    queryKey: settingsKeys.apiTokens(),
    queryFn: () => apiClient.get<ApiToken[]>(API_TOKENS_PATH),
  });
}

export function userSettingsQueryOptions() {
  return queryOptions({
    queryKey: settingsKeys.detail(),
    queryFn: () => apiClient.get<UserSettings>(USER_SETTINGS_PATH),
    staleTime: 5 * 60 * 1000,
  });
}
