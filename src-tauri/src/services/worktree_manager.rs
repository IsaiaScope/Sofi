use std::path::Path;
use std::process::Command;

// Intentionally shells out to `git` instead of using git2-rs's Worktree API.
// libgit2 requires explicit reference binding for `add` and doesn't respect
// the user's git config around tracking branches. The CLI path matches user
// expectations and surfaces familiar error messages.

pub fn create_worktree(
    repo_path: &str,
    branch_name: &str,
    worktree_path: &str,
) -> Result<(), String> {
    if !Path::new(repo_path).exists() {
        return Err(format!("Repo path does not exist: {repo_path}"));
    }

    let output = Command::new("git")
        .args([
            "-C",
            repo_path,
            "worktree",
            "add",
            "-b",
            branch_name,
            worktree_path,
        ])
        .output()
        .map_err(|e| format!("Failed to spawn git: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git worktree add failed: {stderr}"));
    }
    Ok(())
}

pub fn remove_worktree(repo_path: &str, worktree_path: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", repo_path, "worktree", "remove", "--force", worktree_path])
        .output()
        .map_err(|e| format!("Failed to spawn git: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git worktree remove failed: {stderr}"));
    }
    Ok(())
}
