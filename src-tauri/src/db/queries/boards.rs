use sqlx::PgPool;
use uuid::Uuid;

use crate::models::board::{Board, Column};

pub async fn create_board(
    pool: &PgPool,
    user_id: Uuid,
    name: &str,
    description: Option<&str>,
    repo_path: Option<&str>,
) -> Result<Board, sqlx::Error> {
    let sort_order: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM boards WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Board>(
        "INSERT INTO boards (user_id, name, description, repo_path, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *",
    )
    .bind(user_id)
    .bind(name)
    .bind(description)
    .bind(repo_path)
    .bind(sort_order)
    .fetch_one(pool)
    .await
}

pub async fn list_boards(pool: &PgPool, user_id: Uuid) -> Result<Vec<Board>, sqlx::Error> {
    sqlx::query_as::<_, Board>(
        "SELECT * FROM boards WHERE user_id = $1 ORDER BY sort_order",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
}

pub async fn get_board(pool: &PgPool, board_id: Uuid) -> Result<Option<Board>, sqlx::Error> {
    sqlx::query_as::<_, Board>("SELECT * FROM boards WHERE id = $1")
        .bind(board_id)
        .fetch_optional(pool)
        .await
}

pub async fn create_column(
    pool: &PgPool,
    board_id: Uuid,
    name: &str,
    color: Option<&str>,
    is_done_column: bool,
) -> Result<Column, sqlx::Error> {
    let sort_order: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM columns WHERE board_id = $1",
    )
    .bind(board_id)
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Column>(
        "INSERT INTO columns (board_id, name, color, sort_order, is_done_column)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *",
    )
    .bind(board_id)
    .bind(name)
    .bind(color)
    .bind(sort_order)
    .bind(is_done_column)
    .fetch_one(pool)
    .await
}

pub async fn list_columns(pool: &PgPool, board_id: Uuid) -> Result<Vec<Column>, sqlx::Error> {
    sqlx::query_as::<_, Column>(
        "SELECT * FROM columns WHERE board_id = $1 ORDER BY sort_order",
    )
    .bind(board_id)
    .fetch_all(pool)
    .await
}

pub async fn create_default_columns(
    pool: &PgPool,
    board_id: Uuid,
) -> Result<Vec<Column>, sqlx::Error> {
    let defaults = [
        ("Backlog", "#64748b", false),
        ("In Progress", "#7c3aed", false),
        ("Review", "#f97316", false),
        ("Done", "#10b981", true),
    ];

    let mut columns = Vec::new();
    for (name, color, is_done) in defaults {
        let col = create_column(pool, board_id, name, Some(color), is_done).await?;
        columns.push(col);
    }
    Ok(columns)
}
