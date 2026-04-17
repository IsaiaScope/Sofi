# Postgres Migration (Local Docker) — Design Spec

**Date:** 2026-04-17
**Status:** Draft, awaiting user review
**Supersedes:** The SQLite schema in `src-tauri/src/db/pool.rs`

## Goal

Replace SQLite with a local Docker-hosted PostgreSQL 16 instance, establish a users-own-everything relational schema, eliminate all non-DB persistence (localStorage/sessionStorage/IndexedDB are out), and gate app render on a branded loading screen that narrates the initial DB fetch.

## Motivation

1. **Relational correctness.** The SQLite schema grew ad-hoc; users don't fully own their collections (e.g., terminal sessions, settings, attachments). Postgres lets us express foreign keys, constraints, and CHECK invariants properly.
2. **Single source of truth.** Today Sofi splits state between SQLite, localStorage (`sofi:theme`, `sofi_token`), and would grow to include a per-task file folder if we didn't pivot. The DB-only rule (see `feedback_data_in_db_only.md`) means one place to back up, wipe, or inspect.
3. **Future-proofing.** Attachments, agent sessions, per-user preferences, and (later) a local MCP server all benefit from a real relational store with proper types (UUID, TIMESTAMPTZ, OID, JSONB).

## Non-Goals (explicitly deferred)

- Hosted Postgres (Supabase/Neon) — evaluated and declined 2026-04-17. Local Docker only.
- Embedded Postgres binary shipped with Sofi — evaluated and declined.
- Local MCP server exposing task context to agents — evaluated and deferred for later initiative.
- Binary attachment injection into agent context — at MVP, agent only receives text + link attachments. Images/PDFs/docs sit in DB, visible in Sofi UI only.
- Offline mode / write queue / local mirror — Sofi requires the Docker Postgres container to be running. `docker-compose up -d` is a prerequisite for app startup.
- Row-Level Security (RLS) — single-user dev setup, skip for now. Add when multi-user cloud comes later.
- Data preservation from the existing SQLite DB — greenfield migration; drop `sofi.db`, start fresh.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Sofi desktop app (Tauri 2.0)                                │
│                                                              │
│  React 19 webview                                            │
│    ├── LoadingGate — renders until session+settings fetched  │
│    ├── ThemeProvider — reads theme from user_settings row    │
│    └── Feature views (Kanban, Terminal, Git, Settings)       │
│                                                              │
│  Rust backend                                                │
│    ├── sqlx (postgres feature) ──► DATABASE_URL from .env    │
│    ├── auth: Argon2 + OS keychain via `keyring` crate      │
│    └── Tauri commands (unchanged surface, Postgres backend)  │
└──────────────┬───────────────────────────────────────────────┘
               │ postgres://sofi:sofi@localhost:5432/sofi
               ▼
┌──────────────────────────┐        ┌──────────────────────────┐
│  Docker: postgres:16     │◄───────│  Docker: adminer:4       │
│  port 5432, volume-backed│  peers │  port 8080, dev UI       │
└──────────────────────────┘        └──────────────────────────┘
```

The Tauri app talks to Postgres directly over the local socket. Adminer is a dev convenience on `localhost:8080` for manual inspection; not used by the app itself.

## Infrastructure

### `docker-compose.yml` (repo root)

```yaml
services:
  postgres:
    image: postgres:16
    container_name: sofi-postgres
    environment:
      POSTGRES_DB: sofi
      POSTGRES_USER: sofi
      POSTGRES_PASSWORD: sofi
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sofi -d sofi"]
      interval: 5s
      timeout: 3s
      retries: 10

  adminer:
    image: adminer:4
    container_name: sofi-adminer
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

### `.env` (repo root, gitignored)

```
DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi
```

Loaded by the Rust backend via `dotenvy` at startup. For dev only; credentials are local-only and not a security concern in MVP.

### Dev workflow

