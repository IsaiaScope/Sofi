import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/kanban/settings")({
  component: BoardSettingsComingSoon,
});

function BoardSettingsComingSoon() {
  const { t } = useTranslation("common");
  return (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      {t("comingSoon.boardSettings")}
    </div>
  );
}
