import { useQuery } from "@tanstack/react-query";
import { defaultShellQueryOptions, shellsQueryOptions } from "./options";

export function useShells() {
  return useQuery(shellsQueryOptions);
}

export function useDefaultShell() {
  return useQuery(defaultShellQueryOptions);
}
