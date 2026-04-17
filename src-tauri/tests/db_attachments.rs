use sqlx::{postgres::types::Oid, PgPool};
use uuid::Uuid;

async fn seed_task(pool: &PgPool) -> sqlx::Result<Uuid> {
    let user_id: Uuid = sqlx::query_scalar(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind("attuser")
    .bind("att@x.com")
    .bind("h")
    .fetch_one(pool)
    .await?;

    let board_id: Uuid = sqlx::query_scalar(
        "INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id",
    )
    .bind(user_id)
    .bind("B")
    .fetch_one(pool)
    .await?;

    let column_id: Uuid = sqlx::query_scalar(
        "INSERT INTO columns (board_id, name) VALUES ($1, $2) RETURNING id",
    )
    .bind(board_id)
    .bind("Backlog")
    .fetch_one(pool)
    .await?;

    sqlx::query_scalar(
        "INSERT INTO tasks (column_id, board_id, title) VALUES ($1, $2, $3) RETURNING id",
    )
    .bind(column_id)
    .bind(board_id)
    .bind("t")
    .fetch_one(pool)
    .await
}

#[sqlx::test]
async fn link_attachment_requires_url(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;

    let ok = sqlx::query(
        "INSERT INTO task_attachments (task_id, kind, title, url) VALUES ($1, 'link', 'gh', 'https://github.com')",
    )
    .bind(task_id)
    .execute(&pool)
    .await;
    assert!(ok.is_ok());

    let bad = sqlx::query(
        "INSERT INTO task_attachments (task_id, kind, title) VALUES ($1, 'link', 'no-url')",
    )
    .bind(task_id)
    .execute(&pool)
    .await;
    assert!(bad.is_err(), "CHECK must reject link without url");
    Ok(())
}

#[sqlx::test]
async fn text_attachment_requires_content(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;

    let ok = sqlx::query(
        "INSERT INTO task_attachments (task_id, kind, title, content) VALUES ($1, 'text', 't', 'note body')",
    )
    .bind(task_id)
    .execute(&pool)
    .await;
    assert!(ok.is_ok());

    let bad = sqlx::query(
        "INSERT INTO task_attachments (task_id, kind, title) VALUES ($1, 'text', 'empty')",
    )
    .bind(task_id)
    .execute(&pool)
    .await;
    assert!(bad.is_err(), "CHECK must reject text without content");
    Ok(())
}

#[sqlx::test]
async fn file_attachment_requires_oid_and_mime(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;

    let oid: Oid = sqlx::query_scalar("SELECT lo_create(0)")
        .fetch_one(&pool)
        .await?;

    let ok = sqlx::query(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid, content_type)
         VALUES ($1, 'file', 'doc.pdf', $2, 'application/pdf')",
    )
    .bind(task_id)
    .bind(oid)
    .execute(&pool)
    .await;
    assert!(ok.is_ok());

    let bad = sqlx::query(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid)
         VALUES ($1, 'file', 'no-mime', $2)",
    )
    .bind(task_id)
    .bind(oid)
    .execute(&pool)
    .await;
    assert!(bad.is_err(), "CHECK must reject file without content_type");
    Ok(())
}

#[sqlx::test]
async fn file_attachment_delete_unlinks_large_object(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;

    let oid: Oid = sqlx::query_scalar("SELECT lo_create(0)")
        .fetch_one(&pool)
        .await?;

    let att_id: Uuid = sqlx::query_scalar(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid, content_type)
         VALUES ($1, 'file', 't', $2, 'application/octet-stream') RETURNING id",
    )
    .bind(task_id)
    .bind(oid)
    .fetch_one(&pool)
    .await?;

    sqlx::query("DELETE FROM task_attachments WHERE id = $1")
        .bind(att_id)
        .execute(&pool)
        .await?;

    let orphan_count: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM pg_largeobject_metadata WHERE oid = $1",
    )
    .bind(oid)
    .fetch_one(&pool)
    .await?;

    assert_eq!(orphan_count, 0, "lo_manage trigger must unlink large object on row delete");
    Ok(())
}
