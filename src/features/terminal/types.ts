export interface TerminalSession {
  id: string;
  label: string;
  shell: string;
  cwd: string;
  isAgentSession: boolean;
  agentType?: string;
  taskTitle?: string;
}

export interface ShellInfo {
  name: string;
  path: string;
}

export interface TerminalOutputEvent {
  session_id: string;
  data: number[];
}

export interface TerminalExitEvent {
  session_id: string;
  exit_code: number | null;
}
