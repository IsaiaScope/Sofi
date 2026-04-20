import { Button } from "@/components/ui/button";
import { AuthShell } from "./auth-shell";

interface VerifySuccessPageProps {
  onSignIn: () => void;
}

export function VerifySuccessPage({ onSignIn }: VerifySuccessPageProps) {
  return (
    <AuthShell>
      <div
        aria-hidden="true"
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sofi-green/10 text-sofi-green"
      >
        <span className="material-symbols-outlined !text-[28px]">check_circle</span>
      </div>

      <h1 className="mb-2 text-center font-heading text-xl font-semibold text-sofi-text">
        You're in
      </h1>
      <p className="mb-6 text-center text-base text-sofi-text-muted">
        Your email is verified. Sign in to enter your command center.
      </p>

      <Button type="button" size="lg" onClick={onSignIn}>
        Sign In
      </Button>
    </AuthShell>
  );
}
