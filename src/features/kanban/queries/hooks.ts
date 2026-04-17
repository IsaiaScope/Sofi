import { useQuery } from "@tanstack/react-query";
import { boardsQueryOptions, columnsQueryOptions, tasksQueryOptions } from "./options";

export function useBoards(userId: string) {
  return useQuery(boardsQueryOptions(userId));
}

export function useColumns(boardId: string) {
  return useQuery(columnsQueryOptions(boardId));
}

export function useTasks(boardId: string) {
  return useQuery(tasksQueryOptions(boardId));
}
