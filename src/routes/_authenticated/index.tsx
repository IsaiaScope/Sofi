import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { sessionQueryOptions } from "@/features/auth/queries/options";

function WelcomePage() {
  const { data: user } = useQuery(sessionQueryOptions);
  const greetingName = user?.display_name || user?.email || "";

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <h1 className="text-4xl font-semibold tracking-tight text-sofi-text">
        {greetingName ? `Hallo, ${greetingName}` : "Hallo"}
      </h1>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/")({
  component: WelcomePage,
});
