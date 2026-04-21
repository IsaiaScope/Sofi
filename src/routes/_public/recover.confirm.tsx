import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RecoverConfirmPage } from "@/features/auth/components/recover-confirm-page";

interface RecoverConfirmSearch {
  uid: string;
  token: string;
}

function RecoverConfirmRoute() {
  const navigate = useNavigate();
  const { uid, token } = Route.useSearch();
  return (
    <RecoverConfirmPage
      uid={uid}
      token={token}
      onSignIn={() => navigate({ to: "/login" })}
      onRequestNewLink={() => navigate({ to: "/recover" })}
    />
  );
}

export const Route = createFileRoute("/_public/recover/confirm")({
  component: RecoverConfirmRoute,
  validateSearch: (search: Record<string, unknown>): RecoverConfirmSearch => ({
    uid: typeof search.uid === "string" ? search.uid : "",
    token: typeof search.token === "string" ? search.token : "",
  }),
});
