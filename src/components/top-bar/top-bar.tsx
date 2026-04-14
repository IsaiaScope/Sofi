import { cn } from "@/lib/cn";
import { APP_NAME, type View, VIEWS } from "@/lib/constants";
import logo from "@/assets/logo.svg";

interface TopBarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function TopBar({ activeView, onViewChange }: TopBarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-sofi-border bg-sofi-surface px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-1">
        <img src={logo} alt={APP_NAME} className="h-6 w-6" />
        <span className="font-heading text-sm font-bold text-white hidden md:block">
          {APP_NAME}
        </span>
      </div>

      {/* Navigation Selects */}
      <NavSelect
        label="Kanban"
        sublabel="My Project"
        isActive={activeView === VIEWS.KANBAN}
        activeColor="bg-violet-primary"
        onClick={() => onViewChange(VIEWS.KANBAN)}
      />
      <NavSelect
        label="Terminal"
        isActive={activeView === VIEWS.TERMINAL}
        activeColor="bg-sofi-green"
        onClick={() => onViewChange(VIEWS.TERMINAL)}
      />
      <NavSelect
        label="Git"
        isActive={activeView === VIEWS.GIT}
        activeColor="bg-sofi-orange"
        onClick={() => onViewChange(VIEWS.GIT)}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Agent Status Pills */}
      <div className="hidden lg:flex items-center gap-1.5">
        <AgentPill name="Claude" color="bg-sofi-green" />
        <AgentPill name="Codex" color="bg-sofi-blue" />
      </div>

      {/* User Avatar */}
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-muted text-xs font-medium text-violet-hover"
      >
        S
      </button>
    </header>
  );
}

interface NavSelectProps {
  label: string;
  sublabel?: string;
  isActive: boolean;
  activeColor: string;
  onClick: () => void;
}

function NavSelect({
  label,
  sublabel,
  isActive,
  activeColor,
  onClick,
}: NavSelectProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? `${activeColor} text-white`
          : "border border-sofi-border bg-transparent text-sofi-text-muted hover:bg-sofi-elevated hover:text-sofi-text",
      )}
    >
      <span className="hidden md:inline">
        {sublabel ? `${label}: ${sublabel}` : label}
      </span>
      <span className="md:hidden">{label.charAt(0)}</span>
      <svg
        className="h-2.5 w-2.5 opacity-50"
        fill="none"
        viewBox="0 0 10 6"
      >
        <title>dropdown</title>
        <path
          d="M1 1l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

interface AgentPillProps {
  name: string;
  color: string;
}

function AgentPill({ name, color }: AgentPillProps) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-sofi-elevated px-2.5 py-1 text-[10px] text-sofi-text-muted">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {name}
    </span>
  );
}
