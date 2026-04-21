import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import wordmark from "@/assets/sofi-wordmark.svg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { useAgents } from "@/features/agents/queries/hooks";
import { useSession } from "@/features/auth/queries/hooks";
import { useLogout } from "@/features/auth/queries/mutations";
import { useBoards } from "@/features/kanban/queries/hooks";
import { useCreateBoard } from "@/features/kanban/queries/mutations";
import { type CreateBoardFormData, createBoardSchema } from "@/features/kanban/schemas";
import { useKanbanUIStore } from "@/features/kanban/store/kanban-ui-store";
import { FOCUS_RING } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/constants";
import { getActiveSection } from "@/lib/routes";

export function TopBar() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeView = getActiveSection(pathname);
  const { activeBoard, setActiveBoard } = useKanbanUIStore();
  const { data: user } = useSession();
  const logout = useLogout();
  const agentsQuery = useAgents();
  const agents = agentsQuery.data ?? [];
  const boardsQuery = useBoards({ enabled: !!user });
  const boards = boardsQuery.data ?? [];
  const createBoardMutation = useCreateBoard();
  const [showNewBoard, setShowNewBoard] = useState(false);

  const boardForm = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: "", repoPath: "" },
  });

  const userInitial = (user?.display_name || user?.email || "?")[0].toUpperCase();

  const handleCreateBoard = async (data: CreateBoardFormData) => {
    if (!user) return;
    const name =
      data.name ||
      (data.repoPath ? nameFromPath(data.repoPath) : "") ||
      t("topbar.newBoardDialog.defaultName");
    await createBoardMutation.mutateAsync({
      name,
      repoPath: data.repoPath || undefined,
    });
    boardForm.reset();
    setShowNewBoard(false);
  };

  const handlePickFolder = async () => {
    const selected = await openDialog({
      directory: true,
      title: t("topbar.newBoardDialog.folderPickerTitle"),
    });
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
                label={activeBoard?.name ?? t("topbar.kanban")}
                isActive={activeView === "kanban"}
                activeColor="bg-violet-primary"
                activeShadow="shadow-lg shadow-violet-primary/20"
              />
            }
          >
            <MenuLabel>{t("topbar.boards")}</MenuLabel>
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
            <MenuItem onClick={() => setShowNewBoard(true)}>{t("topbar.newBoard")}</MenuItem>
          </Menu>

          {/* Terminal Select */}
          <NavSelect
            label={t("topbar.terminal")}
            isActive={activeView === "terminal"}
            activeColor="bg-sofi-green"
            activeShadow="shadow-lg shadow-sofi-green/20"
            onClick={() => navigate({ to: "/terminal" })}
          />

          {/* Git Select */}
          <NavSelect
            label={t("topbar.git")}
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
            <Badge key={a.config.agent_type} tone="muted" size="md">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  a.available ? "bg-sofi-green" : "bg-sofi-text-dim",
                )}
              />
              {a.config.display_name}
            </Badge>
          ))}
        </div>

        {/* Settings */}
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

        {/* Notifications (placeholder) */}
        <button
          type="button"
          aria-label={t("topbar.notifications")}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text",
            FOCUS_RING,
          )}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">
            notifications
          </span>
        </button>

        {/* User Avatar */}
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

      {/* New Board Dialog */}
      <Dialog
        open={showNewBoard}
        onClose={() => setShowNewBoard(false)}
        title={t("topbar.newBoardDialog.title")}
      >
        <form onSubmit={boardForm.handleSubmit(handleCreateBoard)}>
          <Field className="mb-4" error={boardForm.formState.errors.name?.message}>
            <FieldLabel>{t("topbar.newBoardDialog.nameLabel")}</FieldLabel>
            <Input
              {...boardForm.register("name")}
              placeholder={t("topbar.newBoardDialog.namePlaceholder")}
              autoFocus
            />
          </Field>
          <Field className="mb-6">
            <FieldLabel>{t("topbar.newBoardDialog.repoLabel")}</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                {...boardForm.register("repoPath")}
                placeholder={t("topbar.newBoardDialog.repoPlaceholder")}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handlePickFolder}>
                {t("topbar.newBoardDialog.browse")}
              </Button>
            </div>
          </Field>
          <Button type="submit" size="lg" disabled={createBoardMutation.isPending}>
            {t("topbar.newBoardDialog.create")}
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
    <button
      type="button"
      onClick={onClick}
      className={cn("flex items-center gap-0.5 rounded-md", FOCUS_RING)}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-l-md px-3 py-1 text-base font-semibold tracking-wider transition-colors",
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
