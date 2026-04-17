import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import wordmark from "@/assets/sofi-wordmark.svg";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { useAgents } from "@/features/agents/queries/hooks";
import { useSession } from "@/features/auth/queries/hooks";
import { useLogout } from "@/features/auth/queries/mutations";
import { useBoards } from "@/features/kanban/queries/hooks";
import { useCreateBoard } from "@/features/kanban/queries/mutations";
import { type CreateBoardFormData, createBoardSchema } from "@/features/kanban/schemas";
import { useKanbanUIStore } from "@/features/kanban/store/kanban-ui-store";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/constants";
import { getActiveSection } from "@/lib/routes";

export function TopBar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeView = getActiveSection(pathname);
  const { activeBoard, setActiveBoard } = useKanbanUIStore();
  const { data: user } = useSession();
  const logout = useLogout();
  const agentsQuery = useAgents();
  const agents = agentsQuery.data ?? [];
  const boardsQuery = useBoards(user?.id ?? "");
  const boards = boardsQuery.data ?? [];
  const createBoardMutation = useCreateBoard();
  const [showNewBoard, setShowNewBoard] = useState(false);

  const boardForm = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: "", repoPath: "" },
  });

  const userInitial = (user?.display_name ?? user?.username ?? "?")[0].toUpperCase();

  const handleCreateBoard = async (data: CreateBoardFormData) => {
    if (!user) return;
    const name =
      data.name || (data.repoPath ? nameFromPath(data.repoPath) : "") || "Untitled Board";
    await createBoardMutation.mutateAsync({
      userId: user.id,
      name,
      repoPath: data.repoPath || undefined,
    });
    boardForm.reset();
    setShowNewBoard(false);
  };

  const handlePickFolder = async () => {
    const selected = await openDialog({ directory: true, title: "Select Project Folder" });
    if (selected) {
      boardForm.setValue("repoPath", selected);
      if (!boardForm.getValues("name")) {
        boardForm.setValue("name", nameFromPath(selected));
      }
    }
  };

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-sofi-border bg-sofi-surface px-4">
        {/* Logo */}
        <div className="mr-1 flex items-center">
          <img src={wordmark} alt={APP_NAME} className="hidden h-6 md:block" />
          <img src={wordmark} alt={APP_NAME} className="h-5 w-5 md:hidden" />
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-4 rounded-xl border border-sofi-border bg-sofi-elevated/60 px-3 py-1.5">
          {/* Kanban Select */}
          <Menu
            trigger={
              <NavSelect
                icon="folder"
                label={activeBoard?.name ?? "Kanban"}
                isActive={activeView === "kanban"}
                activeColor="bg-violet-primary"
                activeShadow="shadow-lg shadow-violet-primary/20"
              />
            }
          >
            <MenuLabel>Boards</MenuLabel>
            {boards.map((board) => (
              <MenuItem
                key={board.id}
                active={board.id === activeBoard?.id}
                onClick={() => {
                  setActiveBoard(board);
                  navigate({ to: "/kanban" });
                }}
              >
                <span className="material-symbols-outlined !text-[16px]">folder</span>
                {board.name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem onClick={() => setShowNewBoard(true)}>+ New Board...</MenuItem>
          </Menu>

          {/* Terminal Select */}
          <NavSelect
            label="TERMINAL"
            isActive={activeView === "terminal"}
            activeColor="bg-sofi-green"
            activeShadow="shadow-lg shadow-sofi-green/20"
            onClick={() => navigate({ to: "/terminal" })}
          />

          {/* Git Select */}
          <NavSelect
            label="GIT"
            isActive={activeView === "git"}
            activeColor="bg-sofi-orange"
            activeShadow="shadow-lg shadow-sofi-orange/20"
            onClick={() => navigate({ to: "/git" })}
          />
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Agent Status Pills */}
        <div className="hidden items-center gap-1.5 lg:flex">
          {agents.map((a) => (
            <span
              key={a.config.agent_type}
              className="flex items-center gap-1.5 rounded-full bg-sofi-elevated px-2.5 py-1 text-base text-sofi-text-muted"
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

        {/* Settings */}
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
        </button>

        {/* Notifications (placeholder) */}
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text"
        >
          <span className="material-symbols-outlined text-xl">notifications</span>
        </button>

        {/* User Avatar */}
        <Menu
          align="right"
          trigger={
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-muted text-base font-medium text-violet-hover"
            >
              {userInitial}
            </button>
          }
        >
          <MenuLabel>{user?.username}</MenuLabel>
          <MenuItem onClick={logout}>Sign Out</MenuItem>
        </Menu>
      </header>

      {/* New Board Dialog */}
      <Dialog open={showNewBoard} onClose={() => setShowNewBoard(false)} title="New Board">
        <form onSubmit={boardForm.handleSubmit(handleCreateBoard)}>
          <Field className="mb-4">
            <FieldLabel>Board Name</FieldLabel>
            <Input {...boardForm.register("name")} placeholder="My Project" autoFocus />
            <FieldError>{boardForm.formState.errors.name?.message}</FieldError>
          </Field>
          <Field className="mb-6">
            <FieldLabel>Repository Path (optional)</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                {...boardForm.register("repoPath")}
                placeholder="/path/to/git/repo"
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handlePickFolder}>
                Browse
              </Button>
            </div>
          </Field>
          <Button type="submit" size="lg" disabled={createBoardMutation.isPending}>
            Create Board
          </Button>
        </form>
      </Dialog>
    </>
  );
}

interface NavSelectProps {
  label: string;
  icon?: string;
  isActive: boolean;
  activeColor: string;
  activeShadow?: string;
  onClick?: () => void;
}

function NavSelect({ label, icon, isActive, activeColor, activeShadow, onClick }: NavSelectProps) {
  const base = isActive
    ? `${activeColor} text-white ${activeShadow ?? ""}`
    : "bg-white/5 border border-white/10 text-sofi-text-muted hover:bg-white/10 hover:text-sofi-text";

  return (
    <button type="button" onClick={onClick} className="flex items-center gap-0.5">
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-l-md px-3 py-1 text-sm font-semibold tracking-wider transition-colors",
          base,
        )}
      >
        {icon && <span className="material-symbols-outlined !text-[16px]">{icon}</span>}
        {label}
      </span>
      <span className={cn("flex items-center rounded-r-md px-1 py-1 transition-colors", base)}>
        <span className="material-symbols-outlined !text-[16px]">expand_more</span>
      </span>
    </button>
  );
}

/** Derives a board name from a file path: "/Users/me/projects/my-app" → "My App" */
function nameFromPath(path: string): string {
  const folder = path.replace(/\/+$/, "").split("/").pop() ?? "";
  return folder
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
