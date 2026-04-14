use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct ShellInfo {
    pub name: String,
    pub path: String,
}

pub fn detect_shells() -> Vec<ShellInfo> {
    let candidates = if cfg!(target_os = "windows") {
        vec![
            ("PowerShell", "powershell.exe"),
            ("CMD", "cmd.exe"),
            ("Git Bash", "C:\\Program Files\\Git\\bin\\bash.exe"),
            ("WSL", "wsl.exe"),
        ]
    } else {
        vec![
            ("Zsh", "/bin/zsh"),
            ("Bash", "/bin/bash"),
            ("Fish", "/usr/local/bin/fish"),
            ("Fish (Homebrew)", "/opt/homebrew/bin/fish"),
            ("Nushell", "/usr/local/bin/nu"),
            ("Nushell (Homebrew)", "/opt/homebrew/bin/nu"),
        ]
    };

    candidates
        .into_iter()
        .filter(|(_, path)| Path::new(path).exists())
        .map(|(name, path)| ShellInfo {
            name: name.to_string(),
            path: path.to_string(),
        })
        .collect()
}

pub fn default_shell() -> String {
    if cfg!(target_os = "windows") {
        "powershell.exe".to_string()
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    }
}
