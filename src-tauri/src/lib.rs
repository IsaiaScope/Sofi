mod commands;
pub mod error;
mod services;

use services::pty_manager::PtyManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            app.manage(PtyManager::new());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth (OS keychain + OAuth loopback — user identity lives in Django)
            commands::auth::auth_store_token,
            commands::auth::auth_get_token,
            commands::auth::auth_clear_token,
            commands::auth::oauth_start,
            // Terminal (local PTY — not remote)
            commands::terminal::list_shells,
            commands::terminal::get_default_shell,
            commands::terminal::create_terminal,
            commands::terminal::write_terminal,
            commands::terminal::resize_terminal,
            commands::terminal::kill_terminal,
            commands::terminal::list_terminal_sessions,
            // Agents (local CLI detection)
            commands::agents::list_agents,
            commands::agents::check_agent_available,
            // Git (local git2-rs)
            commands::git::git_status,
            commands::git::git_diff,
            commands::git::git_branches,
            commands::git::git_log,
            // Window (webview zoom control)
            commands::window::set_window_zoom,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
