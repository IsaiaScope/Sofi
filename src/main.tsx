import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { authKeys } from "@/features/auth/queries/keys";
import { clearClientAuth } from "@/lib/api-client";
import { ErrorCode, isAppError } from "@/lib/errors";
import { createAppRouter } from "./router";
import "./styles/globals.css";

function handleAuthError() {
  void clearClientAuth();
  queryClient.setQueryData(authKeys.session(), null);
}

function getErrorMessage(error: unknown): string {
  return isAppError(error) ? error.message : "An unexpected error occurred";
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAppError(error) && error.code === ErrorCode.AUTH) {
        handleAuthError();
        return;
      }
      toast.error(getErrorMessage(error));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (isAppError(error) && error.code === ErrorCode.AUTH) {
        handleAuthError();
        return;
      }
      if (mutation.meta?.suppressToast) return;
      toast.error(getErrorMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const router = createAppRouter(queryClient);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
