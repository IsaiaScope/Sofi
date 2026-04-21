import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { LoginPage } from "@/features/auth/components/login-page";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

function LoginRoute() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();

  const handleAuthenticated = () => {
    // Only allow in-app redirects (paths starting with "/") to prevent open redirect.
    if (redirectTo?.startsWith("/")) {
      navigate({ to: redirectTo as string });
    } else {
      navigate({ to: "/kanban" });
    }
  };

  return (
    <LoginPage
      onSwitchToRegister={() => navigate({ to: "/register" })}
      onAuthenticated={handleAuthenticated}
      onVerificationPending={(email) => navigate({ to: "/check-email", search: { email } })}
      onForgotPassword={() => navigate({ to: "/recover" })}
    />
  );
}

export const Route = createFileRoute("/_public/login")({
  validateSearch: loginSearchSchema,
  component: LoginRoute,
});
