import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kanban/list")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      List view — coming soon
    </div>
  ),
});
