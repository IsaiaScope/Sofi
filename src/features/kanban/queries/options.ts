import { queryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Board, Column, Task } from "../types";
import { kanbanKeys } from "./keys";

interface RawColumn {
  id: string;
  board: string;
  name: string;
  color?: string;
  sort_order: number;
  is_done_column: boolean;
}

interface RawTask {
  id: string;
  column: string;
  board: string;
  title: string;
  description?: string;
  sort_order: number;
  agent_type?: string;
  agent_name?: string;
  agent_session_id?: string;
  terminal_session_id?: string;
  branch_name?: string;
  worktree_path?: string;
  status: string;
  pr_url?: string;
  created_at: string;
  updated_at: string;
}

function mapColumn(raw: RawColumn): Column {
  const { board, ...rest } = raw;
  return { ...rest, board_id: board };
}

function mapTask(raw: RawTask): Task {
  const { column, board, ...rest } = raw;
  return { ...rest, column_id: column, board_id: board };
}

export function boardsQueryOptions() {
  return queryOptions({
    queryKey: kanbanKeys.boards(),
    queryFn: () => apiClient.get<Board[]>("/api/v1/boards/"),
  });
}

export function columnsQueryOptions(boardId: string) {
  return queryOptions({
    queryKey: kanbanKeys.columns(boardId),
    queryFn: async () => {
      const raw = await apiClient.get<RawColumn[]>(
        `/api/v1/columns/?board=${encodeURIComponent(boardId)}`,
      );
      return raw.map(mapColumn);
    },
  });
}

export function tasksQueryOptions(boardId: string) {
  return queryOptions({
    queryKey: kanbanKeys.tasks(boardId),
    queryFn: async () => {
      const raw = await apiClient.get<RawTask[]>(
        `/api/v1/tasks/?board=${encodeURIComponent(boardId)}`,
      );
      return raw.map(mapTask);
    },
  });
}

export { mapColumn, mapTask, type RawColumn, type RawTask };
