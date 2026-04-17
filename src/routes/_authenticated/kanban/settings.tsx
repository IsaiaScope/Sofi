import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kanban/settings")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      Board settings — coming soon
    </div>
  ),
});
