import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useState } from "react";
import { useKanbanStore } from "../store/kanban-store";
import type { Column as ColumnType, Task } from "../types";
import { SortableTaskCard } from "./sortable-task-card";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  boardId: string;
  onTaskClick: (task: Task) => void;
}

export function Column({ column, tasks, boardId, onTaskClick }: ColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const { addTask } = useKanbanStore();

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleSubmit = async () => {
    const title = newTitle.trim();
    if (!title) {
      setIsAdding(false);
      return;
    }
    await addTask(column.id, boardId, title);
    setNewTitle("");
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
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewTitle("");
              }
            }}
            onBlur={handleSubmit}
            placeholder="Task title..."
            autoFocus
            className="w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="mt-2 w-full rounded-lg py-1.5 text-xs text-sofi-text-dim transition-colors hover:bg-white/5 hover:text-sofi-text"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
