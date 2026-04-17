use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::postgres::types::Oid;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Attachment {
    pub id: Uuid,
    pub task_id: Uuid,
    pub kind: String,
    pub title: String,
    pub url: Option<String>,
    pub content: Option<String>,
    #[serde(skip_serializing)]
    pub large_object_oid: Option<Oid>,
    pub content_type: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkAttachmentInput {
    pub task_id: Uuid,
    pub title: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTextAttachmentInput {
    pub task_id: Uuid,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateFileAttachmentInput {
    pub task_id: Uuid,
    pub title: String,
    pub content_type: String,
    pub bytes: Vec<u8>,
}
