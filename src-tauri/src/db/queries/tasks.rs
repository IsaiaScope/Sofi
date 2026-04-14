use sqlx::SqlitePool;
use crate::models::task::Task;

pub async fn create_task(
    pool: &SqlitePool,
    id: &str,
    column_id: &str,
    board_id: &str,
    title: &str,
    description: Option<&str>,
) -> Result<Task, sqlx::Error> {
    let sort_order: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM tasks WHERE column_id = ?",
    )
    .bind(column_id)
    .fetch_one(pool)
    .await?;

    sqlx::query_as::<_, Task>(
        "INSERT INTO tasks (id, column_id, board_id, title, description, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *",
    )
    .bind(id)
    .bind(column_id)
    .bind(board_id)
    .bind(title)
    .bind(description)
    .bind(sort_order)
    .fetch_one(pool)
    .await
}

pub async fn list_tasks(
    pool: &SqlitePool,
    board_id: &str,
) -> Result<Vec<Task>, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        "SELECT * FROM tasks WHERE board_id = ? ORDER BY sort_order",
    )
    .bind(board_id)
    .fetch_all(pool)
    .await
}

pub async fn move_task(
    pool: &SqlitePool,
    task_id: &str,
    target_column_id: &str,
    sort_order: i32,
) -> Result<Task, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        "UPDATE tasks SET column_id = ?, sort_order = ?, updated_at = datetime('now')
         WHERE id = ?
         RETURNING *",
    )
    .bind(target_column_id)
    .bind(sort_order)
    .bind(task_id)
    .fetch_one(pool)
    .await
}

pub async fn update_task(
    pool: &SqlitePool,
    task_id: &str,
    title: Option<&str>,
    description: Option<&str>,
    status: Option<&str>,
    agent_type: Option<&str>,
    agent_name: Option<&str>,
    branch_name: Option<&str>,
) -> Result<Task, sqlx::Error> {
    // Build dynamic update — for simplicity, we update all nullable fields
    sqlx::query_as::<_, Task>(
        "UPDATE tasks SET
            title = COALESCE(?, title),
            description = COALESCE(?, description),
            status = COALESCE(?, status),
            agent_type = COALESCE(?, agent_type),
            agent_name = COALESCE(?, agent_name),
            branch_name = COALESCE(?, branch_name),
            updated_at = datetime('now')
         WHERE id = ?
         RETURNING *",
    )
    .bind(title)
    .bind(description)
    .bind(status)
    .bind(agent_type)
    .bind(agent_name)
    .bind(branch_name)
    .bind(task_id)
    .fetch_one(pool)
    .await
}

pub async fn delete_task(
    pool: &SqlitePool,
    task_id: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(task_id)
        .execute(pool)
        .await?;
    Ok(())
}
