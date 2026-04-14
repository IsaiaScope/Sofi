# Sofi Architecture

## Overview

Sofi is a desktop application built with **Tauri 2.0** (Rust backend + React frontend). It follows a three-layer architecture: a React WebView for the UI, a Rust core for system operations, and the OS/filesystem layer underneath.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  React Frontend (WebView)                 │
│                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Kanban View │  │ Terminal View │  │    Git View     │  │
│  │ (@dnd-kit)  │  │  (xterm.js)  │  │ (side-by-side)  │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
│                                                           │
│  State: Zustand    Routing: TanStack    UI: shadcn/ui    │
├──────────────── Tauri IPC (invoke / listen) ─────────────┤
│                  Rust Backend (Tauri Core)                 │
│                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Agent     │  │ PTY Manager  │  │   Git Engine    │  │
│  │  Manager    │  │(portable-pty)│  │   (git2-rs)     │  │
│  ├────────────┤  ├──────────────┤  ├─────────────────┤  │
│  │ Worktree   │  │ Auth Service │  │  DB Layer (sqlx) │  │
│  │  Manager   │  │  (argon2)    │  │    (SQLite)      │  │
│  └────────────┘  └──────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    System Layer                           │
│  CLI Agents (Claude, Codex)  │  Git Repos  │  SQLite DB │
└─────────────────────────────────────────────────────────┘
```

## Communication Patterns

### Frontend → Backend

All frontend-to-backend calls use Tauri's `invoke()` function:

```typescript
const boards = await invoke<Board[]>("list_boards", { userId });
```

Commands are defined as `#[tauri::command]` functions in Rust and registered in `lib.rs`.

### Backend → Frontend

Real-time updates (terminal output, agent status changes) use Tauri's event system:

```rust
app.emit("terminal-output", TerminalData { id, data })?;
```

```typescript
listen("terminal-output", (event) => {
  terminal.write(event.payload.data);
});
```

## Data Flow

### Kanban Task → Agent → Terminal → Git

1. User creates a task on the Kanban board
2. User assigns an agent (Claude Code / Codex) to the task
3. Agent Manager creates a git worktree for isolation
4. PTY Manager spawns the agent CLI in that worktree
5. Terminal output streams to xterm.js via Tauri events
6. When agent completes, task moves to "Review" column
7. User reviews the diff in the Git view
8. User creates a PR from within the app

## Module Structure

### Rust Backend (`src-tauri/src/`)

| Module | Purpose |
|--------|---------|
| `commands/auth.rs` | Register, login, session management |
| `commands/kanban.rs` | Board, column, task CRUD |
| `commands/terminal.rs` | PTY create, write, resize, kill |
| `commands/git.rs` | Diff, branches, worktrees |
| `commands/agents.rs` | Agent spawn, stop, status |
| `services/pty_manager.rs` | PTY session lifecycle |
| `services/agent_manager.rs` | Agent process management |
| `services/git_engine.rs` | Git operations via git2-rs |
| `services/worktree_manager.rs` | Git worktree isolation |
| `services/shell_detector.rs` | Detect available shells |
| `db/pool.rs` | SQLite connection + migrations |
| `db/queries/` | SQL query modules |
| `models/` | Shared Rust structs |

### React Frontend (`src/`)

| Module | Purpose |
|--------|---------|
| `features/kanban/` | Kanban board, columns, task cards, drag-and-drop |
| `features/terminal/` | xterm.js terminal, session tabs, PTY streaming |
| `features/git/` | Diff viewer, branch list, PR panel |
| `features/agents/` | Agent config, adapters, status |
| `features/auth/` | Login, register, session management |
| `components/top-bar/` | Navigation bar with 3 selects |
| `components/layout/` | App shell, context bar |
| `lib/` | Utilities (Tauri wrappers, cn, constants) |

## Database

SQLite with sqlx (async). Tables:

- `users` — User accounts with argon2 password hashes
- `sessions` — Auth session tokens with expiration
- `user_settings` — Per-user preferences (shell, theme, font)
- `boards` — Kanban boards linked to git repos
- `columns` — Board columns with colors and sort order
- `tasks` — Tasks with agent assignment, branch, status

Database file: `{app_data_dir}/sofi.db` (auto-created on first launch).

## Security

- Passwords hashed with argon2 (memory-hard, recommended by OWASP)
- Session tokens are UUIDs with 30-day expiration
- Tauri capability-based permissions (only enabled commands are accessible)
- Agent processes run in isolated git worktrees
- No secrets stored in code — all in local SQLite
