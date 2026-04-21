import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getDisplayMessage, shouldShowErrorBanner } from "@/lib/errors";
import { useAutoFocusForm } from "@/lib/hooks/use-auto-focus-form";
import { useServerFieldErrors } from "../hooks/use-server-field-errors";
import { useRequestPasswordReset } from "../queries/mutations";
import { type RecoverFormData, recoverSchema } from "../schemas";
import {
  AUTH_FOOTER_LINK_CLASS,
  AuthFieldLabel,
  AuthHeading,
  AuthOutlineButton,
  AuthSubmitButton,
  BracketGlyph,
  TERMINAL_INPUT_CLASS,
} from "./auth-primitives";
import { AuthShell } from "./auth-shell";
import { ErrorBanner } from "./error-banner";

interface RecoverPageProps {
  onBackToLogin: () => void;
}

export function RecoverPage({ onBackToLogin }: RecoverPageProps) {
  const { t } = useTranslation("auth");
  const mutation = useRequestPasswordReset();
  const formRef = useAutoFocusForm<HTMLFormElement>();

  const form = useForm<RecoverFormData>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: "" },
  });

  useServerFieldErrors(form, mutation.error);

  const onSubmit = (data: RecoverFormData) => mutation.mutate(data.email);

  // Success swap (same route): deliberately ambiguous copy — we never reveal
  // whether the email is registered. See spec §4 and backend behavior.
  if (mutation.isSuccess) {
    return (
      <AuthShell statusKey="hud.linkDispatched">
        <BracketGlyph icon="mail" label={t("recover.successHeading")} />
        <AuthHeading align="center">{t("recover.successHeading")}</AuthHeading>
        <p className="mb-6 text-center font-body text-base text-sofi-text-muted">
          {t("recover.successBody")}
        </p>
        <AuthOutlineButton onClick={onBackToLogin} icon="arrow_back" iconPosition="trailing">
          {t("recover.backToSignIn")}
        </AuthOutlineButton>
      </AuthShell>
    );
  }

  const busy = form.formState.isSubmitting || mutation.isPending;

  return (
    <AuthShell
      statusKey="hud.awaitingIdentifier"
      footer={
        <>
          <span className="text-sofi-text-dim">{t("recover.rememberCredentials")} </span>
          <button type="button" onClick={onBackToLogin} className={AUTH_FOOTER_LINK_CLASS}>
            {t("recover.authorize")}
          </button>
        </>
      }
    >
      <AuthHeading>{t("recover.heading")}</AuthHeading>
      <p className="mb-6 font-body text-base text-sofi-text-muted">{t("recover.subheading")}</p>

      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {mutation.error && shouldShowErrorBanner(mutation.error) && (
          <ErrorBanner message={getDisplayMessage(mutation.error)} />
        )}

        <Field error={form.formState.errors.email?.message}>
          <AuthFieldLabel icon="mail">{t("recover.emailLabel")}</AuthFieldLabel>
          <Input
            {...form.register("email")}
            type="email"
            autoComplete="email"
            placeholder={t("recover.emailPlaceholder")}
            className={TERMINAL_INPUT_CLASS}
          />
        </Field>

        <AuthSubmitButton disabled={busy} aria-busy={busy} icon="send">
          {mutation.isPending ? t("recover.dispatching") : t("recover.dispatch")}
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
