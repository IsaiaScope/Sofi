import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/app-layout";
import { sessionQueryOptions } from "@/features/auth/queries/options";

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
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
