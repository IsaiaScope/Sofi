import { useEffect } from "react";
import { useKanbanStore } from "../store/kanban-store";
import type { Task } from "../types";
import { Column } from "./column";

interface BoardProps {
  userId: string;
  onClickTerminal?: (task: Task) => void;
}

export function Board({ userId, onClickTerminal }: BoardProps) {
  const { columns, tasks, activeBoard, boards, loadBoards, createBoard, isLoading } =
    useKanbanStore();

  useEffect(() => {
    loadBoards(userId);
  }, [userId, loadBoards]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sofi-text-muted">
        Loading...
      </div>
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
      <div className="flex flex-1 gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-x-visible">
        {boardColumns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasks
              .filter((t) => t.column_id === column.id)
              .sort((a, b) => a.sort_order - b.sort_order)}
            onClickTerminal={onClickTerminal}
          />
        ))}
      </div>
    </div>
  );
}
