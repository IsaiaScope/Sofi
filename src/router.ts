import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { LoadingSplash } from "@/components/shared/loading-splash";
import { routeTree } from "./routeTree.gen";

const memoryHistory = createMemoryHistory({ initialEntries: ["/"] });

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    history: memoryHistory,
    context: { queryClient: queryClient! },
    defaultPreload: "intent",
    defaultPendingComponent: LoadingSplash,
    defaultPendingMs: 0,
    defaultPendingMinMs: 500,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
