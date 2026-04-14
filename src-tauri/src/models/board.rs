use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Board {
    pub id: String,
    pub user_id: String,
    pub name: String,
    pub description: Option<String>,
    pub repo_path: Option<String>,
    pub sort_order: i32,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Column {
    pub id: String,
    pub board_id: String,
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
    pub board_id: String,
    pub name: String,
    pub color: Option<String>,
    pub is_done_column: Option<bool>,
}
