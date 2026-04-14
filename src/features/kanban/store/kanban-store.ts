import { create } from "zustand";
import type { Board, Column, Task } from "../types";

interface KanbanState {
  boards: Board[];
  activeBoard: Board | null;
  columns: Column[];
  tasks: Task[];
  setActiveBoard: (board: Board) => void;
  addTask: (task: Task) => void;
  moveTask: (taskId: string, targetColumnId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  removeTask: (taskId: string) => void;
}

// Demo data for initial development
const DEMO_BOARD: Board = {
  id: "demo-board",
  name: "My Project",
  description: "Demo board for development",
};

const DEMO_COLUMNS: Column[] = [
  { id: "col-backlog", boardId: "demo-board", name: "Backlog", color: "#64748b", sortOrder: 0, isDoneColumn: false },
  { id: "col-progress", boardId: "demo-board", name: "In Progress", color: "#7c3aed", sortOrder: 1, isDoneColumn: false },
  { id: "col-review", boardId: "demo-board", name: "Review", color: "#f97316", sortOrder: 2, isDoneColumn: false },
  { id: "col-done", boardId: "demo-board", name: "Done", color: "#10b981", sortOrder: 3, isDoneColumn: true },
];

const DEMO_TASKS: Task[] = [
  { id: "task-1", columnId: "col-backlog", boardId: "demo-board", title: "Add auth flow", sortOrder: 0, status: "pending" },
  { id: "task-2", columnId: "col-backlog", boardId: "demo-board", title: "Fix nav bug", sortOrder: 1, status: "pending" },
  { id: "task-3", columnId: "col-progress", boardId: "demo-board", title: "Refactor API routes", sortOrder: 0, status: "running", agentType: "claude-code", agentName: "Claude Code", branchName: "feat/refactor-api" },
  { id: "task-4", columnId: "col-progress", boardId: "demo-board", title: "Write unit tests", sortOrder: 1, status: "running", agentType: "codex", agentName: "Codex", branchName: "feat/unit-tests" },
  { id: "task-5", columnId: "col-review", boardId: "demo-board", title: "Add logging middleware", sortOrder: 0, status: "review", agentType: "claude-code", agentName: "Claude Code", branchName: "feat/logging" },
  { id: "task-6", columnId: "col-done", boardId: "demo-board", title: "Setup CI pipeline", sortOrder: 0, status: "done", prUrl: "https://github.com/example/pr/42" },
];

export const useKanbanStore = create<KanbanState>((set) => ({
  boards: [DEMO_BOARD],
  activeBoard: DEMO_BOARD,
  columns: DEMO_COLUMNS,
  tasks: DEMO_TASKS,

  setActiveBoard: (board) => set({ activeBoard: board }),

  addTask: (task) =>
    set((state) => ({ tasks: [...state.tasks, task] })),

  moveTask: (taskId, targetColumnId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, columnId: targetColumnId } : t,
      ),
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t,
      ),
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),
}));
