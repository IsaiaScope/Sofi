import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RecoverPage } from "@/features/auth/components/recover-page";

function RecoverRoute() {
  const navigate = useNavigate();
  return <RecoverPage onBackToLogin={() => navigate({ to: "/login" })} />;
}

export const Route = createFileRoute("/_public/recover/")({
  component: RecoverRoute,
});
