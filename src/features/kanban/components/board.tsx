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
import { useEffect, useMemo, useState } from "react";
import { useCreateBoard, useMoveTask } from "../queries/mutations";
import { boardsQueryOptions, columnsQueryOptions, tasksQueryOptions } from "../queries/options";
import { useKanbanUIStore } from "../store/kanban-ui-store";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { TaskDetailModal } from "./task-detail-modal";

interface BoardProps {
  onSwitchToTerminal?: () => void;
}

export function Board({ onSwitchToTerminal }: BoardProps) {
  const { activeBoard, setActiveBoard } = useKanbanUIStore();
  const boardsQuery = useQuery(boardsQueryOptions());
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

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (boards.length > 0 && !activeBoard) {
      setActiveBoard(boards[0]);
    }
  }, [boards, activeBoard, setActiveBoard]);

  const tasksByColumn = useMemo(() => {
    const grouped = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const list = grouped.get(task.column_id);
      if (list) list.push(task);
      else grouped.set(task.column_id, [task]);
    }
    for (const list of grouped.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return grouped;
  }, [tasks]);

  const selectedTask = selectedTaskId ? (tasks.find((t) => t.id === selectedTaskId) ?? null) : null;
  const draggedTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const overTask = tasks.find((t) => t.id === String(over.id));
    const targetColumnId = overTask ? overTask.column_id : String(over.id);

    if (task.column_id === targetColumnId && !overTask) return;

    const columnTasks = (tasksByColumn.get(targetColumnId) ?? []).filter((t) => t.id !== taskId);

    let newOrder: number;
    if (overTask) {
      const overIndex = columnTasks.findIndex((t) => t.id === overTask.id);
      newOrder = overIndex >= 0 ? overIndex : columnTasks.length;
    } else {
      newOrder = columnTasks.length;
    }

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
              name: "My Project",
              description: "My first Sofi board",
            })
          }
          className="rounded-lg bg-violet-primary px-4 py-2 text-base font-semibold text-white hover:bg-violet-hover"
        >
          Create Your First Board
        </button>
      </div>
    );
  }

  if (!activeBoard) return null;

  return (
    <div className="flex h-full flex-col p-3">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-x-visible">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              boardId={activeBoard.id}
              tasks={tasksByColumn.get(column.id) ?? []}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {draggedTask ? <TaskCard task={draggedTask} onClick={() => {}} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailModal
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onOpenTerminal={() => {
          setSelectedTaskId(null);
          onSwitchToTerminal?.();
        }}
      />
    </div>
  );
}
