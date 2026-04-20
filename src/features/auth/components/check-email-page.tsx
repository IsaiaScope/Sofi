import { Button } from "@/components/ui/button";
import { AuthShell } from "./auth-shell";

interface CheckEmailPageProps {
  email: string;
  onBackToLogin: () => void;
}

export function CheckEmailPage({ email, onBackToLogin }: CheckEmailPageProps) {
  return (
    <AuthShell>
      <h1 className="mb-2 text-center font-heading text-xl font-semibold text-sofi-text">
        Check your inbox
      </h1>
      <p className="mb-6 text-center text-base text-sofi-text-muted">
        {email ? (
          <>
            We sent a verification link to{" "}
            <span className="font-medium text-sofi-text">{email}</span>. Click it to finish setting
            up your account.
          </>
        ) : (
          "We sent a verification link to your email. Click it to finish setting up your account."
        )}
      </p>

      <Button type="button" variant="outline" size="lg" onClick={onBackToLogin}>
        Back to Sign In
      </Button>

      <p className="mt-5 text-center text-base text-sofi-text-dim">
        Didn't get it? Check spam, or use a different email.
      </p>
    </AuthShell>
  );
}
