import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Field, FieldError } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import {
  type AppError,
  AppErrorKind,
  getDisplayMessage,
  shouldShowErrorBanner,
} from "@/lib/errors";
import { useServerFieldErrors } from "../hooks/use-server-field-errors";
import { useConfirmPasswordReset } from "../queries/mutations";
import { type RecoverConfirmFormData, recoverConfirmSchema } from "../schemas";
import {
  AUTH_FOOTER_LINK_CLASS,
  AuthFieldLabel,
  AuthHeading,
  AuthSubmitButton,
  BracketGlyph,
  TERMINAL_INPUT_CLASS,
} from "./auth-primitives";
import { AuthShell } from "./auth-shell";
import { ErrorBanner } from "./error-banner";

interface RecoverConfirmPageProps {
  uid: string;
  token: string;
  onSignIn: () => void;
  onRequestNewLink: () => void;
}

// Link-level errors all collapse to the `password_reset.invalid_token` code
// emitted by the backend exception handler. The handler groups three DRF
// signals under one code: `{"token": ["Invalid value"]}`, `{"uid": [...]}`,
// and `{"non_field_errors": ["... is not a valid UUID."]}`. Everything else
// (password validators, mismatch) keeps its own code and stays inline.
function isInvalidTokenError(error: AppError | null | undefined): boolean {
  return error?.kind === AppErrorKind.PASSWORD_RESET_INVALID_TOKEN;
}

export function RecoverConfirmPage({
  uid,
  token,
  onSignIn,
  onRequestNewLink,
}: RecoverConfirmPageProps) {
  const { t } = useTranslation("auth");
  const mutation = useConfirmPasswordReset();

  const form = useForm<RecoverConfirmFormData>({
    resolver: zodResolver(recoverConfirmSchema),
    defaultValues: { password1: "", password2: "" },
  });

  useServerFieldErrors(form, mutation.error, {
    new_password1: "password1",
    new_password2: "password2",
  });

  const onSubmit = (data: RecoverConfirmFormData) =>
    mutation.mutate({
      uid,
      token,
      new_password1: data.password1,
      new_password2: data.password2,
    });

  // Success swap (calm): new credential committed.
  if (mutation.isSuccess) {
    return (
      <AuthShell statusKey="hud.credentialReset">
        <BracketGlyph icon="check" label={t("recoverConfirm.successHeading")} />
        <AuthHeading align="center">{t("recoverConfirm.successHeading")}</AuthHeading>
        <p className="mb-6 text-center font-body text-base text-sofi-text-muted">
          {t("recoverConfirm.successBody")}
        </p>
        <AuthSubmitButton type="button" onClick={onSignIn} icon="login">
          {t("recoverConfirm.signIn")}
        </AuthSubmitButton>
      </AuthShell>
    );
  }

  // Fault swap (amber chrome): link is expired, tampered, or missing entirely.
  // Same route, swapped palette — the only place in the auth flow a calm screen
  // degrades to fault without a URL change. Pre-submit detection (missing
  // uid/token) avoids wasting the user's keystrokes on a doomed form.
  const missingParams = !uid || !token;
  if (missingParams || isInvalidTokenError(mutation.error)) {
    return (
      <AuthShell statusKey="hud.faultToken" variant="fault">
        <BracketGlyph
          icon="link_off"
          color="var(--color-sofi-orange)"
          label={t("recoverConfirm.expiredHeading")}
        />
        <AuthHeading align="center">{t("recoverConfirm.expiredHeading")}</AuthHeading>
        <p className="mb-6 text-center font-body text-base text-sofi-text-muted">
          {t("recoverConfirm.expiredBody")}
        </p>
        <AuthSubmitButton type="button" onClick={onRequestNewLink} icon="refresh">
          {t("recoverConfirm.requestNew")}
        </AuthSubmitButton>
      </AuthShell>
    );
  }

  const busy = form.formState.isSubmitting || mutation.isPending;
  const showBanner =
    !!mutation.error &&
    !isInvalidTokenError(mutation.error) &&
    shouldShowErrorBanner(mutation.error);

  return (
    <AuthShell
      statusKey="hud.resettingCredential"
      footer={
        <>
          <span className="text-sofi-text-dim">{t("recoverConfirm.rememberCredentials")} </span>
          <button type="button" onClick={onSignIn} className={AUTH_FOOTER_LINK_CLASS}>
            {t("recoverConfirm.authorize")}
          </button>
        </>
      }
    >
      <AuthHeading>{t("recoverConfirm.heading")}</AuthHeading>
      <p className="mb-6 font-body text-base text-sofi-text-muted">
        {t("recoverConfirm.subheading")}
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {showBanner && mutation.error && (
          <ErrorBanner message={getDisplayMessage(mutation.error)} />
        )}

        <Field>
          <AuthFieldLabel icon="lock">{t("recoverConfirm.newPasswordLabel")}</AuthFieldLabel>
          <PasswordInput
            {...form.register("password1")}
            autoComplete="new-password"
            placeholder="••••••••"
            className={TERMINAL_INPUT_CLASS}
            aria-invalid={!!form.formState.errors.password1}
          />
          <FieldError>{form.formState.errors.password1?.message}</FieldError>
        </Field>

        <Field>
          <AuthFieldLabel icon="lock">{t("recoverConfirm.confirmPasswordLabel")}</AuthFieldLabel>
          <PasswordInput
            {...form.register("password2")}
            autoComplete="new-password"
            placeholder="••••••••"
            className={TERMINAL_INPUT_CLASS}
            aria-invalid={!!form.formState.errors.password2}
          />
          <FieldError>{form.formState.errors.password2?.message}</FieldError>
        </Field>

        <AuthSubmitButton disabled={busy} aria-busy={busy} icon="vpn_key">
          {mutation.isPending ? t("recoverConfirm.committing") : t("recoverConfirm.commit")}
        </AuthSubmitButton>
      </form>
    </AuthShell>
  );
}
