import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDefaultShell } from "../queries/hooks";
import { useCreateTerminal } from "../queries/mutations";
import { useTerminalUIStore } from "../store/terminal-ui-store";

export interface CreateAgentSessionOpts {
  label?: string;
  shell?: string;
  cwd?: string;
  isAgent?: boolean;
  agentType?: string;
  taskTitle?: string;
}

export function useCreateAgentSession() {
  const { t } = useTranslation("common");
  const defaultShellQuery = useDefaultShell();
  const createTerminalMutation = useCreateTerminal();
  const { addSession } = useTerminalUIStore();

  const defaultShell = defaultShellQuery.data ?? "/bin/zsh";

  return useCallback(
    async (opts?: CreateAgentSessionOpts): Promise<string> => {
      const sessionId = crypto.randomUUID();
      const shell = opts?.shell ?? defaultShell;
      const cwd = opts?.cwd ?? undefined;
      const label =
        opts?.label ??
        (opts?.taskTitle
          ? `${opts.taskTitle} — ${opts.agentType ?? t("terminal.agentFallback")}`
          : t("terminal.shellLabel", { shell: shell.split("/").pop() ?? "" }));

      await createTerminalMutation.mutateAsync({ sessionId, shell, cwd, cols: null, rows: null });

      addSession({
        id: sessionId,
        label,
        shell,
        cwd: cwd ?? "~",
        isAgentSession: opts?.isAgent ?? false,
        agentType: opts?.agentType,
        taskTitle: opts?.taskTitle,
      });

      return sessionId;
    },
    [defaultShell, createTerminalMutation, addSession, t],
  );
}