1. `docker-compose up -d` (once per dev session)
2. `pnpm tauri dev` (as before)
3. Optional: visit `http://localhost:8080` → login (System: PostgreSQL, Server: `postgres`, Username: `sofi`, Password: `sofi`, Database: `sofi`) for manual DB inspection

## Schema

All timestamps are `TIMESTAMPTZ DEFAULT now()`. All primary keys are `UUID DEFAULT gen_random_uuid()` (requires `CREATE EXTENSION pgcrypto`, standard in Postgres 16).

### `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Preserves the existing Argon2 password_hash column.

### `user_settings` — migrates localStorage into the DB

```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  default_agent_type TEXT NOT NULL DEFAULT 'claude-code',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Auto-created on user signup via a trigger that inserts a defaults row keyed to the new user's `id`.

### `boards`, `columns`, `tasks`

Same shape as today, converted to Postgres types.

```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  repo_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_boards_user_id ON boards(user_id);

CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_done_column BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_columns_board_id ON columns(board_id);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  agent_type TEXT,
  agent_name TEXT,
  agent_session_id TEXT,       -- NEW: stable UUID for `claude --resume` across restarts
  terminal_session_id TEXT,    -- transient PTY handle, cleared on exit
  branch_name TEXT,
  worktree_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  pr_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_board_id ON tasks(board_id);
```

### `task_attachments` — one table, three kinds, CHECK-enforced shape

```sql
CREATE EXTENSION IF NOT EXISTS lo;  -- provides lo_manage trigger function

CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('link','text','file')),
  title TEXT NOT NULL,
  url TEXT,                    -- required when kind = 'link'
  content TEXT,                -- required when kind = 'text'
  large_object_oid OID,        -- required when kind = 'file'
  content_type TEXT,           -- required when kind = 'file' (MIME)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'link' AND url IS NOT NULL) OR
    (kind = 'text' AND content IS NOT NULL) OR
    (kind = 'file' AND large_object_oid IS NOT NULL AND content_type IS NOT NULL)
  )
);
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);

CREATE TRIGGER task_attachments_lo_cleanup
  BEFORE UPDATE OR DELETE ON task_attachments
  FOR EACH ROW EXECUTE FUNCTION lo_manage(large_object_oid);
```

The `lo_manage` trigger (from the built-in `lo` extension) guarantees the large object is unlinked when the row is deleted or the OID is replaced — no orphaned blobs.

### Auto-create user_settings trigger

```sql
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_default_settings
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();
```

Every new user automatically gets a defaults row. No nullable paths on the frontend.

## Code-Side Changes

### `Cargo.toml` (src-tauri/)

Swap sqlx features:

```diff
-sqlx = { version = "...", features = ["runtime-tokio", "sqlite", "uuid", "chrono"] }
+sqlx = { version = "...", features = ["runtime-tokio", "postgres", "uuid", "chrono"] }
+dotenvy = "0.15"
+keyring = "3"  # for auth token storage in OS keychain
```

The `keyring` crate wraps macOS Keychain, Windows Credential Manager, and Linux Secret Service with a unified API. Lightweight and idiomatic for a single session token. Tauri's `plugin-stronghold` was considered and rejected as overkill (designed for multi-secret encrypted wallets).

### `src-tauri/migrations/`

New folder at `src-tauri/migrations/`, one migration file per concern (sqlx convention `NNN_description.sql`):

- `001_extensions.sql` — `CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS lo;`
- `002_users.sql`
- `003_user_settings.sql`
- `004_boards.sql`
- `005_columns.sql`
- `006_tasks.sql`
- `007_task_attachments.sql`
- `008_triggers.sql` (user_settings auto-insert + lo_manage on attachments)

Applied on app startup via `sqlx::migrate!("./migrations").run(&pool).await`. Idempotent — safe to re-run.

### `src-tauri/src/db/pool.rs`

Replace SQLite pool with Postgres pool. Outline:

```rust
use sqlx::postgres::{PgPool, PgPoolOptions};

