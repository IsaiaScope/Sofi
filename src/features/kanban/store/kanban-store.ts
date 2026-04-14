import { create } from "zustand";
import { invoke } from "@/lib/tauri";
import type { Board, Column, Task, UpdateTaskInput } from "../types";

interface KanbanState {
  boards: Board[];
  activeBoard: Board | null;
  columns: Column[];
  tasks: Task[];
  isLoading: boolean;
  setActiveBoard: (board: Board) => void;
  loadBoards: (userId: string) => Promise<void>;
  createBoard: (
    userId: string,
    name: string,
    description?: string,
    repoPath?: string,
  ) => Promise<void>;
  loadBoardData: (boardId: string) => Promise<void>;
  addTask: (
    columnId: string,
    boardId: string,
    title: string,
    description?: string,
  ) => Promise<void>;
  moveTask: (taskId: string, targetColumnId: string, sortOrder: number) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  boards: [],
  activeBoard: null,
  columns: [],
  tasks: [],
  isLoading: false,

  setActiveBoard: (board) => {
    set({ activeBoard: board });
    get().loadBoardData(board.id);
  },

  loadBoards: async (userId) => {
    try {
      const boards = await invoke<Board[]>("list_boards", { userId });
      set({ boards });
      if (boards.length > 0 && !get().activeBoard) {
        get().setActiveBoard(boards[0]);
      }
    } catch (err) {
      console.error("Failed to load boards:", err);
    }
  },

  createBoard: async (userId, name, description, repoPath) => {
    try {
      const board = await invoke<Board>("create_board", {
        userId,
        input: { name, description, repo_path: repoPath },
      });
      set((state) => ({ boards: [...state.boards, board] }));
      get().setActiveBoard(board);
    } catch (err) {
      console.error("Failed to create board:", err);
    }
  },

  loadBoardData: async (boardId) => {
    set({ isLoading: true });
    try {
      const [columns, tasks] = await Promise.all([
        invoke<Column[]>("list_columns", { boardId }),
        invoke<Task[]>("list_tasks", { boardId }),
      ]);
      set({ columns, tasks, isLoading: false });
    } catch (err) {
      console.error("Failed to load board data:", err);
      set({ isLoading: false });
    }
  },

  addTask: async (columnId, boardId, title, description) => {
    try {
      const task = await invoke<Task>("create_task", {
        input: { column_id: columnId, board_id: boardId, title, description },
      });
      set((state) => ({ tasks: [...state.tasks, task] }));
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  },

  moveTask: async (taskId, targetColumnId, sortOrder) => {
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, column_id: targetColumnId, sort_order: sortOrder } : t,
      ),
    }));
    try {
      await invoke<Task>("move_task", {
        input: { task_id: taskId, target_column_id: targetColumnId, sort_order: sortOrder },
      });
    } catch (err) {
      console.error("Failed to move task:", err);
      // Reload to fix state
      const board = get().activeBoard;
      if (board) get().loadBoardData(board.id);
    }
  },

  updateTask: async (input) => {
    try {
      const updated = await invoke<Task>("update_task", { input });
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t)),
      }));
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  },

  deleteTask: async (taskId) => {
    const prevTasks = get().tasks;
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
    try {
      await invoke("delete_task", { taskId });
    } catch (err) {
      console.error("Failed to delete task:", err);
      set({ tasks: prevTasks }); // Rollback on failure
    }
  },
}));
