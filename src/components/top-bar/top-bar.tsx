import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import wordmark from "@/assets/sofi-wordmark.svg";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { useSession } from "@/features/auth/queries/hooks";
import { useLogout } from "@/features/auth/queries/mutations";
import { FOCUS_RING } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/constants";
import { getActiveSection } from "@/lib/routes";

export function TopBar() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeView = getActiveSection(pathname);
  const { data: user } = useSession();
  const logout = useLogout();

  const userInitial = (user?.display_name || user?.email || "?")[0].toUpperCase();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-sofi-border bg-sofi-surface px-4">
      <div className="mr-1 flex items-center">
        <img src={wordmark} alt={APP_NAME} className="hidden h-6 md:block" />
        <img src={wordmark} alt={APP_NAME} className="h-5 w-5 md:hidden" />
      </div>

      <nav className="flex items-center gap-4 rounded-xl border border-sofi-border bg-sofi-elevated/60 px-3 py-1.5">
        <NavSelect
          label={t("topbar.welcome")}
          isActive={activeView === "welcome"}
          activeColor="bg-violet-primary"
          activeShadow="shadow-lg shadow-violet-primary/20"
          onClick={() => navigate({ to: "/" })}
        />
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => navigate({ to: "/settings" })}
        aria-label={t("topbar.settings")}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text",
          FOCUS_RING,
        )}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-xl">
          settings
        </span>
      </button>

      <Menu
        align="right"
        trigger={
          <button
            type="button"
            aria-label={t("topbar.userMenu")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-violet-muted text-base font-medium text-violet-hover",
              FOCUS_RING,
            )}
          >
            {userInitial}
          </button>
        }
      >
        <MenuLabel>{user?.email}</MenuLabel>
        <MenuItem onClick={() => logout.mutate()}>{t("topbar.signOut")}</MenuItem>
      </Menu>
    </header>
  );
}

interface NavSelectProps {
  label: string;
  isActive: boolean;
  activeColor: string;
  activeShadow?: string;
  onClick?: () => void;
}

function NavSelect({ label, isActive, activeColor, activeShadow, onClick }: NavSelectProps) {
  const base = isActive
    ? `${activeColor} text-white ${activeShadow ?? ""}`
    : "bg-white/5 border border-white/10 text-sofi-text-muted hover:bg-white/10 hover:text-sofi-text";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center rounded-md", FOCUS_RING)}
    >
      <span
        className={cn(
          "flex items-center rounded-md px-3 py-1 text-base font-semibold tracking-wider transition-colors",
          base,
        )}
      >
        {label}
      </span>
    </button>
  );
}
