import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VerifySuccessPage } from "@/features/auth/components/verify-success-page";

function VerifySuccessRoute() {
  const navigate = useNavigate();
  return <VerifySuccessPage onSignIn={() => navigate({ to: "/login" })} />;
}

export const Route = createFileRoute("/_public/verify-success")({
  component: VerifySuccessRoute,
});
