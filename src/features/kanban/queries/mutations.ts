import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Board, Task, UpdateTaskInput } from "../types";
import { kanbanKeys } from "./keys";
import { mapTask, type RawTask } from "./options";

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
      repoPath,
    }: {
      name: string;
      description?: string;
      repoPath?: string;
    }) =>
      apiClient.post<Board>("/api/v1/boards/", {
        name,
        description,
        repo_path: repoPath,
      }),
    onSuccess: (board) => {
      queryClient.setQueryData<Board[]>(kanbanKeys.boards(), (old) =>
        old ? [...old, board] : [board],
      );
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      columnId,
      boardId,
      title,
      description,
    }: {
      columnId: string;
      boardId: string;
      title: string;
      description?: string;
    }): Promise<Task> => {
      const raw = await apiClient.post<RawTask>("/api/v1/tasks/", {
        column: columnId,
        board: boardId,
        title,
        description,
      });
      return mapTask(raw);
    },
    onSuccess: (task, variables) => {
      queryClient.setQueryData<Task[]>(kanbanKeys.tasks(variables.boardId), (old) =>
        old ? [...old, task] : [task],
      );
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      targetColumnId,
      sortOrder,
    }: {
      taskId: string;
      targetColumnId: string;
      sortOrder: number;
      boardId: string;
    }): Promise<Task> => {
      const raw = await apiClient.patch<RawTask>(`/api/v1/tasks/${encodeURIComponent(taskId)}/`, {
        column: targetColumnId,
        sort_order: sortOrder,
      });
      return mapTask(raw);
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: kanbanKeys.tasks(variables.boardId),
      });

      const previousTasks = queryClient.getQueryData<Task[]>(kanbanKeys.tasks(variables.boardId));

      queryClient.setQueryData<Task[]>(kanbanKeys.tasks(variables.boardId), (old) =>
        old?.map((t) =>
          t.id === variables.taskId
            ? {
                ...t,
                column_id: variables.targetColumnId,
                sort_order: variables.sortOrder,
              }
            : t,
        ),
      );

      return { previousTasks };
    },
    onError: (_err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(kanbanKeys.tasks(variables.boardId), context.previousTasks);
      }
    },
    onSuccess: (task, variables) => {
      queryClient.setQueryData<Task[]>(kanbanKeys.tasks(variables.boardId), (old) =>
        old?.map((t) => (t.id === task.id ? task : t)),
      );
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      boardId: _boardId,
      id,
      column_id,
      ...rest
    }: UpdateTaskInput & { boardId: string }): Promise<Task> => {
      const body: Record<string, unknown> = { ...rest };
      if (column_id !== undefined) {
        body.column = column_id;
      }
      const raw = await apiClient.patch<RawTask>(`/api/v1/tasks/${encodeURIComponent(id)}/`, body);
      return mapTask(raw);
    },
    onSuccess: (task, variables) => {
      queryClient.setQueryData<Task[]>(kanbanKeys.tasks(variables.boardId), (old) =>
        old?.map((t) => (t.id === task.id ? task : t)),
      );
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; boardId: string }) =>
      apiClient.delete<void>(`/api/v1/tasks/${encodeURIComponent(taskId)}/`),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: kanbanKeys.tasks(variables.boardId),
      });

      const previousTasks = queryClient.getQueryData<Task[]>(kanbanKeys.tasks(variables.boardId));

      queryClient.setQueryData<Task[]>(kanbanKeys.tasks(variables.boardId), (old) =>
        old?.filter((t) => t.id !== variables.taskId),
      );

      return { previousTasks };
    },
    onError: (_err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(kanbanKeys.tasks(variables.boardId), context.previousTasks);
      }
    },
  });
}
