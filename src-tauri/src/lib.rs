mod commands;
pub mod error;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_os::init())
        .invoke_handler(tauri::generate_handler![
            // Auth (OS keychain + OAuth loopback — user identity lives in Django)
            commands::auth::auth_store_token,
            commands::auth::auth_get_token,
            commands::auth::auth_clear_token,
            commands::auth::oauth_start,
            // Window (webview zoom control)
            commands::window::set_window_zoom,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
