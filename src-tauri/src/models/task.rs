use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: Uuid,
    pub column_id: Uuid,
    pub board_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
    pub agent_session_id: Option<String>,
    pub terminal_session_id: Option<String>,
    pub branch_name: Option<String>,
    pub worktree_path: Option<String>,
    pub status: String,
    pub pr_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub column_id: Uuid,
    pub board_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub id: Uuid,
    pub column_id: Option<Uuid>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
    pub agent_session_id: Option<String>,
    pub terminal_session_id: Option<String>,
    pub branch_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MoveTaskInput {
    pub task_id: Uuid,
    pub target_column_id: Uuid,
    pub sort_order: i32,
}
