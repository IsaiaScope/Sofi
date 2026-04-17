import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

interface RouterContext {
  queryClient: QueryClient;
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-sofi-elevated)",
            border: "1px solid var(--color-sofi-border)",
            color: "var(--color-sofi-text)",
            fontSize: "1rem",
          },
        }}
      />
    </>
  );
}

function RouteErrorFallback({ error }: { error: unknown }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sofi-bg p-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 text-4xl">&#x26A0;</div>
        <h1 className="mb-2 font-heading text-xl font-bold text-white">Something went wrong</h1>
        <p className="mb-6 text-base text-sofi-text-muted">
          {error instanceof Error ? error.message : "An unexpected error occurred"}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-violet-primary px-4 py-2 text-base font-medium text-white hover:bg-violet-hover"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RouteErrorFallback,
});
