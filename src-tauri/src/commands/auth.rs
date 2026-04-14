use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use sqlx::SqlitePool;
use tauri::State;

use crate::db::queries::users;
use crate::error::AppError;
use crate::models::user::{AuthResponse, LoginInput, RegisterInput};

#[tauri::command]
pub async fn register(
    pool: State<'_, SqlitePool>,
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

    // Check if username exists
    if users::find_user_by_username(&pool, &input.username)
        .await?
        .is_some()
    {
        return Err(AppError::Validation("Username already taken".into()));
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(input.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {e}")))?
        .to_string();

    let user_id = uuid::Uuid::new_v4().to_string();
    let user = users::create_user(
        &pool,
        &user_id,
        &input.username,
        &input.email,
        &password_hash,
        input.display_name.as_deref(),
    )
    .await?;

    // Create default settings
    users::create_user_settings(&pool, &uuid::Uuid::new_v4().to_string(), &user_id).await?;

    // Create session
    let token = uuid::Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(30))
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    users::create_session(
        &pool,
        &uuid::Uuid::new_v4().to_string(),
        &user_id,
        &token,
        &expires_at,
    )
    .await?;

    Ok(AuthResponse { user, token })
}

#[tauri::command]
pub async fn login(
    pool: State<'_, SqlitePool>,
    input: LoginInput,
) -> Result<AuthResponse, AppError> {
    let user = users::find_user_by_username(&pool, &input.username)
        .await?
        .ok_or_else(|| AppError::Auth("Invalid username or password".into()))?;

    // Verify password
    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| AppError::Internal(format!("Failed to parse hash: {e}")))?;

    Argon2::default()
        .verify_password(input.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Auth("Invalid username or password".into()))?;

    // Create session
    let token = uuid::Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(30))
        .unwrap()
        .format("%Y-%m-%d %H:%M:%S")
        .to_string();

    users::create_session(
        &pool,
        &uuid::Uuid::new_v4().to_string(),
        &user.id,
        &token,
        &expires_at,
    )
    .await?;

    Ok(AuthResponse { user, token })
}

#[tauri::command]
pub async fn check_session(
    pool: State<'_, SqlitePool>,
    token: String,
) -> Result<AuthResponse, AppError> {
    let session = users::find_session_by_token(&pool, &token)
        .await?
        .ok_or_else(|| AppError::Auth("Session expired or invalid".into()))?;

    let user = users::find_user_by_id(&pool, &session.user_id)
        .await?
        .ok_or_else(|| AppError::Auth("User not found".into()))?;

    Ok(AuthResponse { user, token })
}
