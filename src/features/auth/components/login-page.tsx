import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { APP_DESCRIPTION } from "@/lib/constants";
import { AppErrorKind } from "@/lib/errors";
import { useLogin, useOAuthLogin, useResendVerification } from "../queries/mutations";
import { type LoginFormData, loginSchema } from "../schemas";
import { AuthShell } from "./auth-shell";
import { ErrorBanner } from "./error-banner";
import { OAuthButton } from "./oauth-button";

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onAuthenticated: () => void;
  onVerificationPending: (email: string) => void;
}

export function LoginPage({
  onSwitchToRegister,
  onAuthenticated,
  onVerificationPending,
}: LoginPageProps) {
  const loginMutation = useLogin();
  const oauthMutation = useOAuthLogin();
  const resendMutation = useResendVerification();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) =>
    loginMutation.mutate(data, { onSuccess: onAuthenticated });
  const anyError = loginMutation.error ?? oauthMutation.error;
  const busy =
    form.formState.isSubmitting ||
    loginMutation.isPending ||
    oauthMutation.isPending ||
    resendMutation.isPending;

  const showResend = loginMutation.error?.kind === AppErrorKind.EMAIL_NOT_VERIFIED;

  const handleResend = () => {
    const email = form.getValues("email");
    if (!email) return;
    resendMutation.mutate(email, {
      onSuccess: () => onVerificationPending(email),
    });
  };

  return (
    <AuthShell
      wordmarkTooltip={APP_DESCRIPTION}
      footer={
        <>
          New operator?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-violet-hover hover:underline"
          >
            Create account
          </button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {anyError && !showResend && <ErrorBanner message={anyError.message} />}

        {showResend && (
          <div className="mb-4 flex gap-3 rounded-xl border border-sofi-orange/20 bg-sofi-orange/10 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sofi-orange/15 text-sofi-orange">
              <span className="material-symbols-outlined !text-[20px]">mail</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-sofi-text">Email verification required</p>
              <p className="mt-0.5 text-base text-sofi-text-muted">
                Check your inbox for the verification link — or resend it below.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={handleResend}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sofi-border bg-sofi-elevated px-3 py-1.5 text-base font-medium text-sofi-text transition-colors hover:bg-sofi-surface disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="material-symbols-outlined !text-[18px]">send</span>
                {resendMutation.isPending ? "Sending..." : "Resend verification email"}
              </button>
              {resendMutation.isError && resendMutation.error && (
                <p className="mt-2 text-base text-sofi-red">{resendMutation.error.message}</p>
              )}
            </div>
          </div>
        )}

        <Field className="mb-4">
          <FieldLabel>Email</FieldLabel>
          <Input
            {...form.register("email")}
            type="email"
            placeholder="sofi@email.com"
            aria-invalid={!!form.formState.errors.email}
          />
          <FieldError>{form.formState.errors.email?.message}</FieldError>
        </Field>

        <Field className="mb-6">
          <FieldLabel>Password</FieldLabel>
          <PasswordInput
            {...form.register("password")}
            placeholder="••••••••"
            aria-invalid={!!form.formState.errors.password}
          />
          <FieldError>{form.formState.errors.password?.message}</FieldError>
        </Field>

        <Button type="submit" size="lg" disabled={busy}>
          {loginMutation.isPending ? "Signing in..." : "Sign In"}
        </Button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-sofi-border" />
          <span className="text-base text-sofi-text-dim">OR</span>
          <div className="h-px flex-1 bg-sofi-border" />
        </div>

        <div className="flex items-center justify-center gap-3">
          <OAuthButton
            provider="google"
            disabled={busy}
            onClick={() => oauthMutation.mutate("google", { onSuccess: onAuthenticated })}
          />
          <OAuthButton
            provider="github"
            disabled={busy}
            onClick={() => oauthMutation.mutate("github", { onSuccess: onAuthenticated })}
          />
        </div>
      </form>
    </AuthShell>
  );
}
