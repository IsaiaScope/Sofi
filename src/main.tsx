import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import i18next from "i18next";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { authKeys } from "@/features/auth/queries/keys";
import { clearClientAuth } from "@/lib/api-client";
import { ErrorCode, getDisplayMessage, isAppError } from "@/lib/errors";
import { bootstrapI18n } from "@/lib/i18n";
import { LocaleSync } from "@/lib/i18n/locale-sync";
import { createAppRouter } from "./router";
import "./styles/globals.css";

function handleAuthError() {
  void clearClientAuth();
  queryClient.setQueryData(authKeys.session(), null);
}

function getErrorMessage(error: unknown): string {
  return isAppError(error) ? getDisplayMessage(error) : i18next.t("errors:internal.unknown");
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

bootstrapI18n()
  .catch((err) => {
    console.error("[i18n] bootstrap failed; rendering with English fallback", err);
  })
  .finally(() => {
    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <LocaleSync />
              <Suspense fallback={null}>
                <RouterProvider router={router} />
              </Suspense>
              <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </React.StrictMode>,
    );
  });
