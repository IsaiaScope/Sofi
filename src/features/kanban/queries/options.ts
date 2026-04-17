import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { Board, Column, Task } from "../types";
import { kanbanKeys } from "./keys";

export function boardsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: kanbanKeys.boards(userId),
    queryFn: () => invoke<Board[]>("list_boards", { userId }),
  });
}

export function columnsQueryOptions(boardId: string) {
  return queryOptions({
    queryKey: kanbanKeys.columns(boardId),
    queryFn: () => invoke<Column[]>("list_columns", { boardId }),
  });
}

export function tasksQueryOptions(boardId: string) {
  return queryOptions({
    queryKey: kanbanKeys.tasks(boardId),
    queryFn: () => invoke<Task[]>("list_tasks", { boardId }),
  });
}
