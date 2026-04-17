import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { ShellInfo } from "../types";
import { terminalKeys } from "./keys";

export const shellsQueryOptions = queryOptions({
  queryKey: terminalKeys.shells(),
  queryFn: () => invoke<ShellInfo[]>("list_shells"),
});

export const defaultShellQueryOptions = queryOptions({
  queryKey: [...terminalKeys.all(), "defaultShell"] as const,
  queryFn: () => invoke<string>("get_default_shell"),
});
