import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

const STATUS_BADGE: Record<string, { labelKey: string | null; className: string }> = {
  pending: { labelKey: null, className: "" },
  running: { labelKey: "taskCard.status.live", className: "bg-sofi-green/20 text-sofi-green" },
  review: {
    labelKey: "taskCard.status.diffReady",
    className: "bg-sofi-orange/20 text-sofi-orange",
  },
  done: { labelKey: "taskCard.status.done", className: "bg-sofi-green/10 text-sofi-green/60" },
  failed: { labelKey: "taskCard.status.failed", className: "bg-sofi-red/20 text-sofi-red" },
};

const AGENT_COLORS: Record<string, string> = {
  "claude-code": "border-l-sofi-blue",
  codex: "border-l-sofi-purple",
};

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const { t } = useTranslation("kanban");
  const badge = STATUS_BADGE[task.status] ?? STATUS_BADGE.pending;
  const badgeLabel = badge.labelKey ? t(badge.labelKey) : "";
  const agentBorder = task.agent_type ? (AGENT_COLORS[task.agent_type] ?? "") : "";

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border border-sofi-border bg-sofi-surface p-3 transition-colors hover:border-white/15",
        task.agent_type && `border-l-2 ${agentBorder}`,
        task.status === "done" && "opacity-50",
        isDragging && "opacity-50 ring-2 ring-violet-primary",
      )}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <p className="text-sm font-medium text-sofi-text">{task.title}</p>

      {(task.agent_name || badgeLabel) && (
        <div className="mt-2 flex items-center justify-between">
          {task.agent_name && (
            <span className="text-xs text-sofi-text-muted">
              {task.status === "done" ? "\u2713" : "\u25B6"} {task.agent_name}
            </span>
          )}
          {badgeLabel && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-label text-[10px] font-medium",
                badge.className,
              )}
            >
              {badgeLabel}
            </span>
          )}
        </div>
      )}

      {!task.agent_name && task.status === "pending" && (
        <p className="mt-1.5 text-xs text-sofi-text-dim">{t("taskCard.noAgent")}</p>
      )}
    </div>
  );
}
