export interface AgentConfig {
  agent_type: string;
  display_name: string;
  command: string;
}

export interface AgentAvailability {
  config: AgentConfig;
  available: boolean;
}
