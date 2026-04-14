import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { useKanbanStore } from "../store/kanban-store";
import type { Task } from "../types";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onOpenTerminal?: () => void;
}

const STATUS_OPTIONS = ["pending", "running", "review", "done", "failed"];

export function TaskDetailModal({ task, onClose, onOpenTerminal }: TaskDetailModalProps) {
  const { updateTask, deleteTask } = useKanbanStore();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");

  if (!task) return null;

  const handleTitleBlur = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask({ id: task.id, title: trimmed });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== (task.description ?? "")) {
      updateTask({ id: task.id, description });
    }
  };

  const handleStatusChange = (status: string) => {
    updateTask({ id: task.id, status });
  };

  const handleDelete = async () => {
    await deleteTask(task.id);
    onClose();
  };

  return (
    <Modal open title="Task Details" onClose={onClose}>
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="mb-4 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm font-medium text-white outline-none focus:border-violet-primary"
      />

      {/* Description */}
      <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-dim">
        Description
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={handleDescriptionBlur}
        placeholder="Add a description..."
        rows={3}
        className="mb-4 w-full resize-none rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
      />

      {/* Status */}
      <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-dim">
        Status
      </label>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleStatusChange(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs capitalize transition-colors",
              task.status === s
                ? "bg-violet-primary text-white"
                : "bg-white/5 text-sofi-text-muted hover:bg-white/10",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Agent Info (read-only for now) */}
      {task.agent_name && (
        <div className="mb-4 rounded-lg bg-white/[0.03] p-3">
          <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-dim">
            Agent
          </label>
          <p className="text-sm text-sofi-text">{task.agent_name}</p>
          {task.branch_name && (
            <p className="mt-1 font-mono text-xs text-sofi-text-muted">{task.branch_name}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-sofi-border pt-4">
        {task.agent_type && (
          <button
            type="button"
            onClick={onOpenTerminal}
            className="rounded-lg bg-sofi-green/15 px-3 py-1.5 text-xs font-medium text-sofi-green hover:bg-sofi-green/25"
          >
            Open Terminal
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-lg bg-sofi-red/10 px-3 py-1.5 text-xs font-medium text-sofi-red hover:bg-sofi-red/20"
        >
          Delete Task
        </button>
      </div>
    </Modal>
  );
}
