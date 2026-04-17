import { useQuery } from "@tanstack/react-query";
import { agentsQueryOptions } from "./options";

export function useAgents() {
  return useQuery(agentsQueryOptions);
}
