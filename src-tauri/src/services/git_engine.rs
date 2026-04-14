use git2::{DiffOptions, Repository, StatusOptions};
use serde::Serialize;
use std::path::Path;

#[derive(Debug, Clone, Serialize)]
pub struct FileStatus {
    pub path: String,
    pub status: String, // "new", "modified", "deleted", "renamed"
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffHunk {
    pub file_path: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffLine {
    pub origin: String, // "+", "-", " "
    pub content: String,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_head: bool,
    pub upstream: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CommitInfo {
    pub id: String,
    pub message: String,
    pub author: String,
    pub time: i64,
}

pub struct GitEngine {
    repo: Repository,
}

impl GitEngine {
    pub fn open(path: &str) -> Result<Self, String> {
        let repo =
            Repository::open(Path::new(path)).map_err(|e| format!("Failed to open repo: {e}"))?;
        Ok(Self { repo })
    }

    pub fn status(&self) -> Result<Vec<FileStatus>, String> {
        let mut opts = StatusOptions::new();
        opts.include_untracked(true);

        let statuses = self
            .repo
            .statuses(Some(&mut opts))
            .map_err(|e| format!("Failed to get status: {e}"))?;

        let files: Vec<FileStatus> = statuses
            .iter()
            .map(|entry| {
                let path = entry.path().unwrap_or("").to_string();
                let status = entry.status();
                let status_str = if status.is_index_new() || status.is_wt_new() {
                    "new"
                } else if status.is_index_modified() || status.is_wt_modified() {
                    "modified"
                } else if status.is_index_deleted() || status.is_wt_deleted() {
                    "deleted"
                } else if status.is_index_renamed() || status.is_wt_renamed() {
                    "renamed"
                } else {
                    "unknown"
                };
                FileStatus {
                    path,
                    status: status_str.to_string(),
                }
            })
            .collect();

        Ok(files)
    }

    pub fn diff(&self) -> Result<Vec<DiffHunk>, String> {
        let diff = self
            .repo
            .diff_index_to_workdir(None, Some(&mut DiffOptions::new()))
            .map_err(|e| format!("Failed to get diff: {e}"))?;

        let mut hunks = Vec::new();

        diff.print(git2::DiffFormat::Patch, |delta, hunk, line| {
            let file_path = delta
                .new_file()
                .path()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            if let Some(hunk) = hunk {
                // Check if we need a new hunk entry
                let need_new = hunks.last().map_or(true, |h: &DiffHunk| {
                    h.file_path != file_path
                        || h.old_start != hunk.old_start()
                        || h.new_start != hunk.new_start()
                });

                if need_new {
                    hunks.push(DiffHunk {
                        file_path: file_path.clone(),
                        old_start: hunk.old_start(),
                        old_lines: hunk.old_lines(),
                        new_start: hunk.new_start(),
                        new_lines: hunk.new_lines(),
                        lines: Vec::new(),
                    });
                }
            }

            if let Some(last_hunk) = hunks.last_mut() {
                let origin = match line.origin() {
                    '+' => "+",
                    '-' => "-",
                    _ => " ",
                };
                last_hunk.lines.push(DiffLine {
                    origin: origin.to_string(),
                    content: String::from_utf8_lossy(line.content()).to_string(),
                    old_lineno: line.old_lineno(),
                    new_lineno: line.new_lineno(),
                });
            }
            true
        })
        .map_err(|e| format!("Failed to iterate diff: {e}"))?;

        Ok(hunks)
    }

    pub fn branches(&self) -> Result<Vec<BranchInfo>, String> {
        let branches = self
            .repo
            .branches(Some(git2::BranchType::Local))
            .map_err(|e| format!("Failed to list branches: {e}"))?;

        let result: Vec<BranchInfo> = branches
            .filter_map(|branch| {
                let (branch, _) = branch.ok()?;
                let name = branch.name().ok()??.to_string();
                let is_head = branch.is_head();
                let upstream = branch
                    .upstream()
                    .ok()
                    .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

                Some(BranchInfo {
                    name,
                    is_head,
                    upstream,
                })
            })
            .collect();

        Ok(result)
    }

    pub fn log(&self, count: usize) -> Result<Vec<CommitInfo>, String> {
        let mut revwalk = self
            .repo
            .revwalk()
            .map_err(|e| format!("Failed to create revwalk: {e}"))?;

        if let Err(e) = revwalk.push_head() {
            // Empty repo (no commits yet) — return empty list instead of error
            if e.code() == git2::ErrorCode::UnbornBranch || e.code() == git2::ErrorCode::NotFound {
                return Ok(Vec::new());
            }
            return Err(format!("Failed to push HEAD: {e}"));
        }

        let oids: Vec<git2::Oid> = revwalk
            .take(count)
            .filter_map(|oid| oid.ok())
            .collect();

        let commits: Vec<CommitInfo> = oids
            .into_iter()
            .filter_map(|oid| {
                let commit = self.repo.find_commit(oid).ok()?;
                let info = CommitInfo {
                    id: oid.to_string()[..8].to_string(),
                    message: commit.message().unwrap_or("").trim().to_string(),
                    author: commit.author().name().unwrap_or("").to_string(),
                    time: commit.time().seconds(),
                };
                Some(info)
            })
            .collect();

        Ok(commits)
    }
}
