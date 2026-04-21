import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getDisplayMessage, shouldShowErrorBanner } from "@/lib/errors";
import { useAutoFocusForm } from "@/lib/hooks/use-auto-focus-form";
import { useServerFieldErrors } from "../hooks/use-server-field-errors";
import { useRegister } from "../queries/mutations";
import { type RegisterFormData, registerSchema } from "../schemas";
import { isVerificationPending } from "../types";
import {
  AUTH_FOOTER_LINK_CLASS,
  AuthFieldLabel,
  AuthHeading,
  AuthSubmitButton,
  TERMINAL_INPUT_CLASS,
} from "./auth-primitives";
import { AuthShell } from "./auth-shell";
import { ErrorBanner } from "./error-banner";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onVerificationPending: (email: string) => void;
  onAuthenticated: () => void;
}

export function RegisterPage({
  onSwitchToLogin,
  onVerificationPending,
  onAuthenticated,
}: RegisterPageProps) {
  const { t } = useTranslation("auth");
  const registerMutation = useRegister();
  const formRef = useAutoFocusForm<HTMLFormElement>();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password1: "", password2: "" },
  });

  useServerFieldErrors(form, registerMutation.error, { display_name: "displayName" });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(
      {
        email: data.email,
        password1: data.password1,
        password2: data.password2,
        display_name: data.displayName || undefined,
      },
      {
        onSuccess: (response) => {
          if (isVerificationPending(response)) {
            onVerificationPending(data.email);
          } else {
            onAuthenticated();
          }
        },
      },
    );
  };

  const busy = form.formState.isSubmitting || registerMutation.isPending;

  return (
    <AuthShell
      statusKey="hud.registeringOperator"
      footer={
        <>
          <span className="text-sofi-text-dim">{t("register.haveAccess")} </span>
          <button type="button" onClick={onSwitchToLogin} className={AUTH_FOOTER_LINK_CLASS}>
            {t("register.signIn")}
          </button>
        </>
      }
    >
      <AuthHeading>{t("register.heading")}</AuthHeading>

      <p className="-mt-2 mb-6 font-body text-base text-sofi-text-muted">
        {t("register.subheading")}
      </p>

      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {registerMutation.error && shouldShowErrorBanner(registerMutation.error) && (
          <ErrorBanner message={getDisplayMessage(registerMutation.error)} />
        )}

        <Field error={form.formState.errors.displayName?.message}>
          <AuthFieldLabel icon="badge">{t("register.displayNameLabel")}</AuthFieldLabel>
          <Input
            {...form.register("displayName")}
            autoComplete="nickname"
            placeholder={t("register.displayNamePlaceholder")}
            className={TERMINAL_INPUT_CLASS}
          />
        </Field>

        <Field error={form.formState.errors.email?.message}>
          <AuthFieldLabel icon="mail">{t("register.emailLabel")}</AuthFieldLabel>
          <Input
            {...form.register("email")}
            type="email"
            autoComplete="email"
            placeholder={t("register.emailPlaceholderOperator")}
            className={TERMINAL_INPUT_CLASS}
          />
        </Field>

        <Field error={form.formState.errors.password1?.message}>
          <AuthFieldLabel icon="lock">{t("register.passwordLabel")}</AuthFieldLabel>
          <PasswordInput
            {...form.register("password1")}
            autoComplete="new-password"
            placeholder="••••••••"
            className={TERMINAL_INPUT_CLASS}
          />
        </Field>

        <Field error={form.formState.errors.password2?.message}>
          <AuthFieldLabel icon="lock">{t("register.confirmPasswordLabel")}</AuthFieldLabel>
          <PasswordInput
            {...form.register("password2")}
            autoComplete="new-password"
            placeholder="••••••••"
            className={TERMINAL_INPUT_CLASS}
          />
        </Field>

        <AuthSubmitButton disabled={busy} aria-busy={busy} icon="person_add">
          {registerMutation.isPending ? t("register.creating") : t("register.createOperator")}
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
