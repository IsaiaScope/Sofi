import { useQuery } from "@tanstack/react-query";
import { apiTokensQueryOptions } from "./options";

export function useApiTokens() {
  return useQuery(apiTokensQueryOptions());
}
