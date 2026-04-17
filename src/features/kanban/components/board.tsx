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
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useCreateBoard, useMoveTask } from "../queries/mutations";
import { boardsQueryOptions, columnsQueryOptions, tasksQueryOptions } from "../queries/options";
import { useKanbanUIStore } from "../store/kanban-ui-store";
import type { Task } from "../types";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { TaskDetailModal } from "./task-detail-modal";

interface BoardProps {
  userId: string;
  onSwitchToTerminal?: () => void;
}

export function Board({ userId, onSwitchToTerminal }: BoardProps) {
  const { activeBoard, setActiveBoard } = useKanbanUIStore();
  const boardsQuery = useQuery(boardsQueryOptions(userId));
  const columnsQuery = useQuery({
    ...columnsQueryOptions(activeBoard?.id ?? ""),
    enabled: !!activeBoard,
  });
  const tasksQuery = useQuery({
    ...tasksQueryOptions(activeBoard?.id ?? ""),
    enabled: !!activeBoard,
  });
  const createBoardMutation = useCreateBoard();
  const moveTaskMutation = useMoveTask();

  const boards = boardsQuery.data ?? [];
  const columns = columnsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const isLoading = boardsQuery.isPending || columnsQuery.isPending;

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (boards.length > 0 && !activeBoard) {
      setActiveBoard(boards[0]);
    }
  }, [boards, activeBoard, setActiveBoard]);

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

    // Skip if no actual change
    if (task.column_id === targetColumnId && task.sort_order === newOrder) return;
    if (!activeBoard) return;

    moveTaskMutation.mutate({
      taskId,
      targetColumnId,
      sortOrder: newOrder,
      boardId: activeBoard.id,
    });
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
          onClick={() =>
            createBoardMutation.mutate({
              userId,
              name: "My Project",
              description: "My first Sofi board",
            })
          }
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
