import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { useDeleteTask, useUpdateTask } from "../queries/mutations";
import type { Task } from "../types";

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onOpenTerminal?: () => void;
}

const STATUS_OPTIONS = ["pending", "running", "review", "done", "failed"];

export function TaskDetailModal({ task, onClose, onOpenTerminal }: TaskDetailModalProps) {
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const form = useForm({
    defaultValues: { title: task?.title ?? "", description: task?.description ?? "" },
  });

  useEffect(() => {
    if (task) {
      form.reset({ title: task.title, description: task.description ?? "" });
    }
  }, [task, form]);

  const handleStatusChange = (status: string) => {
    if (!task) return;
    updateTaskMutation.mutate({ id: task.id, status, boardId: task.board_id });
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTaskMutation.mutateAsync({ taskId: task.id, boardId: task.board_id });
    onClose();
  };

  return (
    <Dialog open={!!task} onClose={onClose} title="Task Details">
      {task && (
        <>
          {/* Title */}
          <Input
            {...form.register("title")}
            onBlur={() => {
              const val = form.getValues("title").trim();
              if (val && val !== task.title) {
                updateTaskMutation.mutate({ id: task.id, title: val, boardId: task.board_id });
              }
            }}
            className="mb-4 font-medium text-white"
          />

          {/* Description */}
          <FieldLabel className="mb-1">Description</FieldLabel>
          <Textarea
            {...form.register("description")}
            onBlur={() => {
              const val = form.getValues("description");
              if (val !== (task.description ?? "")) {
                updateTaskMutation.mutate({
                  id: task.id,
                  description: val,
                  boardId: task.board_id,
                });
              }
            }}
            placeholder="Add a description..."
            rows={3}
            className="mb-4"
          />

          {/* Status */}
          <FieldLabel className="mb-1">Status</FieldLabel>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                variant={task.status === s ? "primary" : "ghost"}
                size="sm"
                onClick={() => handleStatusChange(s)}
                className={cn("rounded-full capitalize", task.status !== s && "bg-white/5")}
              >
                {s}
              </Button>
            ))}
          </div>

          {/* Agent Info (read-only for now) */}
          {task.agent_name && (
            <div className="mb-4 rounded-lg bg-white/[0.03] p-3">
              <FieldLabel className="mb-1">Agent</FieldLabel>
              <p className="text-base text-sofi-text">{task.agent_name}</p>
              {task.branch_name && (
                <p className="mt-1 font-mono text-base text-sofi-text-muted">{task.branch_name}</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-sofi-border pt-4">
            {task.agent_type && (
              <Button variant="success" size="sm" onClick={onOpenTerminal}>
                Open Terminal
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Delete Task
            </Button>
          </div>
        </>
      )}
    </Dialog>
  );
}
