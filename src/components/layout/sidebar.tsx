import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";
import { cn } from "@/lib/cn";
import { type AppSection, getActiveSection, getGitSubView } from "@/lib/routes";

interface SidebarItem {
  icon: string;
  label: string;
  route?: string;
  action?: string;
  position?: "bottom";
}

const SECTION_ITEMS: Record<AppSection, SidebarItem[]> = {
  kanban: [
    { icon: "dashboard", label: "Board", route: "/kanban" },
    { icon: "smart_toy", label: "Agents", route: "/kanban/agents" },
    { icon: "view_list", label: "List", route: "/kanban/list" },
    { icon: "settings", label: "Settings", route: "/kanban/settings", position: "bottom" },
  ],
  terminal: [
    { icon: "terminal", label: "Sessions", route: "/terminal" },
    { icon: "add", label: "New Session", action: "newTerminal" },
    { icon: "settings", label: "Settings", route: "/terminal/settings", position: "bottom" },
  ],
  git: [
    { icon: "difference", label: "Diff", route: "/git" },
    { icon: "account_tree", label: "Branches", route: "/git/branches" },
    { icon: "history", label: "History", route: "/git/history" },
  ],
  settings: [],
};

const SECTION_COLORS: Record<AppSection, string> = {
  kanban: "bg-[#1a3a6e] text-[#adc6ff]",
  terminal: "bg-sofi-green/15 text-sofi-green",
  git: "bg-sofi-orange/15 text-sofi-orange",
  settings: "",
};

function isItemActive(item: SidebarItem, pathname: string, section: AppSection): boolean {
  if (!item.route) return false;
  if (section === "git") {
    const gitSub = getGitSubView(pathname);
    if (item.route === "/git" && gitSub === "diff") return true;
    if (item.route === "/git/branches" && gitSub === "branches") return true;
    if (item.route === "/git/history" && gitSub === "history") return true;
    return false;
  }
  if (item.route === `/${section}`) {
    const subItems = SECTION_ITEMS[section].filter((i) => i.route && i.route !== `/${section}`);
    return !subItems.some((i) => i.route && pathname.startsWith(i.route));
  }
  return pathname.startsWith(item.route);
}

interface SidebarProps {
  onNewTerminalSession?: () => void;
}

export function Sidebar({ onNewTerminalSession }: SidebarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeSection = getActiveSection(pathname);
  const items = SECTION_ITEMS[activeSection];

  const handleClick = useCallback(
    (item: SidebarItem) => {
      if (item.route) {
        navigate({ to: item.route });
      } else if (item.action === "newTerminal" && onNewTerminalSession) {
        onNewTerminalSession();
      }
    },
    [navigate, onNewTerminalSession],
  );

  if (items.length === 0) return null;

  const topItems = items.filter((i) => i.position !== "bottom");
  const bottomItems = items.filter((i) => i.position === "bottom");

  return (
    <aside className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-sofi-border bg-sofi-bg py-2">
      {topItems.map((item) => (
        <SidebarIcon
          key={item.icon + item.label}
          icon={item.icon}
          label={item.label}
          active={isItemActive(item, pathname, activeSection)}
          activeColor={SECTION_COLORS[activeSection]}
          onClick={() => handleClick(item)}
        />
      ))}
      <div className="flex-1" />
      {bottomItems.map((item) => (
        <SidebarIcon
          key={item.icon + item.label}
          icon={item.icon}
          label={item.label}
          active={isItemActive(item, pathname, activeSection)}
          activeColor={SECTION_COLORS[activeSection]}
          onClick={() => handleClick(item)}
        />
      ))}
    </aside>
  );
}

interface SidebarIconProps {
  icon: string;
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
}

function SidebarIcon({ icon, label, active, activeColor, onClick }: SidebarIconProps) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        active ? activeColor : "text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text",
      )}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </button>
  );
}
