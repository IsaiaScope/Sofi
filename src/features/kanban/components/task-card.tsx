import { cn } from "@/lib/cn";
import type { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onClickTerminal?: (task: Task) => void;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
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
  const badge = STATUS_BADGE[task.status] ?? STATUS_BADGE.pending;
  const agentBorder = task.agent_type ? AGENT_COLORS[task.agent_type] ?? "" : "";

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border border-sofi-border bg-sofi-surface p-3 transition-colors hover:border-white/15",
        task.agent_type && `border-l-2 ${agentBorder}`,
        task.status === "done" && "opacity-50",
      )}
      onClick={() => task.agent_type && onClickTerminal?.(task)}
      onKeyDown={(e) =>
        e.key === "Enter" && task.agent_type && onClickTerminal?.(task)
      }
    >
      <p className="text-sm font-medium text-sofi-text">{task.title}</p>

      {(task.agent_name || badge.label) && (
        <div className="mt-2 flex items-center justify-between">
          {task.agent_name && (
            <span className="text-xs text-sofi-text-muted">
              {task.status === "done" ? "\u2713" : "\u25B6"} {task.agent_name}
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

      {!task.agent_name && task.status === "pending" && (
        <p className="mt-1.5 text-xs text-sofi-text-dim">No agent assigned</p>
      )}
    </div>
  );
}
