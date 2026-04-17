import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/terminal/settings")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      Shell settings — coming soon
    </div>
  ),
});
