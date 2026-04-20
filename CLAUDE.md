# Sofi — Agent Command Center

## Project Overview
Desktop IDE for orchestrating AI coding agents. Built with Tauri 2.0 (Rust) + React 19 (TypeScript).

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS 4, Zustand, xterm.js, @dnd-kit
- **Desktop shell**: Tauri 2.0 (Rust) — PTY, git2-rs, OS keychain, OAuth loopback. No DB access from Rust.
- **API backend**: Django 5 + DRF + django-allauth + dj-rest-auth + django-rest-knox (in `backend/`, Python 3.12 via `uv`)
- **Database**: Postgres 16 in local Docker (`docker compose up -d postgres adminer`)
- **Linter**: Biome + UltraCite (NOT ESLint/Prettier)
- **Theme**: Dark violet (#7c3aed) primary

## Key Conventions
- Feature-based folder structure: `src/features/{name}/{components,hooks,store,types.ts}`
- Zustand stores per feature (not a single global store)
- Tauri IPC: `invoke("command_name", { args })` from frontend, `#[tauri::command]` in Rust
- SQLite with raw SQL via sqlx (no ORM)
- Snake_case for Rust/DB fields, camelCase for TypeScript (Tauri handles conversion)
- Path alias: `@/` maps to `src/`
- **Components**: Always pull from shadcn/ui (Base UI registry) first. Fall back to Radix UI primitives only if Base UI has no equivalent. Do not hand-roll primitives (dialog, dropdown, popover, etc.) or add other component libraries.

## Build Notes
- Cargo build target redirected to internal drive: `/Users/isaia/.sofi-build/target`
- Must clean `._*` files before Cargo builds on external drives: `find . -name '._*' -delete`
- Run `source ~/.cargo/env` before Rust commands

## Commands
- `docker compose up -d postgres adminer` — one-time per session, before `pnpm tauri dev`
- `pnpm tauri dev` — development mode (auto-starts Vite + Django runserver via `concurrently`)
- `pnpm dev:backend` — start just Django (cd backend && uv run manage.py runserver)
- `pnpm lint` — Biome + UltraCite check
- `cargo check` — Rust type check (from src-tauri/)
- `cd backend && uv run python manage.py check` — Django config check
