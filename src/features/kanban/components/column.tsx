import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Column as ColumnType, Task } from "../types";
import { CreateTaskDialog } from "./create-task-dialog";
import { SortableTaskCard } from "./sortable-task-card";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  boardId: string;
  repoPath: string;
  onTaskClick: (task: Task) => void;
  onTaskLaunched?: () => void;
}

export function Column({
  column,
  tasks,
  boardId,
  repoPath,
  onTaskClick,
  onTaskLaunched,
}: ColumnProps) {
  const { t } = useTranslation("kanban");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[260px] flex-col rounded-lg p-2 transition-colors lg:min-w-0",
        isOver ? "bg-violet-muted" : "bg-white/[0.02]",
      )}
    >
      {/* Column Header */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="text-caption font-semibold uppercase tracking-wider"
            style={{ color: column.color ? `${column.color}cc` : undefined }}
          >
            {column.name}
          </span>
          <Badge tone="neutral" size="xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Sortable Task Cards */}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      </SortableContext>

      {/* Add Task */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsDialogOpen(true)}
        className="mt-2 w-full"
      >
        {t("column.addTask")}
      </Button>

      <CreateTaskDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        columnId={column.id}
        boardId={boardId}
        repoPath={repoPath}
        onLaunched={onTaskLaunched}
      />
    </div>
  );
}
