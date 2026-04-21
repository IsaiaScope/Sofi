import { Trans, useTranslation } from "react-i18next";
import { AuthHeading, AuthOutlineButton } from "./auth-primitives";
import { AuthShell } from "./auth-shell";

interface CheckEmailPageProps {
  email: string;
  onBackToLogin: () => void;
}

export function CheckEmailPage({ email, onBackToLogin }: CheckEmailPageProps) {
  const { t } = useTranslation("auth");
  return (
    <AuthShell statusKey="hud.awaitingVerification">
      <AuthHeading>{t("checkEmail.title")}</AuthHeading>

      <p className="mb-4 font-body text-base text-sofi-text">
        {email ? (
          <Trans
            i18nKey="auth:checkEmail.dispatchedWithEmail"
            values={{ email }}
            components={{ 1: <span key="email" className="text-cyan-accent" /> }}
          />
        ) : (
          t("checkEmail.dispatchedNoEmail")
        )}
      </p>

      <p className="mb-6 font-body text-base text-sofi-text-muted">
        {t("checkEmail.instructions")}
      </p>

      <AuthOutlineButton onClick={onBackToLogin} icon="arrow_back" iconPosition="trailing">
        {t("checkEmail.backToSignIn")}
      </AuthOutlineButton>
    </AuthShell>
  );
}
