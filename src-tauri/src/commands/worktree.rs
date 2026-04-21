use crate::error::AppError;
use crate::services::worktree_manager;

#[tauri::command]
pub fn create_worktree(
    repo_path: String,
    branch_name: String,
    worktree_path: String,
) -> Result<(), AppError> {
    worktree_manager::create_worktree(&repo_path, &branch_name, &worktree_path)
        .map_err(AppError::Internal)
}

#[tauri::command]
pub fn remove_worktree(repo_path: String, worktree_path: String) -> Result<(), AppError> {
    worktree_manager::remove_worktree(&repo_path, &worktree_path).map_err(AppError::Internal)
}
