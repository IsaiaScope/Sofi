use sqlx::PgPool;
use uuid::Uuid;
use crate::models::user::UserSettings;

pub async fn get_user_settings(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<UserSettings, sqlx::Error> {
    sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM user_settings WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn update_user_settings(
    pool: &PgPool,
    user_id: Uuid,
    theme: Option<&str>,
    default_agent_type: Option<&str>,
    default_shell: Option<&str>,
    font_size: Option<i32>,
    font_family: Option<&str>,
) -> Result<UserSettings, sqlx::Error> {
    sqlx::query_as::<_, UserSettings>(
        "UPDATE user_settings SET
            theme = COALESCE($2, theme),
            default_agent_type = COALESCE($3, default_agent_type),
            default_shell = COALESCE($4, default_shell),
            font_size = COALESCE($5, font_size),
            font_family = COALESCE($6, font_family),
            updated_at = now()
         WHERE user_id = $1
         RETURNING *",
    )
    .bind(user_id)
    .bind(theme)
    .bind(default_agent_type)
    .bind(default_shell)
    .bind(font_size)
    .bind(font_family)
    .fetch_one(pool)
    .await
}
