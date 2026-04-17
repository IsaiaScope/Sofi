mod commands;
mod db;
mod error;
mod models;
mod services;

use db::pool::create_pool;
use services::pty_manager::PtyManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            // Database
            let pool = tauri::async_runtime::block_on(async {
                create_pool()
                    .await
                    .expect("Failed to create database pool")
            });
            _app.manage(pool);

            // PTY Manager
            _app.manage(PtyManager::new());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            commands::auth::register,
            commands::auth::login,
            commands::auth::check_session,
            // Kanban
            commands::kanban::create_board,
            commands::kanban::list_boards,
            commands::kanban::get_board,
            commands::kanban::list_columns,
            commands::kanban::create_task,
            commands::kanban::list_tasks,
            commands::kanban::move_task,
            commands::kanban::update_task,
            commands::kanban::delete_task,
            // Terminal
            commands::terminal::list_shells,
            commands::terminal::get_default_shell,
            commands::terminal::create_terminal,
            commands::terminal::write_terminal,
            commands::terminal::resize_terminal,
            commands::terminal::kill_terminal,
            commands::terminal::list_terminal_sessions,
            // Agents
            commands::agents::list_agents,
            commands::agents::check_agent_available,
            // Git
            commands::git::git_status,
            commands::git::git_diff,
            commands::git::git_branches,
            commands::git::git_log,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
