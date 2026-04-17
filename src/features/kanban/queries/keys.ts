export const kanbanKeys = {
  all: () => ["kanban"] as const,
  boards: (userId: string) => [...kanbanKeys.all(), "boards", userId] as const,
  board: (boardId: string) => [...kanbanKeys.all(), "board", boardId] as const,
  columns: (boardId: string) => [...kanbanKeys.all(), "columns", boardId] as const,
  tasks: (boardId: string) => [...kanbanKeys.all(), "tasks", boardId] as const,
  task: (taskId: string) => [...kanbanKeys.all(), "task", taskId] as const,
} as const;
