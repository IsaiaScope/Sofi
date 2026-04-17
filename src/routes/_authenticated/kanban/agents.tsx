import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kanban/agents")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      Agent overview — coming soon
    </div>
  ),
});
