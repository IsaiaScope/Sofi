import type { Column as ColumnType, Task } from "../types";
import { TaskCard } from "./task-card";

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onClickTerminal?: (task: Task) => void;
}

export function Column({ column, tasks, onClickTerminal }: ColumnProps) {
  return (
    <div className="flex min-w-[260px] flex-col rounded-lg bg-white/[0.02] p-2 lg:min-w-0">
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

      {/* Task Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClickTerminal={onClickTerminal}
          />
        ))}
      </div>
    </div>
  );
}
