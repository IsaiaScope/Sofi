import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { FaultPage } from "@/components/fault-page";
import { A11yAnnouncer } from "@/components/shared/a11y-announcer";
import { useDeepLink } from "@/features/auth/hooks/use-deep-link";
import { useAppZoom } from "@/lib/hooks/use-app-zoom";
import { useRouteFocusReset } from "@/lib/hooks/use-route-focus-reset";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    );

interface RouterContext {
  queryClient: QueryClient;
}

function RootComponent() {
  useDeepLink();
  useAppZoom();
  useRouteFocusReset();
  return (
    <>
      <A11yAnnouncer />
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
      <Suspense fallback={null}>
        <TanStackRouterDevtools position="bottom-left" />
      </Suspense>
    </>
  );
}

function RouteErrorFallback({ error }: { error: unknown }) {
  return <FaultPage statusKey="hud.faultRoute" scope="route" error={error} />;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  errorComponent: RouteErrorFallback,
});
