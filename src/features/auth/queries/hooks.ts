import { useQuery } from "@tanstack/react-query";
import { sessionQueryOptions } from "./options";

export function useSession() {
  return useQuery(sessionQueryOptions);
}
