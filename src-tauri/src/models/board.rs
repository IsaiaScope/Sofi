use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Board {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub repo_path: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Column {
    pub id: Uuid,
    pub board_id: Uuid,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i32,
    pub is_done_column: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateBoardInput {
    pub name: String,
    pub description: Option<String>,
    pub repo_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateColumnInput {
    pub board_id: Uuid,
    pub name: String,
    pub color: Option<String>,
    pub is_done_column: Option<bool>,
}
