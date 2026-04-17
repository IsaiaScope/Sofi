use sqlx::PgPool;
use tauri::State;
use uuid::Uuid;

use crate::db::queries::attachments;
use crate::error::AppError;
use crate::models::attachment::{
    Attachment, CreateFileAttachmentInput, CreateLinkAttachmentInput, CreateTextAttachmentInput,
};

#[tauri::command]
pub async fn list_attachments(
    pool: State<'_, PgPool>,
    task_id: Uuid,
) -> Result<Vec<Attachment>, AppError> {
    attachments::list_by_task(&pool, task_id).await.map_err(AppError::from)
}

#[tauri::command]
pub async fn create_link_attachment(
    pool: State<'_, PgPool>,
    input: CreateLinkAttachmentInput,
) -> Result<Attachment, AppError> {
    attachments::create_link(&pool, input.task_id, &input.title, &input.url)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn create_text_attachment(
    pool: State<'_, PgPool>,
    input: CreateTextAttachmentInput,
) -> Result<Attachment, AppError> {
    attachments::create_text(&pool, input.task_id, &input.title, &input.content)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn create_file_attachment(
    pool: State<'_, PgPool>,
    input: CreateFileAttachmentInput,
) -> Result<Attachment, AppError> {
    attachments::create_file(&pool, input.task_id, &input.title, &input.content_type, &input.bytes)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn read_file_attachment(
    pool: State<'_, PgPool>,
    attachment_id: Uuid,
) -> Result<Vec<u8>, AppError> {
    attachments::read_file(&pool, attachment_id).await.map_err(AppError::from)
}

#[tauri::command]
pub async fn delete_attachment(
    pool: State<'_, PgPool>,
    attachment_id: Uuid,
) -> Result<(), AppError> {
    attachments::delete(&pool, attachment_id).await.map_err(AppError::from)
}
