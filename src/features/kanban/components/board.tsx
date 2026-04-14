import { useKanbanStore } from "../store/kanban-store";
import type { Task } from "../types";
import { Column } from "./column";

interface BoardProps {
  onClickTerminal?: (task: Task) => void;
}

export function Board({ onClickTerminal }: BoardProps) {
  const { columns, tasks, activeBoard } = useKanbanStore();

  if (!activeBoard) {
    return (
      <div className="flex h-full items-center justify-center text-sofi-text-muted">
        No board selected
      </div>
    );
  }

  const boardColumns = columns.filter((c) => c.boardId === activeBoard.id);

  return (
    <div className="flex h-full flex-col p-3">
      {/* Board columns — horizontal scroll on small, grid on large */}
      <div className="flex flex-1 gap-3 overflow-x-auto lg:grid lg:grid-cols-4 lg:overflow-x-visible">
        {boardColumns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasks
              .filter((t) => t.columnId === column.id)
              .sort((a, b) => a.sortOrder - b.sortOrder)}
            onClickTerminal={onClickTerminal}
          />
        ))}
      </div>
    </div>
  );
}
