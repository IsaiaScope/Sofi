import { useQuery } from "@tanstack/react-query";
import { apiTokensQueryOptions, userSettingsQueryOptions } from "./options";

export function useApiTokens() {
  return useQuery(apiTokensQueryOptions());
}

export function useUserSettings(options?: { enabled?: boolean }) {
  return useQuery({ ...userSettingsQueryOptions(), enabled: options?.enabled });
}
