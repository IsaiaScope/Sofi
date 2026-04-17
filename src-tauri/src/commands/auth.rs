use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use sqlx::PgPool;
use tauri::State;
use uuid::Uuid;

use crate::db::queries::users;
use crate::error::AppError;
use crate::models::user::{AuthResponse, LoginInput, RegisterInput};

#[tauri::command]
pub async fn register(
    pool: State<'_, PgPool>,
    input: RegisterInput,
) -> Result<AuthResponse, AppError> {
    if input.username.len() < 3 {
        return Err(AppError::Validation(
            "Username must be at least 3 characters".into(),
        ));
    }
    if input.password.len() < 6 {
        return Err(AppError::Validation(
            "Password must be at least 6 characters".into(),
        ));
    }

    if users::find_user_by_username(&pool, &input.username)
        .await?
        .is_some()
    {
        return Err(AppError::Validation("Username already taken".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(input.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {e}")))?
        .to_string();

    let user = users::create_user(
        &pool,
        &input.username,
        &input.email,
        &password_hash,
        input.display_name.as_deref(),
    )
    .await?;

    // user_settings is auto-created by the users_create_default_settings trigger
    // (see migration 008_triggers.sql in Task 5).

    let token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(30);

    users::create_session(&pool, user.id, &token, expires_at).await?;

    Ok(AuthResponse { user, token })
}

#[tauri::command]
pub async fn login(
    pool: State<'_, PgPool>,
    input: LoginInput,
) -> Result<AuthResponse, AppError> {
    let user = users::find_user_by_username(&pool, &input.username)
        .await?
        .ok_or_else(|| AppError::Auth("Invalid username or password".into()))?;

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| AppError::Internal(format!("Failed to parse hash: {e}")))?;

    Argon2::default()
        .verify_password(input.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Auth("Invalid username or password".into()))?;

    let token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(30);

    users::create_session(&pool, user.id, &token, expires_at).await?;

    Ok(AuthResponse { user, token })
}

#[tauri::command]
pub async fn check_session(
    pool: State<'_, PgPool>,
    token: String,
) -> Result<AuthResponse, AppError> {
    let session = users::find_session_by_token(&pool, &token)
        .await?
        .ok_or_else(|| AppError::Auth("Session expired or invalid".into()))?;

    let user = users::find_user_by_id(&pool, session.user_id)
        .await?
        .ok_or_else(|| AppError::Auth("User not found".into()))?;

    Ok(AuthResponse { user, token })
}
