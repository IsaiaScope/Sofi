use sqlx::PgPool;
use uuid::Uuid;

use crate::models::task::Task;

pub async fn create_task(
    pool: &PgPool,
    column_id: Uuid,
    board_id: Uuid,
    title: &str,
    description: Option<&str>,
    agent_type: Option<&str>,
    agent_name: Option<&str>,
) -> Result<Task, sqlx::Error> {
    let sort_order: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tasks WHERE column_id = $1",
    )
    .bind(column_id)
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Task>(
        "INSERT INTO tasks (column_id, board_id, title, description, sort_order, agent_type, agent_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *",
    )
    .bind(column_id)
    .bind(board_id)
    .bind(title)
    .bind(description)
    .bind(sort_order)
    .bind(agent_type)
    .bind(agent_name)
    .fetch_one(pool)
    .await
}

pub async fn list_tasks(pool: &PgPool, board_id: Uuid) -> Result<Vec<Task>, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE board_id = $1 ORDER BY sort_order",
    )
    .bind(board_id)
    .fetch_all(pool)
    .await
}

pub async fn move_task(
    pool: &PgPool,
    task_id: Uuid,
    target_column_id: Uuid,
    sort_order: i32,
) -> Result<Task, sqlx::Error> {
    // Move the task to the target column and position
    sqlx::query(
        "UPDATE tasks SET column_id = $1, sort_order = $2, updated_at = now()
         WHERE id = $3",
    )
    .bind(target_column_id)
    .bind(sort_order)
    .bind(task_id)
    .execute(pool)
    .await?;

    // Re-number all tasks in the target column to prevent sort_order collisions
    let column_tasks = sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE column_id = $1 ORDER BY sort_order, updated_at DESC",
    )
    .bind(target_column_id)
    .fetch_all(pool)
    .await?;

    for (i, task) in column_tasks.iter().enumerate() {
        sqlx::query("UPDATE tasks SET sort_order = $1 WHERE id = $2")
            .bind(i as i32)
            .bind(task.id)
            .execute(pool)
            .await?;
    }

    // Return the moved task with updated sort_order
    sqlx::query_as::<_, Task>("SELECT * FROM tasks WHERE id = $1")
        .bind(task_id)
        .fetch_one(pool)
        .await
}

pub async fn update_task(
    pool: &PgPool,
    id: Uuid,
    column_id: Option<Uuid>,
    title: Option<&str>,
    description: Option<&str>,
    sort_order: Option<i32>,
    status: Option<&str>,
    agent_type: Option<&str>,
    agent_name: Option<&str>,
    agent_session_id: Option<&str>,
    terminal_session_id: Option<&str>,
    branch_name: Option<&str>,
) -> Result<Task, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        "UPDATE tasks SET
            column_id = COALESCE($2, column_id),
            title = COALESCE($3, title),
            description = COALESCE($4, description),
            sort_order = COALESCE($5, sort_order),
            status = COALESCE($6, status),
            agent_type = COALESCE($7, agent_type),
            agent_name = COALESCE($8, agent_name),
            agent_session_id = COALESCE($9, agent_session_id),
            terminal_session_id = COALESCE($10, terminal_session_id),
            branch_name = COALESCE($11, branch_name),
            updated_at = now()
         WHERE id = $1
         RETURNING *",
    )
    .bind(id)
    .bind(column_id)
    .bind(title)
    .bind(description)
    .bind(sort_order)
    .bind(status)
    .bind(agent_type)
    .bind(agent_name)
    .bind(agent_session_id)
    .bind(terminal_session_id)
    .bind(branch_name)
    .fetch_one(pool)
    .await
}

pub async fn delete_task(pool: &PgPool, task_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tasks WHERE id = $1")
        .bind(task_id)
        .execute(pool)
        .await?;
    Ok(())
}
