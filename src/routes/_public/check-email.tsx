import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckEmailPage } from "@/features/auth/components/check-email-page";

interface CheckEmailSearch {
  email?: string;
}

function CheckEmailRoute() {
  const navigate = useNavigate();
  const { email } = Route.useSearch();
  return <CheckEmailPage email={email ?? ""} onBackToLogin={() => navigate({ to: "/login" })} />;
}

export const Route = createFileRoute("/_public/check-email")({
  component: CheckEmailRoute,
  validateSearch: (search: Record<string, unknown>): CheckEmailSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
});
