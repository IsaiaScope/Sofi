mod commands;
mod db;
mod error;
mod models;

use db::pool::create_pool;
use std::path::PathBuf;
use tauri::Manager;

fn get_db_path(app: &tauri::App) -> PathBuf {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
    app_dir.join("sofi.db")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = get_db_path(app);
            let db_url = format!("sqlite:{}", db_path.display());

            let pool = tauri::async_runtime::block_on(async {
                create_pool(&db_url)
                    .await
                    .expect("Failed to create database pool")
            });

            app.manage(pool);
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
