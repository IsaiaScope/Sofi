use sqlx::PgPool;

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
