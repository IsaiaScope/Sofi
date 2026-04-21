import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { sessionQueryOptions } from "@/features/auth/queries/options";
import { GitView } from "@/features/git/components/git-view";
import { Board } from "@/features/kanban/components/board";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { TerminalView } from "@/features/terminal/components/terminal-view";
import { cn } from "@/lib/cn";
import { APP_SECTIONS, getActiveSection } from "@/lib/routes";

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeSection = getActiveSection(pathname);
  const { data: user } = useQuery(sessionQueryOptions);

  if (!user) return null;

  return (
    <AppLayout>
      {APP_SECTIONS.map((section) => (
        <div key={section} className={cn(activeSection !== section && "hidden")}>
          {section === "kanban" && <Board />}
          {section === "terminal" && <TerminalView />}
          {section === "git" && <GitView />}
          {section === "settings" && <SettingsPage />}
        </div>
      ))}
    </AppLayout>
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(sessionQueryOptions);
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});
