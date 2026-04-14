import { type InvokeArgs, invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Wraps Tauri's invoke to handle browser-only mode gracefully.
 * In browser mode (Playwright testing), returns mock data instead of crashing.
 */
export async function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  if (!isTauri) {
    console.warn(`[Sofi] Tauri not available, mock for: ${cmd}`);
    return getMockResponse<T>(cmd);
  }
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (err) {
    const msg = String(err);
    if (msg.includes("Authentication failed") || msg.includes("Session expired")) {
      // Force logout on auth errors — dynamic import to avoid circular dependency
      const { useAuthStore } = await import("@/features/auth/store/auth-store");
      useAuthStore.getState().logout();
    }
    throw err;
  }
}

/**
 * Wraps Tauri's listen. In browser mode, returns a no-op unlisten function.
 */
export async function listen<T>(
  event: string,
  handler: (event: { payload: T }) => void,
): Promise<() => void> {
  if (!isTauri) {
    return () => {};
  }
  return tauriListen<T>(event, handler);
}

// Mock responses for browser-only testing
function getMockResponse<T>(cmd: string): T {
  const mocks: Record<string, unknown> = {
    register: {
      user: {
        id: "mock-user-1",
        username: "demo",
        email: "demo@sofi.dev",
        display_name: "Demo User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      token: "mock-token-123",
    },
    login: {
      user: {
        id: "mock-user-1",
        username: "demo",
        email: "demo@sofi.dev",
        display_name: "Demo User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      token: "mock-token-123",
    },
    check_session: null, // Forces login screen
    list_boards: [
      {
        id: "mock-board-1",
        user_id: "mock-user-1",
        name: "My Project",
        sort_order: 0,
        repo_path: "/Volumes/Crucial-4T/repo/sofi",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    list_columns: [
      {
        id: "mock-col-1",
        board_id: "mock-board-1",
        name: "Backlog",
        color: "#64748b",
        sort_order: 0,
        is_done_column: false,
      },
      {
        id: "mock-col-2",
        board_id: "mock-board-1",
        name: "In Progress",
        color: "#7c3aed",
        sort_order: 1,
        is_done_column: false,
      },
      {
        id: "mock-col-3",
        board_id: "mock-board-1",
        name: "Review",
        color: "#f97316",
        sort_order: 2,
        is_done_column: false,
      },
      {
        id: "mock-col-4",
        board_id: "mock-board-1",
        name: "Done",
        color: "#10b981",
        sort_order: 3,
        is_done_column: true,
      },
    ],
    list_tasks: [
      {
        id: "mock-task-1",
        column_id: "mock-col-1",
        board_id: "mock-board-1",
        title: "Add auth flow",
        sort_order: 0,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "mock-task-2",
        column_id: "mock-col-2",
        board_id: "mock-board-1",
        title: "Refactor API routes",
        sort_order: 0,
        status: "running",
        agent_type: "claude-code",
        agent_name: "Claude Code",
        branch_name: "feat/refactor-api",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "mock-task-3",
        column_id: "mock-col-3",
        board_id: "mock-board-1",
        title: "Add logging",
        sort_order: 0,
        status: "review",
        agent_type: "claude-code",
        agent_name: "Claude Code",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    list_shells: [
      { name: "Zsh", path: "/bin/zsh" },
      { name: "Bash", path: "/bin/bash" },
    ],
    get_default_shell: "/bin/zsh",
    list_agents: [
      {
        config: { agent_type: "claude-code", display_name: "Claude Code", command: "claude" },
        available: true,
      },
      {
        config: { agent_type: "codex", display_name: "Codex", command: "codex" },
        available: false,
      },
    ],
    create_board: {
      id: `mock-board-${Date.now()}`,
      user_id: "mock-user-1",
      name: "New Board",
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    create_task: {
      id: `mock-task-${Date.now()}`,
      column_id: "mock-col-1",
      board_id: "mock-board-1",
      title: "Mock Task",
      sort_order: 0,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    git_status: [],
    git_diff: [],
    git_branches: [],
    git_log: [],
  };

  if (cmd in mocks) {
    return mocks[cmd] as T;
  }
  return {} as T;
}
