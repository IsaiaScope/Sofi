import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_authenticated/kanban/list")({
  component: ListViewComingSoon,
});

function ListViewComingSoon() {
  const { t } = useTranslation("common");
  return (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      {t("comingSoon.listView")}
    </div>
  );
}
