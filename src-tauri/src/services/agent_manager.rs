use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub agent_type: String,
    pub display_name: String,
    pub command: String,
}

/// Returns the CLI command for a given agent type
pub fn get_agent_command(agent_type: &str) -> Option<AgentConfig> {
    match agent_type {
        "claude-code" => Some(AgentConfig {
            agent_type: "claude-code".to_string(),
            display_name: "Claude Code".to_string(),
            command: "claude".to_string(),
        }),
        "codex" => Some(AgentConfig {
            agent_type: "codex".to_string(),
            display_name: "Codex".to_string(),
            command: "codex".to_string(),
        }),
        _ => None,
    }
}

/// Check if an agent CLI is available on the system (cross-platform)
pub fn is_agent_available(agent_type: &str) -> bool {
    let config = match get_agent_command(agent_type) {
        Some(c) => c,
        None => return false,
    };

    let (cmd, args) = if cfg!(target_os = "windows") {
        ("where", vec![config.command.clone()])
    } else {
        ("which", vec![config.command.clone()])
    };

    std::process::Command::new(cmd)
        .args(&args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// List all supported agents and their availability
pub fn list_available_agents() -> Vec<(AgentConfig, bool)> {
    let types = ["claude-code", "codex"];
    types
        .iter()
        .filter_map(|t| {
            get_agent_command(t).map(|config| {
                let available = is_agent_available(t);
                (config, available)
            })
        })
        .collect()
}
