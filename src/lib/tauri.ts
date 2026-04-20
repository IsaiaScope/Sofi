import { type InvokeArgs, invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import { toAppError } from "./errors";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function invoke<T>(cmd: string, args?: InvokeArgs): Promise<T> {
  if (!isTauri) {
    console.warn(`[Sofi] Tauri not available, mock for: ${cmd}`);
    return getMockResponse<T>(cmd);
  }
  try {
    return await tauriInvoke<T>(cmd, args);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function listen<T>(
  event: string,
  handler: (event: { payload: T }) => void,
): Promise<() => void> {
  if (!isTauri) {
    return () => {};
  }
  return tauriListen<T>(event, handler);
}

// Mocks for non-Tauri (Playwright) runtime. HTTP-backed commands are mocked via MSW, not here.
function getMockResponse<T>(cmd: string): T {
  const mocks: Record<string, unknown> = {
    auth_get_token: null,
    auth_store_token: undefined,
    auth_clear_token: undefined,
    oauth_start: { code: "mock-oauth-code", callback_url: "http://127.0.0.1:53682" },
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
    git_status: [],
    git_diff: [],
    git_branches: [],
    git_log: [],
    set_window_zoom: 1,
  };

  if (cmd in mocks) {
    return mocks[cmd] as T;
  }
  return {} as T;
}