pub async fn create_pool() -> Result<PgPool, sqlx::Error> {
    dotenvy::dotenv().ok();
    let url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}
```

Delete the inline SQLite schema creation in the current `pool.rs`. All schema lives in migration files now.

### `src-tauri/src/db/queries/*.rs`

Convert SQL dialect where needed — most queries carry over cleanly. Main differences:
- `?` placeholders → `$1`, `$2`, ... (Postgres uses dollar-indexed params)
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `RETURNING *` works in both dialects (already Postgres-compatible)
- `COALESCE(?, col)` pattern carries over unchanged

### `src-tauri/src/commands/attachments.rs` (new)

Three Tauri commands wrap large-object I/O via raw SQL:

```rust
#[tauri::command]
pub async fn create_file_attachment(
    pool: State<'_, PgPool>,
    task_id: Uuid,
    title: String,
    content_type: String,
    bytes: Vec<u8>,
) -> Result<Attachment, Error> {
    let mut tx = pool.begin().await?;
    let oid: Oid = sqlx::query_scalar("SELECT lo_create(0)").fetch_one(&mut *tx).await?;
    // Open, write, close via lo_open, lowrite, lo_close (one roundtrip chunk for MVP).
    // ...
    let row = sqlx::query_as!(Attachment, "INSERT INTO task_attachments ... RETURNING *")
        .fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok(row)
}

#[tauri::command]
pub async fn read_file_attachment(pool: State<'_, PgPool>, attachment_id: Uuid) -> Result<Vec<u8>, Error>;

#[tauri::command]
pub async fn delete_attachment(pool: State<'_, PgPool>, attachment_id: Uuid) -> Result<(), Error>;
```

Link and text attachments use simpler non-LO queries; one `create_attachment` command with a discriminated union input is the cleanest frontend-facing shape.

### Auth token storage migration

`src/features/auth/queries/mutations.ts` currently does:
```ts
localStorage.setItem(STORAGE_KEY, response.token);
```

Replace with Tauri commands backed by the `keyring` Rust crate (OS keychain) on the backend side:

- `invoke("auth_store_token", { token })` → writes to OS keychain
- `invoke("auth_get_token")` → reads from OS keychain (returns null if absent)
- `invoke("auth_clear_token")` → deletes from OS keychain

The `STORAGE_KEY` constant and all `localStorage.*Item` calls in `src/features/auth/` and `src/main.tsx:15` are removed.

The OS keychain is a credential vault and explicitly allowed under the DB-only rule — see `feedback_data_in_db_only.md`.

### Theme storage migration

`src/components/theme/theme-provider.tsx` currently reads/writes `localStorage["sofi:theme"]`. After migration:

- On mount, `useTheme()` reads `user_settings.theme` via a TanStack Query (`userSettingsQueryOptions`)
- On change, it calls `useMutation({ mutationFn: updateUserSettings })` to persist to DB
- The `storageKey` prop is removed; the provider no longer touches browser storage

### FOUC script removed

`index.html:14-30` contains the inline `<script>` that pre-applies `.light` based on localStorage. Delete it entirely. FOUC is replaced by the loading screen (below).

## Loading Screen Gate

A branded full-viewport loading screen renders **before anything else** while initial DB fetches complete. No main-app content paints until all required data is loaded.

### Behavior

1. App boot → render `<LoadingGate>` immediately. Always dark, Sofi brand palette (the loading screen itself is not themed — it's identity branding).
2. `LoadingGate` performs a sequential chain of queries, narrating each step:
   - "Connecting to Sofi database…" (waits for Tauri DB pool init)
   - "Checking your session…" (reads auth token from keychain; if none, routes to `/login`)
   - "Loading your preferences…" (fetches `user_settings`)
   - "Applying theme…" (adds `.light` class if needed)
   - "Ready." (brief fade, then mount children)
3. Only after the chain completes does `<App>` mount with the correct theme already applied. No FOUC, no localStorage cache.

### Error states

If any step fails, the loading screen transitions to an error state with a "Retry" button and the specific error message. Failure cases:
- Postgres unreachable → "Can't reach the database. Did you run `docker-compose up`?"
- Migrations error → "Database schema update failed: {message}"
- Keychain unavailable → "Can't access secure storage. {OS-specific guidance}."

### Visual design

Per the locked Stitch-first workflow, the loading screen's visual design (layout, animation, typography) will be designed on Stitch before implementation. This spec defines only the behavior and the text content. Mock visual placeholder in code until Stitch design is pulled.

### Component placement

`src/components/boot/loading-gate.tsx` (new feature-adjacent component at the shell level). Wraps the current `<RouterProvider>` in `src/main.tsx`. Integrates with `ThemeProvider` so that by the time the router mounts, the theme class is already on `<html>` and preferences are in React Query cache.

## Migration Approach — Greenfield

1. Stop any running Sofi dev instance
2. Delete existing `sofi.db` SQLite file and its journal
3. `docker-compose up -d`
4. Start Sofi → auto-runs migrations → empty schema
5. Sign up fresh → `user_settings` auto-created via trigger → Sofi becomes usable

No data-preservation logic needed. The current SQLite DB is dev-only and can be thrown away.

## Testing Strategy

1. **Migration idempotency** — run `sqlx migrate run` twice; second run is a no-op
2. **Schema round-trip** — for each entity (user, settings, board, column, task, attachment), write a Rust integration test that creates + reads + updates + deletes via the public Tauri commands
3. **CHECK constraint coverage** — attempt to insert attachment rows violating each of the three kinds' CHECK branch; verify Postgres rejects
4. **LO cleanup** — create a file attachment, note the OID, delete the row, verify `SELECT * FROM pg_largeobject_metadata WHERE oid = <noted_oid>` returns no rows (trigger did its job)
5. **Auth flow** — sign up, receive token, app restart → token read from keychain, auto-login works
6. **Theme persistence** — change theme in Settings, restart Sofi → loading screen fetches DB, mounts app with correct theme
7. **Loading-gate cold start** — start Sofi with Postgres container stopped → loading gate shows friendly error with retry; start container; retry succeeds
8. **E2E** — existing `tests/e2e/theme.spec.ts` rewrites: remove `localStorage.setItem("sofi:theme", ...)` fixtures; instead, Playwright tests now stub the `user_settings` DB read via Tauri mocks and assert the loading gate resolves to the correct theme class

## Out of Scope (re-stated for the record)

- Hosted/cloud Postgres (Supabase/Neon)
- Embedded Postgres binary shipped inside Sofi
- MCP server for agent context
- Binary attachments (images/PDFs/docs) delivered to agent context
- Offline mode / local mirror / sync layer
- RLS policies
- Preserving existing SQLite data
- Cross-device sync

## Acceptance Criteria

- [ ] `docker-compose up -d` brings up Postgres + Adminer locally
- [ ] Sofi dev app starts, runs migrations, reaches login screen
- [ ] New user signup creates a `users` row + auto-creates a `user_settings` row
- [ ] No code in the repo uses `localStorage`, `sessionStorage`, or `IndexedDB` (grep clean except test fixtures that explicitly assert absence)
- [ ] Theme change in Settings persists to `user_settings.theme` row; Sofi restart preserves the theme
- [ ] Auth token lives in OS keychain; Sofi restart preserves the session
- [ ] LoadingGate renders before any main-app content; narrates each fetch step; transitions to error + retry if Postgres is unreachable
- [ ] Attachments table accepts valid link/text/file rows and rejects invalid ones via CHECK
- [ ] File attachment deletion leaves zero orphaned rows in `pg_largeobject_metadata`
- [ ] E2E theme tests updated to reflect the new storage model
- [ ] No FOUC — cold start shows loading screen, then correct theme, never the wrong theme briefly
