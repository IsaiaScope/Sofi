use sqlx::PgPool;
use tauri::State;
use uuid::Uuid;

use crate::db::queries::settings;
use crate::error::AppError;
use crate::models::user::UserSettings;

#[derive(Debug, serde::Deserialize)]
pub struct UpdateUserSettingsInput {
    pub theme: Option<String>,
    pub default_agent_type: Option<String>,
    pub default_shell: Option<String>,
    pub font_size: Option<i32>,
    pub font_family: Option<String>,
}

#[tauri::command]
pub async fn get_user_settings(
    pool: State<'_, PgPool>,
    user_id: Uuid,
) -> Result<UserSettings, AppError> {
    settings::get_user_settings(&pool, user_id)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn update_user_settings(
    pool: State<'_, PgPool>,
    user_id: Uuid,
    input: UpdateUserSettingsInput,
) -> Result<UserSettings, AppError> {
    settings::update_user_settings(
        &pool,
        user_id,
        input.theme.as_deref(),
        input.default_agent_type.as_deref(),
        input.default_shell.as_deref(),
        input.font_size,
        input.font_family.as_deref(),
    )
    .await
    .map_err(AppError::from)
}
