use sqlx::PgPool;
use uuid::Uuid;

#[sqlx::test]
async fn extensions_installed(pool: PgPool) -> sqlx::Result<()> {
    let pgcrypto: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')",
    )
    .fetch_one(&pool)
    .await?;
    assert!(pgcrypto, "pgcrypto extension must be installed");

    let lo: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'lo')",
    )
    .fetch_one(&pool)
    .await?;
    assert!(lo, "lo extension must be installed");
    Ok(())
}

#[sqlx::test]
async fn users_insert_and_fetch(pool: PgPool) -> sqlx::Result<()> {
    let (id, username, email): (Uuid, String, String) = sqlx::query_as(
        "INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, username, email",
    )
    .bind("alice")
    .bind("alice@example.com")
    .bind("argon2-hash")
    .fetch_one(&pool)
    .await?;

    assert_eq!(username, "alice");
    assert_eq!(email, "alice@example.com");
    assert_ne!(id, Uuid::nil());

    let dup = sqlx::query("INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)")
        .bind("alice")
        .bind("alice2@example.com")
        .bind("h")
        .execute(&pool)
        .await;
    assert!(dup.is_err(), "duplicate username must be rejected by UNIQUE constraint");
    Ok(())
}

#[sqlx::test]
async fn sessions_cascade_on_user_delete(pool: PgPool) -> sqlx::Result<()> {
    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind("bob")
    .bind("bob@x.com")
    .bind("h")
    .fetch_one(&pool)
    .await?;

    sqlx::query(
        "INSERT INTO sessions (user_id, token, expires_at)
         VALUES ($1, $2, now() + interval '1 day')",
    )
    .bind(user_id)
    .bind("tok-1")
    .execute(&pool)
    .await?;

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(&pool)
        .await?;

    let remaining: i64 =
        sqlx::query_scalar("SELECT count(*) FROM sessions WHERE user_id = $1")
            .bind(user_id)
            .fetch_one(&pool)
            .await?;

    assert_eq!(remaining, 0, "sessions must cascade-delete when user is deleted");
    Ok(())
}

#[sqlx::test]
async fn user_insert_auto_creates_settings(pool: PgPool) -> sqlx::Result<()> {
    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind("carol")
    .bind("carol@x.com")
    .bind("h")
    .fetch_one(&pool)
    .await?;

    let row: Option<(String, String, String)> = sqlx::query_as(
        "SELECT theme, default_agent_type, default_shell FROM user_settings WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(&pool)
    .await?;

    let (theme, default_agent, default_shell) = row.expect("user_settings row must be auto-created by trigger");
    assert_eq!(theme, "system");
    assert_eq!(default_agent, "claude-code");
    assert_eq!(default_shell, "/bin/zsh");
    Ok(())
}

#[sqlx::test]
async fn user_settings_theme_check_constraint(pool: PgPool) -> sqlx::Result<()> {
    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind("dan")
    .bind("dan@x.com")
    .bind("h")
    .fetch_one(&pool)
    .await?;

    let bad = sqlx::query("UPDATE user_settings SET theme = 'purple' WHERE user_id = $1")
        .bind(user_id)
        .execute(&pool)
        .await;

    assert!(bad.is_err(), "CHECK constraint must reject invalid theme value");
    Ok(())
}
