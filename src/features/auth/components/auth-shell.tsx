import type { ReactNode } from "react";
import wordmark from "@/assets/sofi-wordmark.svg";
import { useTheme } from "@/components/theme/theme-provider";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

interface AuthShellProps {
  children: ReactNode;
  footer?: ReactNode;
  wordmarkTooltip?: ReactNode;
}

export function AuthShell({ children, footer, wordmarkTooltip }: AuthShellProps) {
  const wordmarkImg = (
    <img src={wordmark} alt={APP_NAME} className="h-10 cursor-help md:h-12 lg:h-14" />
  );

  return (
    <TooltipProvider delay={300}>
      <div className="relative flex min-h-screen items-center justify-center bg-sofi-terminal px-4 py-8">
        <span className="pointer-events-none absolute right-4 bottom-3 text-base text-sofi-text-dim">
          v{APP_VERSION}
        </span>
        <div className="w-full max-w-[22rem] md:max-w-md">
          <div className="relative rounded-2xl border border-sofi-border bg-sofi-surface p-5 shadow-sm md:p-6 lg:p-8">
            <ThemeToggle />
            <div className="mb-6 flex flex-col items-center gap-2">
              {wordmarkTooltip ? (
                <Tooltip content={wordmarkTooltip}>{wordmarkImg}</Tooltip>
              ) : (
                wordmarkImg
              )}
            </div>
            {children}
          </div>
          {footer && <div className="mt-6 text-center text-base text-white/70">{footer}</div>}
        </div>
      </div>
    </TooltipProvider>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isLight = theme === "light";
  const label = isLight ? "Switch to dark theme" : "Switch to light theme";
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={() => setTheme(isLight ? "dark" : "light")}
        aria-label={label}
        className="absolute top-0 right-0 flex h-10 w-10 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-sofi-border bg-sofi-elevated text-sofi-text shadow-lg transition-colors hover:bg-sofi-surface"
      >
        <span className="material-symbols-outlined !text-[20px]">
          {isLight ? "dark_mode" : "light_mode"}
        </span>
      </button>
    </Tooltip>
  );
}
