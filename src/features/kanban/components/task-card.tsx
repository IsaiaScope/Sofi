import { useTranslation } from "react-i18next";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FOCUS_RING } from "@/lib/a11y";
import { cn } from "@/lib/cn";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragging?: boolean;
}

type StatusTone = NonNullable<BadgeProps["tone"]>;

const STATUS_BADGE: Record<string, { labelKey: string | null; tone: StatusTone }> = {
  pending: { labelKey: null, tone: "neutral" },
  running: { labelKey: "taskCard.status.live", tone: "success" },
  review: { labelKey: "taskCard.status.diffReady", tone: "warning" },
  done: { labelKey: "taskCard.status.done", tone: "success-muted" },
  failed: { labelKey: "taskCard.status.failed", tone: "danger" },
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
    <Card
      variant="surface"
      padding="md"
      hoverable
      role="button"
      tabIndex={0}
      aria-label={task.title}
      className={cn(
        task.agent_type && `border-l-2 ${agentBorder}`,
        task.status === "done" && "opacity-50",
        isDragging && "opacity-50 ring-2 ring-violet-primary",
        FOCUS_RING,
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <p className="font-medium text-sm text-sofi-text">{task.title}</p>

      {(task.agent_name || badgeLabel) && (
        <div className="mt-2 flex items-center justify-between">
          {task.agent_name && (
            <span className="text-sofi-text-muted text-xs">
              {task.status === "done" ? "✓" : "▶"} {task.agent_name}
            </span>
          )}
          {badgeLabel && (
            <Badge tone={badge.tone} font="label">
              {badgeLabel}
            </Badge>
          )}
        </div>
      )}

      {!task.agent_name && task.status === "pending" && (
        <p className="mt-1.5 text-sofi-text-dim text-xs">{t("taskCard.noAgent")}</p>
      )}
    </Card>
  );
}
