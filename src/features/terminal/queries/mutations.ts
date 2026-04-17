import { useMutation } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";

export function useCreateTerminal() {
  return useMutation({
    mutationFn: (args: {
      sessionId: string;
      shell: string;
      cwd?: string;
      cols?: number | null;
      rows?: number | null;
    }) => invoke<string>("create_terminal", args),
  });
}

export function useKillTerminal() {
  return useMutation({
    mutationFn: (args: { sessionId: string }) =>
      invoke("kill_terminal", { sessionId: args.sessionId }),
  });
}
