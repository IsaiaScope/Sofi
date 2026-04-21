import { useMutation } from "@tanstack/react-query";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { AgentAvailability } from "@/features/agents/types";
import { useCreateAgentSession } from "@/features/terminal/hooks/use-create-agent-session";
import { invoke, writeTerminal } from "@/lib/tauri";
import { buildAgentCommand, buildAgentPrompt } from "../lib/build-agent-prompt";
import type { Task } from "../types";
import { useCreateTask, useUpdateTask } from "./mutations";

export type LaunchPhase = "task" | "worktree" | "terminal" | "write" | "link";

export class LaunchAgentTaskError extends Error {
  constructor(
    public phase: LaunchPhase,
    public cause: unknown,
    public task: Task | null,
  ) {
    super(`Launch agent task failed in phase: ${phase}`);
    this.name = "LaunchAgentTaskError";
  }
}

interface LaunchAgentTaskInput {
  columnId: string;
  boardId: string;
  repoPath: string;
  title: string;
  description: string;
  agent_type: string;
  agents: AgentAvailability[];
}

interface LaunchAgentTaskResult {
  task: Task;
  sessionId: string;
  worktreePath: string;
  branchName: string;
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8);
}

// Returns a phase-runner bound to a specific task context. The first phase
// (which creates the task) runs with `task = null`; once a task exists, rebind
// so subsequent phases don't have to keep passing it in.
function bindPhaseRunner(task: Task | null) {
  return async <T>(phase: LaunchPhase, fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      throw new LaunchAgentTaskError(phase, err, task);
    }
  };
}

export function useLaunchAgentTask() {
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const createAgentSession = useCreateAgentSession();

  return useMutation({
    mutationFn: async (input: LaunchAgentTaskInput): Promise<LaunchAgentTaskResult> => {
      const { columnId, boardId, repoPath, title, description, agent_type, agents } = input;

      const task = await bindPhaseRunner(null)("task", () =>
        createTaskMutation.mutateAsync({ columnId, boardId, title, description, agent_type }),
      );

      const runPhase = bindPhaseRunner(task);
      const branchName = `sofi/task/${shortId(task.id)}`;

      const worktreePath = await runPhase("worktree", async () => {
        const base = await appDataDir();
        const path = await join(base, "worktrees", task.id);
        await invoke("create_worktree", { repoPath, branchName, worktreePath: path });
        return path;
      });

      const sessionId = await runPhase("terminal", () =>
        createAgentSession({
          cwd: worktreePath,
          isAgent: true,
          agentType: agent_type,
          taskTitle: title,
        }),
      );

      await runPhase("write", async () => {
        const agentConfig = agents.find((a) => a.config.agent_type === agent_type);
        if (!agentConfig) throw new Error(`Unknown agent: ${agent_type}`);
        const prompt = buildAgentPrompt({ title, description, branch_name: branchName });
        const command = `${buildAgentCommand(agentConfig.config.command, prompt)}\n`;
        await writeTerminal(sessionId, command);
      });

      await runPhase("link", () =>
        updateTaskMutation.mutateAsync({
          boardId,
          id: task.id,
          branch_name: branchName,
          worktree_path: worktreePath,
          terminal_session_id: sessionId,
        }),
      );

      return { task, sessionId, worktreePath, branchName };
    },
  });
}
