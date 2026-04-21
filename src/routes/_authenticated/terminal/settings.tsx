import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/terminal/settings")({
  component: ShellSettingsComingSoon,
});

function ShellSettingsComingSoon() {
  const { t } = useTranslation("common");
  return (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      {t("comingSoon.shellSettings")}
    </div>
  );
}
