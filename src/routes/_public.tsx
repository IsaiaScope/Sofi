import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WindowChrome } from "@/components/layout/window-chrome";

function PublicLayout() {
  return (
    <>
      <WindowChrome />
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
});
