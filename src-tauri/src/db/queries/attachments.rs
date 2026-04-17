use sqlx::postgres::types::Oid;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::attachment::Attachment;

pub async fn list_by_task(
    pool: &PgPool,
    task_id: Uuid,
) -> Result<Vec<Attachment>, sqlx::Error> {
    sqlx::query_as::<_, Attachment>(
        "SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY sort_order, created_at",
    )
    .bind(task_id)
    .fetch_all(pool)
    .await
}

pub async fn create_link(
    pool: &PgPool,
    task_id: Uuid,
    title: &str,
    url: &str,
) -> Result<Attachment, sqlx::Error> {
    sqlx::query_as::<_, Attachment>(
        "INSERT INTO task_attachments (task_id, kind, title, url)
         VALUES ($1, 'link', $2, $3) RETURNING *",
    )
    .bind(task_id).bind(title).bind(url)
    .fetch_one(pool).await
}

pub async fn create_text(
    pool: &PgPool,
    task_id: Uuid,
    title: &str,
    content: &str,
) -> Result<Attachment, sqlx::Error> {
    sqlx::query_as::<_, Attachment>(
        "INSERT INTO task_attachments (task_id, kind, title, content)
         VALUES ($1, 'text', $2, $3) RETURNING *",
    )
    .bind(task_id).bind(title).bind(content)
    .fetch_one(pool).await
}

pub async fn create_file(
    pool: &PgPool,
    task_id: Uuid,
    title: &str,
    content_type: &str,
    bytes: &[u8],
) -> Result<Attachment, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let oid: Oid = sqlx::query_scalar("SELECT lo_create(0)")
        .fetch_one(&mut *tx).await?;

    // INV_WRITE = 0x20000 (131072)
    let fd: i32 = sqlx::query_scalar("SELECT lo_open($1, 131072)")
        .bind(oid)
        .fetch_one(&mut *tx).await?;
    sqlx::query("SELECT lowrite($1, $2::bytea)")
        .bind(fd).bind(bytes)
        .execute(&mut *tx).await?;
    sqlx::query("SELECT lo_close($1)")
        .bind(fd)
        .execute(&mut *tx).await?;

    let row = sqlx::query_as::<_, Attachment>(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid, content_type)
         VALUES ($1, 'file', $2, $3, $4) RETURNING *",
    )
    .bind(task_id).bind(title).bind(oid).bind(content_type)
    .fetch_one(&mut *tx).await?;

    tx.commit().await?;
    Ok(row)
}

pub async fn read_file(pool: &PgPool, attachment_id: Uuid) -> Result<Vec<u8>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let oid: Option<Oid> = sqlx::query_scalar(
        "SELECT large_object_oid FROM task_attachments WHERE id = $1 AND kind = 'file'",
    )
    .bind(attachment_id)
    .fetch_optional(&mut *tx).await?
    .flatten();

    let oid = oid.ok_or(sqlx::Error::RowNotFound)?;

    // lo_get reads the entire large object as bytea in one call.
    // Avoids loread's palloc limit on very large read requests.
    let bytes: Vec<u8> = sqlx::query_scalar("SELECT lo_get($1)")
        .bind(oid)
        .fetch_one(&mut *tx).await?;

    tx.commit().await?;
    Ok(bytes)
}

pub async fn delete(pool: &PgPool, attachment_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM task_attachments WHERE id = $1")
        .bind(attachment_id)
        .execute(pool)
        .await?;
    Ok(())
}
