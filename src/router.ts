import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const memoryHistory = createMemoryHistory({ initialEntries: ["/"] });

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    history: memoryHistory,
    context: { queryClient: queryClient! },
    defaultPreload: "intent",
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
