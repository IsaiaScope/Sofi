use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::services::pty_manager::PtyManager;
use crate::services::shell_detector::{self, ShellInfo};

#[tauri::command]
pub fn list_shells() -> Vec<ShellInfo> {
    shell_detector::detect_shells()
}

#[tauri::command]
pub fn get_default_shell() -> String {
    shell_detector::default_shell()
}

#[tauri::command]
pub fn create_terminal(
    pty: State<'_, PtyManager>,
    app: AppHandle,
    session_id: String,
    shell: Option<String>,
    cwd: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, AppError> {
    let shell = shell.unwrap_or_else(shell_detector::default_shell);
    let cwd = cwd.unwrap_or_else(|| {
        std::env::var("HOME").unwrap_or_else(|_| "/".to_string())
    });
    let cols = cols.unwrap_or(80);
    let rows = rows.unwrap_or(24);

    pty.create_session(&session_id, &shell, &cwd, cols, rows, app)
        .map_err(|e| AppError::Internal(e))?;

    Ok(session_id)
}

#[tauri::command]
pub fn write_terminal(
    pty: State<'_, PtyManager>,
    session_id: String,
    data: Vec<u8>,
) -> Result<(), AppError> {
    pty.write_to_session(&session_id, &data)
        .map_err(|e| AppError::Internal(e))
}

#[tauri::command]
pub fn resize_terminal(
    pty: State<'_, PtyManager>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), AppError> {
    pty.resize_session(&session_id, cols, rows)
        .map_err(|e| AppError::Internal(e))
}

#[tauri::command]
pub fn kill_terminal(
    pty: State<'_, PtyManager>,
    session_id: String,
) -> Result<(), AppError> {
    pty.kill_session(&session_id)
        .map_err(|e| AppError::Internal(e))
}

#[tauri::command]
pub fn list_terminal_sessions(pty: State<'_, PtyManager>) -> Vec<String> {
    pty.list_sessions()
}
