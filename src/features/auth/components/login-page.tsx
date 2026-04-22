import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { focusRing } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { AppErrorKind, getDisplayMessage, shouldShowErrorBanner } from "@/lib/errors";
import { useAutoFocusForm } from "@/lib/hooks/use-auto-focus-form";
import { useServerFieldErrors } from "../hooks/use-server-field-errors";
import { useLogin, useOAuthLogin, useResendVerification } from "../queries/mutations";
import { type LoginFormData, loginSchema } from "../schemas";
import {
  AUTH_FOOTER_LINK_CLASS,
  AuthFieldLabel,
  AuthHeading,
  AuthSubmitButton,
  TERMINAL_INPUT_CLASS,
} from "./auth-primitives";
import { AuthShell } from "./auth-shell";
import { ErrorBanner } from "./error-banner";
import { OAuthButton } from "./oauth-button";

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onAuthenticated: () => void;
  onVerificationPending: (email: string) => void;
  onForgotPassword: () => void;
}

export function LoginPage({
  onSwitchToRegister,
  onAuthenticated,
  onVerificationPending,
  onForgotPassword,
}: LoginPageProps) {
  const { t } = useTranslation("auth");
  const loginMutation = useLogin();
  const oauthMutation = useOAuthLogin();
  const resendMutation = useResendVerification();
  const formRef = useAutoFocusForm<HTMLFormElement>();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useServerFieldErrors(form, loginMutation.error);

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
      footer={
        <>
          <span className="text-sofi-text-dim">{t("login.newOperator")} </span>
          <button type="button" onClick={onSwitchToRegister} className={AUTH_FOOTER_LINK_CLASS}>
            {t("login.requestAccess")}
          </button>
        </>
      }
    >
      <AuthHeading>{t("login.heading")}</AuthHeading>

      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {anyError && !showResend && shouldShowErrorBanner(anyError) && (
          <ErrorBanner message={getDisplayMessage(anyError)} />
        )}

        {showResend && (
          <div
            role="alert"
            aria-live="assertive"
            className="border border-sofi-orange/30 bg-sofi-orange/10 p-3"
          >
            <div className="flex items-center gap-2 font-mono text-base text-sofi-orange uppercase tracking-wider">
              <span aria-hidden="true" className="material-symbols-outlined !text-[18px]">
                mail
              </span>
              {t("login.verificationRequired.title")}
            </div>
            <p className="mt-1.5 text-base text-sofi-text-muted leading-snug">
              {t("login.verificationRequired.body")}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleResend}
              className={cn(
                "mt-2.5 inline-flex items-center gap-1.5 border border-sofi-orange/40 bg-sofi-orange/10 px-2.5 py-1 font-mono text-base text-sofi-orange uppercase tracking-wider transition-colors hover:bg-sofi-orange/20 disabled:cursor-not-allowed disabled:opacity-60",
                focusRing("warning"),
              )}
            >
              <span aria-hidden="true" className="material-symbols-outlined !text-[16px]">
                send
              </span>
              {resendMutation.isPending
                ? t("login.verificationRequired.sending")
                : t("login.verificationRequired.resend")}
            </button>
            {resendMutation.isError && resendMutation.error && (
              <p role="alert" aria-live="polite" className="mt-2 text-base text-sofi-red">
                {getDisplayMessage(resendMutation.error)}
              </p>
            )}
          </div>
        )}

        <Field error={form.formState.errors.email?.message}>
          <AuthFieldLabel icon="mail">{t("login.emailLabel")}</AuthFieldLabel>
          <Input
            {...form.register("email")}
            type="email"
            autoComplete="email"
            placeholder={t("login.emailPlaceholderOperator")}
            className={TERMINAL_INPUT_CLASS}
          />
        </Field>

        <Field error={form.formState.errors.password?.message}>
          <AuthFieldLabel icon="lock">{t("login.passwordLabel")}</AuthFieldLabel>
          <PasswordInput
            {...form.register("password")}
            autoComplete="current-password"
            placeholder="••••••••"
            className={TERMINAL_INPUT_CLASS}
          />
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={onForgotPassword}
              className={cn("font-mono text-base", AUTH_FOOTER_LINK_CLASS)}
            >
              {t("login.forgotAccess")}
            </button>
          </div>
        </Field>

        <AuthSubmitButton disabled={busy} aria-busy={busy} icon="login">
          {loginMutation.isPending ? t("login.signingIn") : t("login.signIn")}
        </AuthSubmitButton>

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-cyan-accent/20" />
          <span className="font-mono text-base text-sofi-text-dim uppercase">{t("login.or")}</span>
          <div className="h-px flex-1 bg-cyan-accent/20" />
        </div>

        <div className="space-y-3">
          <OAuthButton
            provider="google"
            label={t("login.oauthGoogle")}
            disabled={busy}
            onClick={() => oauthMutation.mutate("google", { onSuccess: onAuthenticated })}
          />
          <OAuthButton
            provider="github"
            label={t("login.oauthGithub")}
            disabled={busy}
            onClick={() => oauthMutation.mutate("github", { onSuccess: onAuthenticated })}
          />
        </div>
      </form>
    </AuthShell>
  );
}
