import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout-only parent for /recover and /recover/confirm. Children render in the
// Outlet — don't add UI here or both screens will stack when /recover/confirm
// is active (TSR mounts the parent's tree around the matched child).
function RecoverLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/_public/recover")({
  component: RecoverLayout,
});
