import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { Board, Task, UpdateTaskInput } from "../types";
import { kanbanKeys } from "./keys";

export function useCreateBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      name,
      description,
      repoPath,
    }: {
      userId: string;
      name: string;
      description?: string;
      repoPath?: string;
    }) =>
      invoke<Board>("create_board", {
        userId,
        input: { name, description, repo_path: repoPath },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.boards(variables.userId),
      });
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      columnId,
      boardId,
      title,
      description,
    }: {
      columnId: string;
      boardId: string;
      title: string;
      description?: string;
    }) =>
      invoke<Task>("create_task", {
        input: { column_id: columnId, board_id: boardId, title, description },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.tasks(variables.boardId),
      });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      targetColumnId,
      sortOrder,
    }: {
      taskId: string;
      targetColumnId: string;
      sortOrder: number;
      boardId: string;
    }) =>
      invoke<Task>("move_task", {
        input: {
          task_id: taskId,
          target_column_id: targetColumnId,
          sort_order: sortOrder,
        },
      }),
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
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.tasks(variables.boardId),
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ boardId: _boardId, ...input }: UpdateTaskInput & { boardId: string }) =>
      invoke<Task>("update_task", { input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.tasks(variables.boardId),
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; boardId: string }) =>
      invoke("delete_task", { taskId }),
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
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.tasks(variables.boardId),
      });
    },
  });
}
