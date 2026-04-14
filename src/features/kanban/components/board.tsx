import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { useKanbanStore } from "../store/kanban-store";
import type { Task } from "../types";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { TaskDetailModal } from "./task-detail-modal";

interface BoardProps {
  userId: string;
  onSwitchToTerminal?: () => void;
}

export function Board({ userId, onSwitchToTerminal }: BoardProps) {
  const { columns, tasks, activeBoard, boards, loadBoards, createBoard, moveTask, isLoading } =
    useKanbanStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    loadBoards(userId);
  }, [userId, loadBoards]);

  const currentTask = selectedTask ? (tasks.find((t) => t.id === selectedTask.id) ?? null) : null;

  const draggedTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Could do optimistic column move here for visual feedback
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target column: "over" could be a column ID or a task ID
    let targetColumnId: string;
    const overTask = tasks.find((t) => t.id === String(over.id));

    if (overTask) {
      targetColumnId = overTask.column_id;
    } else {
      // Dropped on a column directly
      targetColumnId = String(over.id);
    }

    if (task.column_id === targetColumnId && !overTask) return;

    // Calculate sort order
    const columnTasks = tasks
      .filter((t) => t.column_id === targetColumnId && t.id !== taskId)
      .sort((a, b) => a.sort_order - b.sort_order);

    let newOrder: number;
    if (overTask) {
      const overIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      newOrder = overIndex >= 0 ? overIndex : columnTasks.length;
    } else {
      newOrder = columnTasks.length;
    }

    moveTask(taskId, targetColumnId, newOrder);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sofi-text-muted">Loading...</div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sofi-text-muted">No boards yet</p>
        <button
          type="button"
          onClick={() => createBoard(userId, "My Project", "My first Sofi board")}
          className="rounded-lg bg-violet-primary px-4 py-2 text-sm font-semibold text-white hover:bg-violet-hover"
        >
          Create Your First Board
        </button>
      </div>
    );
  }

  if (!activeBoard) return null;

  const boardColumns = columns.filter((c) => c.board_id === activeBoard.id);

  return (
    <div className="flex h-full flex-col p-3">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-x-visible">
          {boardColumns.map((column) => (
            <Column
              key={column.id}
              column={column}
              boardId={activeBoard.id}
              tasks={tasks
                .filter((t) => t.column_id === column.id)
                .sort((a, b) => a.sort_order - b.sort_order)}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          ))}
        </div>

        <DragOverlay>
          {draggedTask ? <TaskCard task={draggedTask} onClick={() => {}} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailModal
        task={currentTask}
        onClose={() => setSelectedTask(null)}
        onOpenTerminal={() => {
          setSelectedTask(null);
          onSwitchToTerminal?.();
        }}
      />
    </div>
  );
}
