use crate::error::AppError;
use crate::services::git_engine::{BranchInfo, CommitInfo, DiffHunk, FileStatus, GitEngine};

#[tauri::command]
pub fn git_status(repo_path: String) -> Result<Vec<FileStatus>, AppError> {
    let engine = GitEngine::open(&repo_path).map_err(AppError::Internal)?;
    engine.status().map_err(AppError::Internal)
}

#[tauri::command]
pub fn git_diff(repo_path: String) -> Result<Vec<DiffHunk>, AppError> {
    let engine = GitEngine::open(&repo_path).map_err(AppError::Internal)?;
    engine.diff().map_err(AppError::Internal)
}

#[tauri::command]
pub fn git_branches(repo_path: String) -> Result<Vec<BranchInfo>, AppError> {
    let engine = GitEngine::open(&repo_path).map_err(AppError::Internal)?;
    engine.branches().map_err(AppError::Internal)
}

#[tauri::command]
pub fn git_log(repo_path: String, count: Option<usize>) -> Result<Vec<CommitInfo>, AppError> {
    let engine = GitEngine::open(&repo_path).map_err(AppError::Internal)?;
    engine.log(count.unwrap_or(50)).map_err(AppError::Internal)
}
