import { useTranslation } from "react-i18next";
import wordmark from "@/assets/sofi-wordmark.svg";
import { WindowChrome } from "@/components/layout/window-chrome";
import { HudBackdrop } from "@/components/shared/hud-backdrop";
import { HudCorners, ThemeToggle } from "@/components/shared/hud-corners";
import { useTheme } from "@/components/theme/theme-provider";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

const SCAN_HIGHLIGHT_GRADIENT =
  "linear-gradient(90deg, transparent, #22d3ee 40%, #ccfaff 50%, #22d3ee 60%, transparent)";

export function LoadingSplash() {
  const { t } = useTranslation("auth");
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className="fixed inset-0 z-40 overflow-hidden bg-sofi-bg">
      <WindowChrome />

      <HudBackdrop />

      <HudCorners
        topRight={
          <div className="flex items-center gap-3">
            <span className="font-mono text-base uppercase tracking-wider text-cyan-accent">
              {isLight ? t("hud.modeLight") : t("hud.modeDark")}
            </span>
            <ThemeToggle />
          </div>
        }
        bottomLeft={
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap font-mono text-base lowercase text-cyan-accent">
              sofi://boot
            </span>
            <span
              aria-hidden="true"
              className="font-mono text-cyan-accent"
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

      {/* Wrapper is pointer-events-none so the HUD corners at z-20 (notably the
          theme toggle) can still receive clicks through this full-viewport layer.
          The inline content doesn't need clicks. */}
      <div className="pointer-events-none relative z-30 flex h-full min-w-0 flex-col items-center justify-center px-6">
        <img
          src={wordmark}
          alt={APP_NAME}
          className="w-[340px] max-w-full select-none"
          draggable={false}
        />

        <div className="mt-10 h-[5px] w-[340px] max-w-full overflow-hidden rounded-full bg-gradient-to-r from-violet-primary to-cyan-accent">
          <div
            className="h-full w-10"
            style={{
              background: SCAN_HIGHLIGHT_GRADIENT,
              filter: "blur(1px)",
              animation: "sofi-scan 1.8s linear infinite",
            }}
          />
        </div>

        <p className="mt-5 max-w-full text-center font-label text-base uppercase tracking-[0.25em] text-sofi-text-muted">
          Initializing agent runtime
          <span
            aria-hidden="true"
            className="ml-2 inline-block size-2.5 translate-y-[-0.05em] rounded-full bg-cyan-accent align-middle"
            style={{ animation: "sofi-pulse-dot 1.2s ease-in-out infinite" }}
          />
        </p>
      </div>

      <span className="sr-only" role="status">
        Loading Sofi
      </span>
    </div>
  );
}
