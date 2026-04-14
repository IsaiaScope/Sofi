import { useEffect, useState } from "react";
import logo from "@/assets/logo.svg";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { useAgentStore } from "@/features/agents/store/agent-store";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { useKanbanStore } from "@/features/kanban/store/kanban-store";
import { cn } from "@/lib/cn";
import { APP_NAME, VIEWS, type View } from "@/lib/constants";

interface TopBarProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export function TopBar({ activeView, onViewChange }: TopBarProps) {
  const { activeBoard, boards, setActiveBoard, createBoard } = useKanbanStore();
  const { agents, loadAgents } = useAgentStore();
  const { user, logout } = useAuthStore();
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardRepo, setNewBoardRepo] = useState("");

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const userInitial = (user?.display_name ?? user?.username ?? "?")[0].toUpperCase();

  const handleCreateBoard = async () => {
    if (!newBoardName.trim() || !user) return;
    await createBoard(user.id, newBoardName.trim(), undefined, newBoardRepo.trim() || undefined);
    setNewBoardName("");
    setNewBoardRepo("");
    setShowNewBoard(false);
  };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-sofi-border bg-sofi-surface px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <img src={logo} alt={APP_NAME} className="h-6 w-6" />
          <span className="font-heading text-sm font-bold text-white hidden md:block">
            {APP_NAME}
          </span>
        </div>

        {/* Kanban Select with Board Dropdown */}
        <Dropdown
          trigger={
            <NavButton
              label="Kanban"
              sublabel={activeBoard?.name}
              isActive={activeView === VIEWS.KANBAN}
              activeColor="bg-violet-primary"
            />
          }
        >
          <DropdownLabel>Boards</DropdownLabel>
          {boards.map((board) => (
            <DropdownItem
              key={board.id}
              active={board.id === activeBoard?.id}
              onClick={() => {
                setActiveBoard(board);
                onViewChange(VIEWS.KANBAN);
              }}
            >
              {board.name}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          <DropdownItem onClick={() => setShowNewBoard(true)}>+ New Board...</DropdownItem>
        </Dropdown>

        {/* Terminal Select */}
        <NavButton
          label="Terminal"
          isActive={activeView === VIEWS.TERMINAL}
          activeColor="bg-sofi-green"
          onClick={() => onViewChange(VIEWS.TERMINAL)}
        />

        {/* Git Select */}
        <NavButton
          label="Git"
          isActive={activeView === VIEWS.GIT}
          activeColor="bg-sofi-orange"
          onClick={() => onViewChange(VIEWS.GIT)}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Agent Status Pills (dynamic) */}
        <div className="hidden lg:flex items-center gap-1.5">
          {agents.map((a) => (
            <span
              key={a.config.agent_type}
              className="flex items-center gap-1.5 rounded-full bg-sofi-elevated px-2.5 py-1 text-[10px] text-sofi-text-muted"
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  a.available ? "bg-sofi-green" : "bg-sofi-text-dim",
                )}
              />
              {a.config.display_name}
            </span>
          ))}
        </div>

        {/* User Avatar */}
        <Dropdown
          align="right"
          trigger={
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-muted text-xs font-medium text-violet-hover"
            >
              {userInitial}
            </button>
          }
        >
          <DropdownLabel>{user?.username}</DropdownLabel>
          <DropdownItem onClick={logout}>Sign Out</DropdownItem>
        </Dropdown>
      </header>

      {/* New Board Modal */}
      <Modal open={showNewBoard} onClose={() => setShowNewBoard(false)} title="New Board">
        <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-dim">
          Board Name
        </label>
        <input
          type="text"
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
          placeholder="My Project"
          autoFocus
          className="mb-4 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
        />
        <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-dim">
          Repository Path (optional)
        </label>
        <input
          type="text"
          value={newBoardRepo}
          onChange={(e) => setNewBoardRepo(e.target.value)}
          placeholder="/path/to/git/repo"
          className="mb-6 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
        />
        <button
          type="button"
          onClick={handleCreateBoard}
          disabled={!newBoardName.trim()}
          className="w-full rounded-lg bg-violet-primary py-2.5 text-sm font-semibold text-white hover:bg-violet-hover disabled:opacity-40"
        >
          Create Board
        </button>
      </Modal>
    </>
  );
}

interface NavButtonProps {
  label: string;
  sublabel?: string;
  isActive: boolean;
  activeColor: string;
  onClick?: () => void;
}

function NavButton({ label, sublabel, isActive, activeColor, onClick }: NavButtonProps) {
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
      <span className="hidden md:inline">{sublabel ? `${label}: ${sublabel}` : label}</span>
      <span className="md:hidden">{label.charAt(0)}</span>
      <svg className="h-2.5 w-2.5 opacity-50" fill="none" viewBox="0 0 10 6">
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
