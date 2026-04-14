import { cn } from "@/lib/cn";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onClickTerminal?: (task: Task) => void;
}

const STATUS_BADGE: Record<Task["status"], { label: string; className: string }> = {
  pending: { label: "", className: "" },
  running: { label: "live", className: "bg-sofi-green/20 text-sofi-green" },
  review: { label: "diff ready", className: "bg-sofi-orange/20 text-sofi-orange" },
  done: { label: "done", className: "bg-sofi-green/10 text-sofi-green/60" },
  failed: { label: "failed", className: "bg-sofi-red/20 text-sofi-red" },
};

const AGENT_COLORS: Record<string, string> = {
  "claude-code": "border-l-sofi-blue",
  codex: "border-l-sofi-purple",
};

export function TaskCard({ task, onClickTerminal }: TaskCardProps) {
  const badge = STATUS_BADGE[task.status];
  const agentBorder = task.agentType ? AGENT_COLORS[task.agentType] : "";

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border border-sofi-border bg-sofi-surface p-3 transition-colors hover:border-white/15",
        task.agentType && `border-l-2 ${agentBorder}`,
        task.status === "done" && "opacity-50",
      )}
      onClick={() => task.agentType && onClickTerminal?.(task)}
      onKeyDown={(e) => e.key === "Enter" && task.agentType && onClickTerminal?.(task)}
    >
      <p className="text-sm font-medium text-sofi-text">{task.title}</p>

      {(task.agentName || badge.label) && (
        <div className="mt-2 flex items-center justify-between">
          {task.agentName && (
            <span className="text-xs text-sofi-text-muted">
              {task.status === "done" ? "✓" : "▶"} {task.agentName}
            </span>
          )}
          {badge.label && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-label text-[10px] font-medium",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          )}
        </div>
      )}

      {!task.agentName && task.status === "pending" && (
        <p className="mt-1.5 text-xs text-sofi-text-dim">No agent assigned</p>
      )}
    </div>
  );
}
