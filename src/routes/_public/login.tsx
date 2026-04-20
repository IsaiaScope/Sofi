import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/components/login-page";

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <LoginPage
      onSwitchToRegister={() => navigate({ to: "/register" })}
      onAuthenticated={() => navigate({ to: "/kanban" })}
      onVerificationPending={(email) => navigate({ to: "/check-email", search: { email } })}
    />
  );
}

export const Route = createFileRoute("/_public/login")({
  component: LoginRoute,
});
