import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { AgentAvailability } from "../types";
import { agentKeys } from "./keys";

export const agentsQueryOptions = queryOptions({
  queryKey: agentKeys.list(),
  queryFn: () => invoke<AgentAvailability[]>("list_agents"),
  staleTime: Number.POSITIVE_INFINITY,
});
