use sqlx::SqlitePool;
use tauri::State;

use crate::db::queries::{boards, tasks};
use crate::error::AppError;
use crate::models::board::{Board, Column, CreateBoardInput};
use crate::models::task::{CreateTaskInput, MoveTaskInput, Task, UpdateTaskInput};

// ── Boards ──────────────────────────────────────────────

#[tauri::command]
pub async fn create_board(
    pool: State<'_, SqlitePool>,
    user_id: String,
    input: CreateBoardInput,
) -> Result<Board, AppError> {
    let board_id = uuid::Uuid::new_v4().to_string();
    let board = boards::create_board(
        &pool,
        &board_id,
        &user_id,
        &input.name,
        input.description.as_deref(),
        input.repo_path.as_deref(),
    )
    .await?;

    // Create default columns
    boards::create_default_columns(&pool, &board_id).await?;

    Ok(board)
}

#[tauri::command]
pub async fn list_boards(
    pool: State<'_, SqlitePool>,
    user_id: String,
) -> Result<Vec<Board>, AppError> {
    Ok(boards::list_boards(&pool, &user_id).await?)
}

#[tauri::command]
pub async fn get_board(
    pool: State<'_, SqlitePool>,
    board_id: String,
) -> Result<Board, AppError> {
    boards::get_board(&pool, &board_id)
        .await?
        .ok_or_else(|| AppError::NotFound("Board not found".into()))
}

// ── Columns ─────────────────────────────────────────────

#[tauri::command]
pub async fn list_columns(
    pool: State<'_, SqlitePool>,
    board_id: String,
) -> Result<Vec<Column>, AppError> {
    Ok(boards::list_columns(&pool, &board_id).await?)
}

// ── Tasks ───────────────────────────────────────────────

#[tauri::command]
pub async fn create_task(
    pool: State<'_, SqlitePool>,
    input: CreateTaskInput,
) -> Result<Task, AppError> {
    let task_id = uuid::Uuid::new_v4().to_string();
    Ok(tasks::create_task(
        &pool,
        &task_id,
        &input.column_id,
        &input.board_id,
        &input.title,
        input.description.as_deref(),
    )
    .await?)
}

#[tauri::command]
pub async fn list_tasks(
    pool: State<'_, SqlitePool>,
    board_id: String,
) -> Result<Vec<Task>, AppError> {
    Ok(tasks::list_tasks(&pool, &board_id).await?)
}

#[tauri::command]
pub async fn move_task(
    pool: State<'_, SqlitePool>,
    input: MoveTaskInput,
) -> Result<Task, AppError> {
    Ok(tasks::move_task(&pool, &input.task_id, &input.target_column_id, input.sort_order).await?)
}

#[tauri::command]
pub async fn update_task(
    pool: State<'_, SqlitePool>,
    input: UpdateTaskInput,
) -> Result<Task, AppError> {
    Ok(tasks::update_task(
        &pool,
        &input.id,
        input.title.as_deref(),
        input.description.as_deref(),
        input.status.as_deref(),
        input.agent_type.as_deref(),
        input.agent_name.as_deref(),
        input.branch_name.as_deref(),
    )
    .await?)
}

#[tauri::command]
pub async fn delete_task(
    pool: State<'_, SqlitePool>,
    task_id: String,
) -> Result<(), AppError> {
    Ok(tasks::delete_task(&pool, &task_id).await?)
}
