import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RegisterPage } from "@/features/auth/components/register-page";

function RegisterRoute() {
  const navigate = useNavigate();
  return <RegisterPage onSwitchToLogin={() => navigate({ to: "/login" })} />;
}

export const Route = createFileRoute("/_public/register")({
  component: RegisterRoute,
});
