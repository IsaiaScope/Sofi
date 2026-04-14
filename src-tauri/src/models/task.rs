use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: String,
    pub column_id: String,
    pub board_id: String,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
    pub terminal_session_id: Option<String>,
    pub branch_name: Option<String>,
    pub worktree_path: Option<String>,
    pub status: String,
    pub pr_url: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub column_id: String,
    pub board_id: String,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub id: String,
    pub column_id: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
    pub branch_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MoveTaskInput {
    pub task_id: String,
    pub target_column_id: String,
    pub sort_order: i32,
}
