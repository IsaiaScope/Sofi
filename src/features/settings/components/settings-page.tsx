import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useDeleteAccount } from "@/features/auth/queries/mutations";
import { cn } from "@/lib/cn";
import { ApiTokensSection } from "./api-tokens-section";

export function SettingsPage() {
  const { t } = useTranslation("settings");
  return (
    <div className="flex flex-col gap-8 p-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-sofi-text">{t("page.title")}</h1>
      </header>

      <AppearanceSection />
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
        <h2 className="text-lg font-semibold text-sofi-text">{t("appearance.title")}</h2>
        <p className="text-base text-sofi-text-muted">{t("appearance.description")}</p>
      </div>

      <div
        role="radiogroup"
        aria-label={t("appearance.ariaLabel")}
        className="flex items-center gap-2 rounded-lg border border-sofi-border bg-sofi-elevated p-1"
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
                "flex-1 rounded-md px-4 py-2 text-base font-medium transition-colors",
                isActive
                  ? "bg-violet-primary text-white shadow-lg shadow-violet-primary/20"
                  : "text-sofi-text-muted hover:bg-sofi-border hover:text-sofi-text",
              )}
            >
              <div>{opt.label}</div>
              <div className="text-base font-normal opacity-70">{opt.description}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DangerZoneSection() {
  const [open, setOpen] = useState(false);
  const deleteAccount = useDeleteAccount();

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-sofi-red">Danger zone</h2>
        <p className="text-base text-sofi-text-muted">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-sofi-red/40 bg-sofi-red/5 px-4 py-3">
        <div>
          <div className="font-medium text-sofi-text">Delete account</div>
          <div className="text-base text-sofi-text-muted">
            Wipes your user, boards, tasks, attachments, and API tokens.
          </div>
        </div>
        <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Delete account?">
        <p className="text-base text-sofi-text-muted">
          This will permanently delete your account and every board, task, attachment, and API token
          owned by you. There is no recovery.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={deleteAccount.isPending}
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={deleteAccount.isPending}
            onClick={() => deleteAccount.mutate()}
          >
            {deleteAccount.isPending ? "Deleting…" : "Yes, delete my account"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
