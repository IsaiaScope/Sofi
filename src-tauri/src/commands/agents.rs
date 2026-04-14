use crate::services::agent_manager::{self, AgentConfig};

#[derive(serde::Serialize)]
pub struct AgentAvailability {
    pub config: AgentConfig,
    pub available: bool,
}

#[tauri::command]
pub fn list_agents() -> Vec<AgentAvailability> {
    agent_manager::list_available_agents()
        .into_iter()
        .map(|(config, available)| AgentAvailability { config, available })
        .collect()
}

#[tauri::command]
pub fn check_agent_available(agent_type: String) -> bool {
    agent_manager::is_agent_available(&agent_type)
}
