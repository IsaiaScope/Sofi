# Sofi — Agent Command Center

A desktop IDE for orchestrating AI coding agents. Manage tasks on a Kanban board, watch agents work in live terminals, and review git diffs — all in one window.

## Features

- **Kanban Dashboard** — Create boards, organize tasks in columns, assign AI agents, drag-and-drop between stages
- **Integrated Terminal** — Live xterm.js terminals with PTY multiplexing, multiple sessions, shell selection (zsh, bash, fish, nu)
- **Git View** — Side-by-side diff viewer (VS Code style), branch management, commit history
- **Agent Support** — Claude Code and Codex adapters with per-task git worktree isolation
- **Authentication** — Local user accounts with argon2 password hashing and session management
- **Dark Violet Theme** — Custom dark IDE aesthetic with violet (#7c3aed) primary

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri 2.0 (Rust) |
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, shadcn/ui |
| State | Zustand |
| Terminal | xterm.js + portable-pty |
| Git | git2-rs (libgit2) |
| Database | SQLite (sqlx) |
| Auth | argon2 |
| Linter | Biome + UltraCite |

## Quick Start

```bash
# Prerequisites: Node.js 22+, pnpm 10+, Rust 1.94+

git clone https://github.com/IsaiaScope/Sofi.git
cd Sofi
pnpm install
pnpm tauri dev
```

## Documentation

- [Architecture](docs/architecture.md) — System design, module structure, data flow
- [Development Guide](docs/development.md) — Setup, commands, adding features
- [Contributing](docs/contributing.md) — Code style, PR guidelines, adding agents
- [Design Decisions](docs/design-decisions.md) — Why Tauri, why Zustand, why violet

## Project Structure

```
sofi/
├── src/                    # React frontend
│   ├── features/           # Kanban, Terminal, Git, Auth, Agents
│   ├── components/         # Top bar, layout, shared UI
│   └── lib/                # Utilities
├── src-tauri/              # Rust backend
│   ├── src/commands/       # Tauri IPC handlers
│   ├── src/services/       # PTY, git, agent managers
│   └── src/db/             # SQLite layer
└── docs/                   # Documentation
```

## License

MIT

---

Built with Tauri, React, and Rust.
