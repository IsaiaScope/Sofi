export interface Board {
  id: string;
  name: string;
  description?: string;
  repo_path?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  color?: string;
  sort_order: number;
  is_done_column: boolean;
}

export interface Task {
  id: string;
  column_id: string;
  board_id: string;
  title: string;
  description?: string;
  sort_order: number;
  agent_type?: string;
  agent_name?: string;
  terminal_session_id?: string;
  branch_name?: string;
  worktree_path?: string;
  status: string;
  pr_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateTaskInput {
  id: string;
  column_id?: string;
  title?: string;
  description?: string;
  sort_order?: number;
  status?: string;
  agent_type?: string;
  agent_name?: string;
  agent_session_id?: string;
  terminal_session_id?: string;
  branch_name?: string;
  worktree_path?: string;
}
