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
