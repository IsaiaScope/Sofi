import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Heading } from "@/components/ui/heading";
import { useDeleteAccount } from "@/features/auth/queries/mutations";
import { cn } from "@/lib/cn";
import { ApiTokensSection } from "./api-tokens-section";
import { LanguageSection } from "./language-section";

export function SettingsPage() {
  const { t } = useTranslation("settings");
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 p-4 md:gap-8 md:p-8">
      <Heading level={1} size="lg">
        {t("page.title")}
      </Heading>

      <AppearanceSection />
      <LanguageSection />
      <ApiTokensSection />
      <DangerZoneSection />
    </div>
  );
}

function AppearanceSection() {
  const { t } = useTranslation("settings");
  const { theme, setTheme } = useTheme();
  const options: { value: "system" | "light" | "dark"; label: string; description: string }[] = [
    {
      value: "system",
      label: t("appearance.system"),
      description: t("appearance.systemDescription"),
    },
    { value: "light", label: t("appearance.light"), description: t("appearance.lightDescription") },
    { value: "dark", label: t("appearance.dark"), description: t("appearance.darkDescription") },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading level={2} size="sm">
          {t("appearance.title")}
        </Heading>
        <p className="text-base text-sofi-text-muted">{t("appearance.description")}</p>
      </div>

      <Card
        variant="elevated"
        padding="xs"
        role="radiogroup"
        aria-label={t("appearance.ariaLabel")}
        className="flex items-center gap-2"
      >
        {options.map((opt) => {
          const isActive = theme === opt.value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: styled segmented control requires <button role="radio"> rather than a native <input type="radio">.
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex-1 rounded-md px-4 py-2 font-medium text-base transition-colors",
                isActive
                  ? "bg-violet-primary text-white shadow-lg shadow-violet-primary/20"
                  : "text-sofi-text-muted hover:bg-sofi-border hover:text-sofi-text",
              )}
            >
              <div>{opt.label}</div>
              <div className="font-normal text-base opacity-70">{opt.description}</div>
            </button>
          );
        })}
      </Card>
    </section>
  );
}

function DangerZoneSection() {
  const { t } = useTranslation("settings");
  const [open, setOpen] = useState(false);
  const deleteAccount = useDeleteAccount();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading level={2} size="sm" tone="danger">
          {t("dangerZone.title")}
        </Heading>
        <p className="text-base text-sofi-text-muted">{t("dangerZone.description")}</p>
      </div>

      <Card variant="danger" className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <div className="font-medium text-sofi-text">{t("dangerZone.deleteAccount")}</div>
          <div className="text-base text-sofi-text-muted">{t("dangerZone.deleteDescription")}</div>
        </div>
        <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
          {t("dangerZone.deleteAccount")}
        </Button>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} title={t("dangerZone.confirmTitle")}>
        <p className="text-base text-sofi-text-muted">{t("dangerZone.confirmDescription")}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleteAccount.isPending}
            onClick={() => setOpen(false)}
          >
            {t("dangerZone.cancel")}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={deleteAccount.isPending}
            onClick={() => deleteAccount.mutate()}
          >
            {deleteAccount.isPending ? t("dangerZone.deleting") : t("dangerZone.confirmButton")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
