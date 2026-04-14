use sqlx::SqlitePool;
use crate::models::board::{Board, Column};

pub async fn create_board(
    pool: &SqlitePool,
    id: &str,
    user_id: &str,
    name: &str,
    description: Option<&str>,
    repo_path: Option<&str>,
) -> Result<Board, sqlx::Error> {
    let sort_order: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM boards WHERE user_id = ?",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Board>(
        "INSERT INTO boards (id, user_id, name, description, repo_path, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *",
    )
    .bind(id)
    .bind(user_id)
    .bind(name)
    .bind(description)
    .bind(repo_path)
    .bind(sort_order)
    .fetch_one(pool)
    .await
}

pub async fn list_boards(
    pool: &SqlitePool,
    user_id: &str,
) -> Result<Vec<Board>, sqlx::Error> {
    sqlx::query_as::<_, Board>(
        "SELECT * FROM boards WHERE user_id = ? ORDER BY sort_order",
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
}

pub async fn get_board(
    pool: &SqlitePool,
    board_id: &str,
) -> Result<Option<Board>, sqlx::Error> {
    sqlx::query_as::<_, Board>("SELECT * FROM boards WHERE id = ?")
        .bind(board_id)
        .fetch_optional(pool)
        .await
}

pub async fn create_column(
    pool: &SqlitePool,
    id: &str,
    board_id: &str,
    name: &str,
    color: Option<&str>,
    is_done_column: bool,
) -> Result<Column, sqlx::Error> {
    let sort_order: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM columns WHERE board_id = ?",
    )
    .bind(board_id)
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Column>(
        "INSERT INTO columns (id, board_id, name, color, sort_order, is_done_column)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *",
    )
    .bind(id)
    .bind(board_id)
    .bind(name)
    .bind(color)
    .bind(sort_order)
    .bind(is_done_column)
    .fetch_one(pool)
    .await
}

pub async fn list_columns(
    pool: &SqlitePool,
    board_id: &str,
) -> Result<Vec<Column>, sqlx::Error> {
    sqlx::query_as::<_, Column>(
        "SELECT * FROM columns WHERE board_id = ? ORDER BY sort_order",
    )
    .bind(board_id)
    .fetch_all(pool)
    .await
}

pub async fn create_default_columns(
    pool: &SqlitePool,
    board_id: &str,
) -> Result<Vec<Column>, sqlx::Error> {
    let defaults = [
        ("Backlog", "#64748b", false),
        ("In Progress", "#7c3aed", false),
        ("Review", "#f97316", false),
        ("Done", "#10b981", true),
    ];

    let mut columns = Vec::new();
    for (name, color, is_done) in defaults {
        let col = create_column(
            pool,
            &uuid::Uuid::new_v4().to_string(),
            board_id,
            name,
            Some(color),
            is_done,
        )
        .await?;
        columns.push(col);
    }
    Ok(columns)
}
