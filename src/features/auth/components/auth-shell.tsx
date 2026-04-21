import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import sofiWordmark from "@/assets/sofi-wordmark-tight.svg";
import { HudBackdrop } from "@/components/shared/hud-backdrop";
import { HudCorners, ThemeToggle } from "@/components/shared/hud-corners";
import { useTheme } from "@/components/theme/theme-provider";
import { MAIN_LANDMARK_ID } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

interface AuthShellProps {
  children: ReactNode;
  footer?: ReactNode;
  /** i18n key for the bottom-left status line. Defaults to `hud.awaitingCredentials`. */
  statusKey?: string;
  /** Chrome accent. `calm` = cyan (auth flow). `fault` = amber (error screens). */
  variant?: "calm" | "fault";
}

const CHAMFERED_CARD =
  "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)";

export function AuthShell({
  children,
  footer,
  statusKey = "hud.awaitingCredentials",
  variant = "calm",
}: AuthShellProps) {
  const { t } = useTranslation("auth");
  const { theme } = useTheme();
  const isLight = theme === "light";
  const isFault = variant === "fault";
  const chromeClass = isFault ? "text-sofi-orange" : "text-cyan-accent";
  const cardOuterClass = isFault ? "bg-sofi-orange/30" : "bg-cyan-accent/30";
  const cardBloomVar: CSSProperties["boxShadow"] = isFault
    ? "0 0 40px var(--color-sofi-orange-muted)"
    : "0 0 40px var(--color-violet-muted)";
  const cardInnerBorderClass = isFault ? "border-sofi-orange/20" : "border-cyan-accent/20";

  return (
    <div className="relative min-h-screen overflow-hidden bg-sofi-bg font-body text-sofi-text">
      <HudBackdrop />

      <HudCorners
        variant={variant}
        topLeft={
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined !text-[28px] text-violet-primary">
              terminal
            </span>
            <img src={sofiWordmark} alt={APP_NAME} className="h-6 w-auto" />
          </div>
        }
        topRight={
          <div className="flex items-center gap-3">
            <span className={cn("font-mono text-base uppercase tracking-wider", chromeClass)}>
              {isLight ? t("hud.modeLight") : t("hud.modeDark")}
            </span>
            <ThemeToggle variant={variant} />
          </div>
        }
        bottomLeft={
          <div className="flex items-center gap-2">
            <span className={cn("whitespace-nowrap font-mono text-base lowercase", chromeClass)}>
              {t(statusKey)}
            </span>
            <span
              aria-hidden="true"
              className={cn("font-mono", chromeClass)}
              style={{ animation: "sofi-pulse-dot 1.2s ease-in-out infinite" }}
            >
              _
            </span>
          </div>
        }
        bottomRight={
          <span className="font-mono text-base tracking-widest text-sofi-green">
            {t("hud.build", { version: APP_VERSION })}
          </span>
        }
      />

      {/* Card — double-layered chamfer: outer cyan-tinted clip path acts as the border
          (clip-path clips ordinary borders, so we "paint" one via a 1px-inset inner layer).
          `<main>` is pointer-events-none so the HUD below it (z-20) can still receive
          clicks on the theme toggle; the card sets pointer-events-auto on itself. */}
      <main
        id={MAIN_LANDMARK_ID}
        tabIndex={-1}
        className="pointer-events-none relative z-30 flex min-h-screen items-center justify-center p-4 outline-none"
      >
        <div className="pointer-events-auto w-full max-w-[28rem]">
          <div
            className={cn("relative p-px", cardOuterClass)}
            style={{ clipPath: CHAMFERED_CARD, boxShadow: cardBloomVar }}
          >
            <div
              className="relative bg-sofi-surface p-6 md:p-8"
              style={{ clipPath: CHAMFERED_CARD }}
            >
              {children}
              {footer && (
                <div
                  className={cn(
                    "mt-6 border-t pt-4 text-center font-mono text-base text-sofi-text-dim",
                    cardInnerBorderClass,
                  )}
                >
                  {footer}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
