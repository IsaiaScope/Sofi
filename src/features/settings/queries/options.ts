import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ApiToken } from "../types";
import { settingsKeys } from "./keys";

export const API_TOKENS_PATH = "/auth/tokens/";

export function apiTokensQueryOptions() {
  return queryOptions({
    queryKey: settingsKeys.apiTokens(),
    queryFn: () => apiClient.get<ApiToken[]>(API_TOKENS_PATH),
  });
}
