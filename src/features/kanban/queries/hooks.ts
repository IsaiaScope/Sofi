import { useQuery } from "@tanstack/react-query";
import { boardsQueryOptions, columnsQueryOptions, tasksQueryOptions } from "./options";

export function useBoards(options?: { enabled?: boolean }) {
  return useQuery({ ...boardsQueryOptions(), ...options });
}

export function useColumns(boardId: string) {
  return useQuery(columnsQueryOptions(boardId));
}

export function useTasks(boardId: string) {
  return useQuery(tasksQueryOptions(boardId));
}
