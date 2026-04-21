import { useTranslation } from "react-i18next";
import { AuthHeading, AuthSubmitButton, BracketGlyph } from "./auth-primitives";
import { AuthShell } from "./auth-shell";

interface VerifySuccessPageProps {
  onSignIn: () => void;
}

export function VerifySuccessPage({ onSignIn }: VerifySuccessPageProps) {
  const { t } = useTranslation("auth");
  return (
    <AuthShell statusKey="hud.sessionVerified">
      <BracketGlyph icon="check" label={t("verifySuccess.title")} />
      <AuthHeading align="center">{t("verifySuccess.title")}</AuthHeading>
      <p className="-mt-2 mb-6 text-center font-mono text-base text-sofi-text-muted">
        {t("verifySuccess.body")}
      </p>
      <AuthSubmitButton type="button" onClick={onSignIn} icon="login">
        {t("verifySuccess.signIn")}
      </AuthSubmitButton>
    </AuthShell>
  );
}
