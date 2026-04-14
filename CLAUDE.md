# Sofi — Agent Command Center

## Project Overview
Desktop IDE for orchestrating AI coding agents. Built with Tauri 2.0 (Rust) + React 19 (TypeScript).

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 4, Zustand, xterm.js, @dnd-kit
- **Backend**: Tauri 2.0, Rust, sqlx (SQLite), portable-pty, git2-rs, argon2
- **Linter**: Biome + UltraCite (NOT ESLint/Prettier)
- **Theme**: Dark violet (#7c3aed) primary

## Key Conventions
- Feature-based folder structure: `src/features/{name}/{components,hooks,store,types.ts}`
- Zustand stores per feature (not a single global store)
- Tauri IPC: `invoke("command_name", { args })` from frontend, `#[tauri::command]` in Rust
- SQLite with raw SQL via sqlx (no ORM)
- Snake_case for Rust/DB fields, camelCase for TypeScript (Tauri handles conversion)
- Path alias: `@/` maps to `src/`

## Build Notes
- Cargo build target redirected to internal drive: `/Users/isaia/.sofi-build/target`
- Must clean `._*` files before Cargo builds on external drives: `find . -name '._*' -delete`
- Run `source ~/.cargo/env` before Rust commands

## Commands
- `pnpm tauri dev` — development mode
- `pnpm lint` — Biome + UltraCite check
- `cargo check` — Rust type check (from src-tauri/)
