import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { cn } from "@/lib/cn";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/resources";
import { useUpdateLocale } from "../queries/mutations";

export function LanguageSection() {
  const { t, i18n } = useTranslation("settings");
  const mutation = useUpdateLocale();

  const labels: Record<SupportedLanguage, string> = {
    en: t("language.english"),
    it: t("language.italian"),
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading level={2} size="sm">
          {t("language.title")}
        </Heading>
        <p className="text-base text-sofi-text-muted">{t("language.description")}</p>
      </div>
      <Card
        variant="elevated"
        padding="xs"
        role="radiogroup"
        aria-label={t("language.title")}
        className="flex items-center gap-2"
      >
        {SUPPORTED_LANGUAGES.map((code) => {
          const isActive = i18n.language === code;
          return (
            // biome-ignore lint/a11y/useSemanticElements: styled segmented control requires <button role="radio"> rather than a native <input type="radio">.
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => mutation.mutate(code)}
              disabled={mutation.isPending}
              className={cn(
                "flex-1 rounded-md px-4 py-2 font-medium text-base transition-colors",
                isActive
                  ? "bg-violet-primary text-white shadow-lg shadow-violet-primary/20"
                  : "text-sofi-text-muted hover:bg-sofi-border hover:text-sofi-text",
              )}
            >
              {labels[code]}
            </button>
          );
        })}
      </Card>
    </section>
  );
}
