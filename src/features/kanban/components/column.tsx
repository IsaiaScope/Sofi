import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTask } from "../queries/mutations";
import { type CreateTaskFormData, createTaskSchema } from "../schemas";
import type { Column as ColumnType, Task } from "../types";
import { SortableTaskCard } from "./sortable-task-card";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  boardId: string;
  onTaskClick: (task: Task) => void;
}

export function Column({ column, tasks, boardId, onTaskClick }: ColumnProps) {
  const { t } = useTranslation("kanban");
  const [isAdding, setIsAdding] = useState(false);
  const createTaskMutation = useCreateTask();

  const taskForm = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { title: "" },
  });

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleCancel = () => {
    taskForm.reset();
    setIsAdding(false);
  };

  const handleTaskSubmit = async (data: CreateTaskFormData) => {
    await createTaskMutation.mutateAsync({ columnId: column.id, boardId, title: data.title });
    taskForm.reset();
    setIsAdding(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[260px] flex-col rounded-lg p-2 transition-colors lg:min-w-0 ${
        isOver ? "bg-violet-muted" : "bg-white/[0.02]"
      }`}
    >
      {/* Column Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: column.color ? `${column.color}cc` : undefined }}
          >
            {column.name}
          </span>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/5 px-1 text-[10px] text-sofi-text-dim">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Sortable Task Cards */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>

      {/* Add Task */}
      {isAdding ? (
        <div className="mt-2">
          <form onSubmit={taskForm.handleSubmit(handleTaskSubmit)}>
            <Input
              {...taskForm.register("title")}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCancel();
              }}
              onBlur={taskForm.handleSubmit(handleTaskSubmit)}
              placeholder={t("column.taskTitlePlaceholder")}
              autoFocus
            />
          </form>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="mt-2 w-full">
          {t("column.addTask")}
        </Button>
      )}
    </div>
  );
}
