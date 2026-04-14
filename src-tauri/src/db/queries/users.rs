use sqlx::SqlitePool;
use crate::models::user::{User, Session, UserSettings};

pub async fn create_user(
    pool: &SqlitePool,
    id: &str,
    username: &str,
    email: &str,
    password_hash: &str,
    display_name: Option<&str>,
) -> Result<User, sqlx::Error> {
    sqlx::query_as::<_, User>(
        "INSERT INTO users (id, username, email, password_hash, display_name)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *",
    )
    .bind(id)
    .bind(username)
    .bind(email)
    .bind(password_hash)
    .bind(display_name)
    .fetch_one(pool)
    .await
}

pub async fn find_user_by_username(
    pool: &SqlitePool,
    username: &str,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = ?")
        .bind(username)
        .fetch_optional(pool)
        .await
}

pub async fn find_user_by_id(
    pool: &SqlitePool,
    id: &str,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn create_session(
    pool: &SqlitePool,
    id: &str,
    user_id: &str,
    token: &str,
    expires_at: &str,
) -> Result<Session, sqlx::Error> {
    sqlx::query_as::<_, Session>(
        "INSERT INTO sessions (id, user_id, token, expires_at)
         VALUES (?, ?, ?, ?)
         RETURNING *",
    )
    .bind(id)
    .bind(user_id)
    .bind(token)
    .bind(expires_at)
    .fetch_one(pool)
    .await
}

pub async fn find_session_by_token(
    pool: &SqlitePool,
    token: &str,
) -> Result<Option<Session>, sqlx::Error> {
    sqlx::query_as::<_, Session>(
        "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')",
    )
    .bind(token)
    .fetch_optional(pool)
    .await
}

pub async fn delete_expired_sessions(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM sessions WHERE expires_at <= datetime('now')")
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn create_user_settings(
    pool: &SqlitePool,
    id: &str,
    user_id: &str,
) -> Result<UserSettings, sqlx::Error> {
    sqlx::query_as::<_, UserSettings>(
        "INSERT INTO user_settings (id, user_id) VALUES (?, ?) RETURNING *",
    )
    .bind(id)
    .bind(user_id)
    .fetch_one(pool)
    .await
}
