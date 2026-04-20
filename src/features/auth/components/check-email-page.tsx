import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AuthShell } from "./auth-shell";

interface CheckEmailPageProps {
  email: string;
  onBackToLogin: () => void;
}

export function CheckEmailPage({ email, onBackToLogin }: CheckEmailPageProps) {
  const { t } = useTranslation("auth");
  return (
    <AuthShell>
      <h1 className="mb-2 text-center font-heading text-xl font-semibold text-sofi-text">
        {t("checkEmail.title")}
      </h1>
      <p className="mb-6 text-center text-base text-sofi-text-muted">
        {email ? (
          <Trans
            i18nKey="auth:checkEmail.bodyWithEmail"
            values={{ email }}
            components={{ 1: <span className="font-medium text-sofi-text" /> }}
          />
        ) : (
          t("checkEmail.bodyNoEmail")
        )}
      </p>

      <Button type="button" variant="outline" size="lg" onClick={onBackToLogin}>
        {t("checkEmail.backToSignIn")}
      </Button>

      <p className="mt-5 text-center text-base text-sofi-text-dim">{t("checkEmail.spamHint")}</p>
    </AuthShell>
  );
}
