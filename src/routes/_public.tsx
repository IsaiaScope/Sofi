import { createFileRoute, Outlet } from "@tanstack/react-router";

// WindowChrome lives inside AuthShell (which wraps every public page and the
// fault screens). Mounting it here too would double-render the drag region,
// and keeping it only here meant the route error boundary's FaultPage — which
// replaces the _public layout — rendered with no drag area.
export const Route = createFileRoute("/_public")({
  component: Outlet,
});
