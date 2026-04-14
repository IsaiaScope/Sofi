export interface Board {
  id: string;
  name: string;
  description?: string;
  repoPath?: string;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  color?: string;
  sortOrder: number;
  isDoneColumn: boolean;
}

export interface Task {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description?: string;
  sortOrder: number;
  agentType?: string;
  agentName?: string;
  terminalSessionId?: string;
  branchName?: string;
  status: "pending" | "running" | "review" | "done" | "failed";
  prUrl?: string;
}
