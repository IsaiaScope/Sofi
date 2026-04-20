//! Window commands — webview zoom control.
//!
//! Wraps `WebviewWindow::set_zoom()` so the frontend can scale the entire UI
//! (Cmd/Ctrl +/-/0) without needing the `core:webview:allow-set-webview-zoom`
//! capability. Zoom is clamped server-side to [MIN_ZOOM, MAX_ZOOM] so a bad
//! caller can't wedge the UI into an unusable scale.

use tauri::{Manager, Runtime};

use crate::error::AppError;

const MIN_ZOOM: f64 = 0.5;
const MAX_ZOOM: f64 = 2.0;
const MAIN_WINDOW_LABEL: &str = "main";

#[tauri::command]
pub fn set_window_zoom<R: Runtime>(app: tauri::AppHandle<R>, zoom: f64) -> Result<f64, AppError> {
    let clamped = zoom.clamp(MIN_ZOOM, MAX_ZOOM);
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| AppError::Internal("main webview window not found".into()))?;
    window
        .set_zoom(clamped)
        .map_err(|e| AppError::Internal(format!("set_zoom failed: {e}")))?;
    Ok(clamped)
}
