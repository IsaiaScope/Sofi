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

#[sqlx::test]
async fn boards_insert_and_cascade(pool: PgPool) -> sqlx::Result<()> {
    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind("eve")
    .bind("eve@x.com")
    .bind("h")
    .fetch_one(&pool)
    .await?;

    let board_id: Uuid = sqlx::query_scalar(
        "INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id",
    )
    .bind(user_id)
    .bind("My Board")
    .fetch_one(&pool)
    .await?;

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(user_id)
        .execute(&pool)
        .await?;

    let remaining: i64 =
        sqlx::query_scalar("SELECT count(*) FROM boards WHERE id = $1")
            .bind(board_id)
            .fetch_one(&pool)
            .await?;

    assert_eq!(remaining, 0, "board must cascade-delete when its user is deleted");
    Ok(())
}

#[sqlx::test]
async fn tasks_full_lifecycle(pool: PgPool) -> sqlx::Result<()> {
    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind("frank").bind("f@x.com").bind("h")
    .fetch_one(&pool).await?;

    let board_id: Uuid = sqlx::query_scalar(
        "INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id",
    )
    .bind(user_id).bind("B")
    .fetch_one(&pool).await?;

    let column_id: Uuid = sqlx::query_scalar(
        "INSERT INTO columns (board_id, name) VALUES ($1, $2) RETURNING id",
    )
    .bind(board_id).bind("Backlog")
    .fetch_one(&pool).await?;

    let task_id: Uuid = sqlx::query_scalar(
        "INSERT INTO tasks (column_id, board_id, title) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(column_id).bind(board_id).bind("Ship it")
    .fetch_one(&pool).await?;

    sqlx::query("UPDATE tasks SET agent_session_id = $2 WHERE id = $1")
        .bind(task_id).bind("sess-abc")
        .execute(&pool).await?;

    let got: Option<String> = sqlx::query_scalar(
        "SELECT agent_session_id FROM tasks WHERE id = $1"
    )
    .bind(task_id)
    .fetch_one(&pool).await?;
    assert_eq!(got.as_deref(), Some("sess-abc"));

    let is_done: bool = sqlx::query_scalar(
        "SELECT is_done_column FROM columns WHERE id = $1"
    )
    .bind(column_id)
    .fetch_one(&pool).await?;
    assert!(!is_done);

    Ok(())
}
