# Postgres Migration (Local Docker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SQLite with local Docker-hosted PostgreSQL 16, establish a users-own-everything relational schema, eliminate all non-DB persistence (localStorage/sessionStorage/IndexedDB), and gate app render on a branded `LoadingGate` component that narrates the initial DB fetch.

**Architecture:** `docker-compose.yml` at repo root spins up `postgres:16` + `adminer:4`. Rust backend (sqlx, `postgres` feature) connects via `DATABASE_URL` from `.env`. All schema lives in `src-tauri/migrations/*.sql` and is run via `sqlx::migrate!` at app startup. User preferences (theme, default agent) and session credentials move out of localStorage: theme → `user_settings` row in DB, auth token → OS keychain via the `keyring` crate. The React app mounts behind a `LoadingGate` that sequentially fetches session + settings + theme before rendering any feature views.

**Tech Stack:** PostgreSQL 16, Adminer 4, Docker Compose, sqlx 0.8 (postgres runtime), `keyring` crate 3.x for OS keychain, `dotenvy` 0.15 for env loading, Tauri 2.0, React 19, TanStack Query 5.

**Spec:** `docs/superpowers/specs/2026-04-17-postgres-migration-design.md`

---

## File Structure Map

**Infra:**
- Create: `docker-compose.yml`
- Create: `.env` (gitignored)
- Modify: `.gitignore` (add `.env`)

**Rust backend:**
- Modify: `src-tauri/Cargo.toml` (swap sqlx feature, add keyring + dotenvy)
- Create: `src-tauri/migrations/001_extensions.sql`
- Create: `src-tauri/migrations/002_users_and_sessions.sql`
- Create: `src-tauri/migrations/003_user_settings.sql`
- Create: `src-tauri/migrations/004_boards.sql`
- Create: `src-tauri/migrations/005_columns.sql`
- Create: `src-tauri/migrations/006_tasks.sql`
- Create: `src-tauri/migrations/007_task_attachments.sql`
- Create: `src-tauri/migrations/008_triggers.sql`
- Rewrite: `src-tauri/src/db/pool.rs` (PgPool + migrate!)
- Rewrite: `src-tauri/src/db/queries/users.rs` (Postgres dialect)
- Rewrite: `src-tauri/src/db/queries/boards.rs` (Postgres dialect)
- Rewrite: `src-tauri/src/db/queries/tasks.rs` (Postgres dialect, add agent_session_id support)
- Create: `src-tauri/src/db/queries/settings.rs` (new — user_settings reads/writes)
- Create: `src-tauri/src/db/queries/attachments.rs` (new — link/text/file + pg_largeobject)
- Create: `src-tauri/src/commands/settings.rs` (new Tauri commands)
- Create: `src-tauri/src/commands/attachments.rs` (new Tauri commands)
- Create: `src-tauri/src/commands/auth_token.rs` (new — keychain token store)
- Modify: `src-tauri/src/commands/auth.rs` (PgPool arg instead of SqlitePool)
- Modify: `src-tauri/src/commands/mod.rs` (export new modules)
- Modify: `src-tauri/src/lib.rs` (wire PgPool, register new commands)
- Modify: `src-tauri/src/models/user.rs` (UserSettings gains default_agent_type column)
- Create: `src-tauri/src/models/attachment.rs` (new)
- Create: `src-tauri/src/models/mod.rs` (add attachment module export)

**Frontend:**
- Rewrite: `src/features/auth/queries/mutations.ts` (keychain instead of localStorage)
- Rewrite: `src/features/auth/queries/options.ts` (keychain read)
- Modify: `src/main.tsx` (remove localStorage logout; wrap with LoadingGate)
- Modify: `index.html` (delete FOUC `<script>` block)
- Rewrite: `src/components/theme/theme-provider.tsx` (DB-backed, TanStack Query)
- Create: `src/features/settings/queries/keys.ts`
- Create: `src/features/settings/queries/options.ts`
- Create: `src/features/settings/queries/mutations.ts`
- Create: `src/features/settings/types.ts`
- Create: `src/components/boot/loading-gate.tsx`
- Create: `src/lib/auth-token.ts` (TS helper wrapping the three keychain invokes)
- Modify: `src/features/settings/components/settings-page.tsx` (drop `useTheme` from `ThemeProvider` import — still works)

**Tests:**
- Create: `src-tauri/tests/db_schema.rs` (schema + triggers integration tests)
- Create: `src-tauri/tests/db_attachments.rs` (CHECK constraints + LO cleanup)
- Rewrite: `tests/e2e/theme.spec.ts` (DB-backed theme via Tauri mock)

---

## Test Harness Note

All Rust integration tests use the `#[sqlx::test]` macro which:
1. Connects to `DATABASE_URL`
2. Creates a fresh template DB per test (the `sofi` user is a superuser by default in `postgres:16`)
3. Runs `./migrations` automatically against it
4. Provides the connected `PgPool` as the test argument
5. Drops the DB after the test

This means `DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi` in `.env` is sufficient — sqlx handles test DB lifecycle itself. Tests can run in parallel without interference.

---

### Task 1: Docker Compose infra + .env

**Files:**
- Create: `docker-compose.yml`
- Create: `.env`
- Modify: `.gitignore`

- [ ] **Step 1: Create `docker-compose.yml` at repo root**

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

- [ ] **Step 2: Create `.env` at repo root**

```
DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi
```

- [ ] **Step 3: Add `.env` to `.gitignore`**

Append to existing `.gitignore`:
```
# Env
.env
.env.local
```

- [ ] **Step 4: Start containers and verify Postgres is healthy**

Run: `docker compose up -d && docker compose ps`
Expected: both containers `running`, `sofi-postgres` marked `healthy` (may take 10–20s).

- [ ] **Step 5: Verify connection**

Run:
```bash
docker exec sofi-postgres psql -U sofi -d sofi -c "SELECT version();"
```
Expected: prints the Postgres 16.x version string, exits 0.

- [ ] **Step 6: Verify Adminer UI**

Open http://localhost:8080 in a browser.
Expected: Adminer login form visible. (Don't need to actually log in — just confirm HTTP response.)

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example .gitignore
git commit -m "feat(db): add local Docker Postgres + Adminer infrastructure"
```
(Note: commit `.env.example` with the template value, NOT the real `.env`. Create `.env.example` with the same `DATABASE_URL` line if not already present. Real `.env` stays gitignored.)

---

### Task 2: Cargo.toml — swap to Postgres, add dotenvy + keyring

**Files:**
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Edit `src-tauri/Cargo.toml`**

Replace the `sqlx` line and add two new deps. Before:
```toml
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "uuid", "chrono"] }
```
After:
```toml
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono", "migrate"] }
dotenvy = "0.15"
keyring = "3"
```

- [ ] **Step 2: Verify Cargo resolves the new dependencies**

Run (from `src-tauri/`): `cargo check 2>&1 | tail -20`
Expected: compilation **fails** with errors like "cannot find type `SqlitePool` in module `sqlx`" because `src-tauri/src/db/pool.rs` still imports SQLite types. Those errors will be fixed in Task 3. The resolver itself must succeed — no "failed to resolve dependency" messages.

- [ ] **Step 3: Commit**

```bash
cd src-tauri && git add Cargo.toml Cargo.lock && cd .. && git commit -m "chore(rust): swap sqlx to postgres feature, add dotenvy + keyring"
```

---

### Task 3: Migrations scaffold + extensions + pool rewrite

**Files:**
- Create: `src-tauri/migrations/001_extensions.sql`
- Rewrite: `src-tauri/src/db/pool.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create migrations dir and first migration file**

Create directory `src-tauri/migrations/` if it doesn't exist. Create `src-tauri/migrations/001_extensions.sql`:

```sql
-- Enables gen_random_uuid() for UUID primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enables the lo_manage trigger function for automatic
-- pg_largeobject cleanup when OID-bearing rows are deleted.
CREATE EXTENSION IF NOT EXISTS lo;
```

- [ ] **Step 2: Rewrite `src-tauri/src/db/pool.rs`**

Full file replacement:

```rust
use sqlx::postgres::{PgPool, PgPoolOptions};

pub async fn create_pool() -> Result<PgPool, sqlx::Error> {
    dotenvy::dotenv().ok();
    let url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}
```

The old `run_migrations` function that contained inline SQL is fully removed — all schema now lives in `./migrations/*.sql`.

- [ ] **Step 3: Update `src-tauri/src/lib.rs` to use the new pool signature**

Replace the current setup block. Before:
```rust
            // Database
            let db_path = get_db_path(app);
            let db_url = format!("sqlite:{}", db_path.display());
            let pool = tauri::async_runtime::block_on(async {
                create_pool(&db_url)
                    .await
                    .expect("Failed to create database pool")
            });
            app.manage(pool);
```
After:
```rust
            // Database
            let pool = tauri::async_runtime::block_on(async {
                create_pool()
                    .await
                    .expect("Failed to create database pool")
            });
            app.manage(pool);
```

Also delete the `get_db_path` helper and the `std::path::PathBuf` import (no longer used), and remove `use db::pool::create_pool;` — wait, keep that import. Only remove the `use tauri::Manager;` line if `app.path()` is no longer called elsewhere. Grep to verify.

- [ ] **Step 4: Verify compile**

Run (from `src-tauri/`): `cargo check 2>&1 | tail -20`
Expected: likely still fails because `commands/auth.rs`, `commands/kanban.rs`, and `db/queries/*.rs` still reference `SqlitePool`. Those will be fixed in subsequent tasks. We accept these errors here — Task 3 only needs `pool.rs` + `lib.rs` clean.
To sanity-check that pool.rs itself is fine, run: `cargo check --lib 2>&1 | grep 'db/pool.rs'`
Expected: no errors on that file path.

- [ ] **Step 5: Write integration test for migration runner**

Create `src-tauri/tests/db_schema.rs`:

```rust
use sqlx::PgPool;

#[sqlx::test]
async fn extensions_installed(pool: PgPool) -> sqlx::Result<()> {
    let pgcrypto: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto')"
    )
    .fetch_one(&pool)
    .await?;
    assert!(pgcrypto, "pgcrypto extension must be installed");

    let lo: bool = sqlx::query_scalar(
        "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'lo')"
    )
    .fetch_one(&pool)
    .await?;
    assert!(lo, "lo extension must be installed");
    Ok(())
}
```

- [ ] **Step 6: Run the test**

Run (from `src-tauri/`, with Docker Postgres running):
```bash
DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi cargo test --test db_schema 2>&1 | tail -15
```
Expected: `test extensions_installed ... ok`. If it fails, verify the Docker container is running and DATABASE_URL is correct.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/migrations src-tauri/src/db/pool.rs src-tauri/src/lib.rs src-tauri/tests/db_schema.rs
git commit -m "feat(db): scaffold migrations + swap pool to Postgres"
```

---

### Task 4: Users + sessions tables + query adapter

**Files:**
- Create: `src-tauri/migrations/002_users_and_sessions.sql`
- Rewrite: `src-tauri/src/db/queries/users.rs`
- Modify: `src-tauri/src/models/user.rs`
- Modify: `src-tauri/src/commands/auth.rs`
- Modify: `src-tauri/tests/db_schema.rs`

- [ ] **Step 1: Create `src-tauri/migrations/002_users_and_sessions.sql`**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

- [ ] **Step 2: Write failing test for users CRUD**

Append to `src-tauri/tests/db_schema.rs`:

```rust
#[sqlx::test]
async fn users_insert_and_fetch(pool: PgPool) -> sqlx::Result<()> {
    let row = sqlx::query!(
        r#"INSERT INTO users (username, email, password_hash)
           VALUES ($1, $2, $3)
           RETURNING id, username, email"#,
        "alice",
        "alice@example.com",
        "argon2-hash"
    )
    .fetch_one(&pool)
    .await?;

    assert_eq!(row.username, "alice");
    assert_eq!(row.email, "alice@example.com");

    let dup = sqlx::query!(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
        "alice",
        "alice2@example.com",
        "h"
    )
    .execute(&pool)
    .await;

    assert!(dup.is_err(), "duplicate username must be rejected by UNIQUE constraint");
    Ok(())
}

#[sqlx::test]
async fn sessions_cascade_on_user_delete(pool: PgPool) -> sqlx::Result<()> {
    let user_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        "bob", "bob@x.com", "h"
    ).fetch_one(&pool).await?;

    sqlx::query!(
        "INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, now() + interval '1 day')",
        user_id, "tok-1"
    ).execute(&pool).await?;

    sqlx::query!("DELETE FROM users WHERE id = $1", user_id).execute(&pool).await?;

    let remaining: i64 = sqlx::query_scalar!(
        "SELECT count(*) FROM sessions WHERE user_id = $1", user_id
    ).fetch_one(&pool).await?.unwrap_or(0);

    assert_eq!(remaining, 0, "sessions must be deleted when user is deleted");
    Ok(())
}
```

- [ ] **Step 3: Run the tests — they must pass**

Run: `DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi cargo test --test db_schema 2>&1 | tail -15`
Expected: all three tests pass (`ok`).

- [ ] **Step 4: Update `src-tauri/src/models/user.rs` types**

Replace field types for Postgres compatibility. Full file:

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub display_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Session {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserSettings {
    pub user_id: Uuid,
    pub theme: String,
    pub default_agent_type: String,
    pub default_shell: String,
    pub font_size: i32,
    pub font_family: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterInput {
    pub username: String,
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: User,
    pub token: String,
}
```

UUID + DateTime<Utc> serialize as strings in JSON via serde, so the TS side keeps treating IDs as strings without change.

- [ ] **Step 5: Rewrite `src-tauri/src/db/queries/users.rs` for Postgres**

Full file replacement:

```rust
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::user::{Session, User};

pub async fn create_user(
    pool: &PgPool,
    username: &str,
    email: &str,
    password_hash: &str,
    display_name: Option<&str>,
) -> Result<User, sqlx::Error> {
    sqlx::query_as::<_, User>(
        "INSERT INTO users (username, email, password_hash, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *",
    )
    .bind(username)
    .bind(email)
    .bind(password_hash)
    .bind(display_name)
    .fetch_one(pool)
    .await
}

pub async fn find_user_by_username(
    pool: &PgPool,
    username: &str,
) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE username = $1")
        .bind(username)
        .fetch_optional(pool)
        .await
}

pub async fn find_user_by_id(pool: &PgPool, id: Uuid) -> Result<Option<User>, sqlx::Error> {
    sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(id)
        .fetch_optional(pool)
        .await
}

pub async fn create_session(
    pool: &PgPool,
    user_id: Uuid,
    token: &str,
    expires_at: DateTime<Utc>,
) -> Result<Session, sqlx::Error> {
    sqlx::query_as::<_, Session>(
        "INSERT INTO sessions (user_id, token, expires_at)
         VALUES ($1, $2, $3)
         RETURNING *",
    )
    .bind(user_id)
    .bind(token)
    .bind(expires_at)
    .fetch_one(pool)
    .await
}

pub async fn find_session_by_token(
    pool: &PgPool,
    token: &str,
) -> Result<Option<Session>, sqlx::Error> {
    sqlx::query_as::<_, Session>(
        "SELECT * FROM sessions WHERE token = $1 AND expires_at > now()",
    )
    .bind(token)
    .fetch_optional(pool)
    .await
}
```

`create_user_settings` is removed — a trigger (Task 5 step 4 + Task 10) handles that automatically.
`delete_expired_sessions` is removed if unused. Grep with `rg 'delete_expired_sessions' src-tauri/src` to confirm. If referenced, leave a thin stub port.

- [ ] **Step 6: Update `src-tauri/src/commands/auth.rs` to use the new signatures**

Replace the file with (same logic, new types and no manual ID/settings creation):

```rust
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use sqlx::PgPool;
use tauri::State;
use uuid::Uuid;

use crate::db::queries::users;
use crate::error::AppError;
use crate::models::user::{AuthResponse, LoginInput, RegisterInput};

#[tauri::command]
pub async fn register(
    pool: State<'_, PgPool>,
    input: RegisterInput,
) -> Result<AuthResponse, AppError> {
    if input.username.len() < 3 {
        return Err(AppError::Validation(
            "Username must be at least 3 characters".into(),
        ));
    }
    if input.password.len() < 6 {
        return Err(AppError::Validation(
            "Password must be at least 6 characters".into(),
        ));
    }

    if users::find_user_by_username(&pool, &input.username)
        .await?
        .is_some()
    {
        return Err(AppError::Validation("Username already taken".into()));
    }

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(input.password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Failed to hash password: {e}")))?
        .to_string();

    let user = users::create_user(
        &pool,
        &input.username,
        &input.email,
        &password_hash,
        input.display_name.as_deref(),
    )
    .await?;

    // user_settings is auto-created by trigger (see migration 008)

    let token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(30);

    users::create_session(&pool, user.id, &token, expires_at).await?;

    Ok(AuthResponse { user, token })
}

#[tauri::command]
pub async fn login(
    pool: State<'_, PgPool>,
    input: LoginInput,
) -> Result<AuthResponse, AppError> {
    let user = users::find_user_by_username(&pool, &input.username)
        .await?
        .ok_or_else(|| AppError::Auth("Invalid username or password".into()))?;

    let parsed_hash = PasswordHash::new(&user.password_hash)
        .map_err(|e| AppError::Internal(format!("Failed to parse hash: {e}")))?;

    Argon2::default()
        .verify_password(input.password.as_bytes(), &parsed_hash)
        .map_err(|_| AppError::Auth("Invalid username or password".into()))?;

    let token = Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::days(30);

    users::create_session(&pool, user.id, &token, expires_at).await?;

    Ok(AuthResponse { user, token })
}

#[tauri::command]
pub async fn check_session(
    pool: State<'_, PgPool>,
    token: String,
) -> Result<AuthResponse, AppError> {
    let session = users::find_session_by_token(&pool, &token)
        .await?
        .ok_or_else(|| AppError::Auth("Session expired or invalid".into()))?;

    let user = users::find_user_by_id(&pool, session.user_id)
        .await?
        .ok_or_else(|| AppError::Auth("User not found".into()))?;

    Ok(AuthResponse { user, token })
}
```

- [ ] **Step 7: Verify compile**

Run: `cargo check 2>&1 | tail -30`
Expected: errors remain in `commands/kanban.rs` and `db/queries/boards.rs` / `tasks.rs` (still using SqlitePool) — those are fixed in Task 6 & 7. The auth file itself must be clean.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/migrations src-tauri/src/models src-tauri/src/db/queries/users.rs src-tauri/src/commands/auth.rs src-tauri/tests/db_schema.rs
git commit -m "feat(db): migrate users + sessions to Postgres schema"
```

---

### Task 5: user_settings migration + auto-create trigger + queries/commands

**Files:**
- Create: `src-tauri/migrations/003_user_settings.sql`
- Create: `src-tauri/migrations/008_triggers.sql`
- Create: `src-tauri/src/db/queries/settings.rs`
- Create: `src-tauri/src/commands/settings.rs`
- Modify: `src-tauri/src/db/queries/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Create `src-tauri/migrations/003_user_settings.sql`**

```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    default_agent_type TEXT NOT NULL DEFAULT 'claude-code',
    default_shell TEXT NOT NULL DEFAULT '/bin/zsh',
    font_size INTEGER NOT NULL DEFAULT 14,
    font_family TEXT NOT NULL DEFAULT 'JetBrains Mono',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Create `src-tauri/migrations/008_triggers.sql` (user_settings trigger only for now)**

The `task_attachments_lo_cleanup` trigger cannot be added until migration 007 creates the `task_attachments` table. Task 8 will append that trigger to this same file. For now, include only:

```sql
-- Auto-create a user_settings row when a new user is inserted.
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_create_default_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();
```

Migrations run in lexical order (001 → 008), so this file will execute after all table creations from Tasks 4, 6, 7, 8.

- [ ] **Step 3: Write failing test for auto-create trigger**

Append to `src-tauri/tests/db_schema.rs`:

```rust
#[sqlx::test]
async fn user_insert_auto_creates_settings(pool: PgPool) -> sqlx::Result<()> {
    let user_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        "carol", "carol@x.com", "h"
    ).fetch_one(&pool).await?;

    let row = sqlx::query!(
        "SELECT theme, default_agent_type, default_shell FROM user_settings WHERE user_id = $1",
        user_id
    )
    .fetch_optional(&pool)
    .await?;

    let row = row.expect("user_settings row must be auto-created by trigger");
    assert_eq!(row.theme, "system");
    assert_eq!(row.default_agent_type, "claude-code");
    assert_eq!(row.default_shell, "/bin/zsh");
    Ok(())
}

#[sqlx::test]
async fn user_settings_theme_check_constraint(pool: PgPool) -> sqlx::Result<()> {
    let user_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        "dan", "dan@x.com", "h"
    ).fetch_one(&pool).await?;

    let bad = sqlx::query!(
        "UPDATE user_settings SET theme = 'purple' WHERE user_id = $1",
        user_id
    )
    .execute(&pool)
    .await;

    assert!(bad.is_err(), "CHECK constraint must reject invalid theme value");
    Ok(())
}
```

- [ ] **Step 4: Run the tests — they must pass**

Run: `DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi cargo test --test db_schema 2>&1 | tail -20`
Expected: both new tests pass (`user_insert_auto_creates_settings`, `user_settings_theme_check_constraint`).

- [ ] **Step 5: Create `src-tauri/src/db/queries/settings.rs`**

```rust
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::user::UserSettings;

pub async fn get_user_settings(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<UserSettings, sqlx::Error> {
    sqlx::query_as::<_, UserSettings>(
        "SELECT * FROM user_settings WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
}

pub async fn update_user_settings(
    pool: &PgPool,
    user_id: Uuid,
    theme: Option<&str>,
    default_agent_type: Option<&str>,
    default_shell: Option<&str>,
    font_size: Option<i32>,
    font_family: Option<&str>,
) -> Result<UserSettings, sqlx::Error> {
    sqlx::query_as::<_, UserSettings>(
        "UPDATE user_settings SET
            theme = COALESCE($2, theme),
            default_agent_type = COALESCE($3, default_agent_type),
            default_shell = COALESCE($4, default_shell),
            font_size = COALESCE($5, font_size),
            font_family = COALESCE($6, font_family),
            updated_at = now()
         WHERE user_id = $1
         RETURNING *",
    )
    .bind(user_id)
    .bind(theme)
    .bind(default_agent_type)
    .bind(default_shell)
    .bind(font_size)
    .bind(font_family)
    .fetch_one(pool)
    .await
}
```

- [ ] **Step 6: Export the new module from `src-tauri/src/db/queries/mod.rs`**

Append the existing content with:
```rust
pub mod settings;
```

- [ ] **Step 7: Create `src-tauri/src/commands/settings.rs`**

```rust
use sqlx::PgPool;
use tauri::State;
use uuid::Uuid;

use crate::db::queries::settings;
use crate::error::AppError;
use crate::models::user::UserSettings;

#[derive(Debug, serde::Deserialize)]
pub struct UpdateUserSettingsInput {
    pub theme: Option<String>,
    pub default_agent_type: Option<String>,
    pub default_shell: Option<String>,
    pub font_size: Option<i32>,
    pub font_family: Option<String>,
}

#[tauri::command]
pub async fn get_user_settings(
    pool: State<'_, PgPool>,
    user_id: Uuid,
) -> Result<UserSettings, AppError> {
    settings::get_user_settings(&pool, user_id)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn update_user_settings(
    pool: State<'_, PgPool>,
    user_id: Uuid,
    input: UpdateUserSettingsInput,
) -> Result<UserSettings, AppError> {
    settings::update_user_settings(
        &pool,
        user_id,
        input.theme.as_deref(),
        input.default_agent_type.as_deref(),
        input.default_shell.as_deref(),
        input.font_size,
        input.font_family.as_deref(),
    )
    .await
    .map_err(AppError::from)
}
```

- [ ] **Step 8: Export the new commands module**

Edit `src-tauri/src/commands/mod.rs` — append:
```rust
pub mod settings;
```

- [ ] **Step 9: Register commands in `lib.rs` invoke_handler**

Add to the `tauri::generate_handler!` list (after the `Agents` block):
```rust
            // Settings
            commands::settings::get_user_settings,
            commands::settings::update_user_settings,
```

- [ ] **Step 10: Commit**

```bash
git add src-tauri/migrations src-tauri/src/db/queries src-tauri/src/commands src-tauri/src/lib.rs src-tauri/tests/db_schema.rs
git commit -m "feat(db): add user_settings table + auto-create trigger + settings commands"
```

---

### Task 6: Boards migration + query adapter

**Files:**
- Create: `src-tauri/migrations/004_boards.sql`
- Rewrite: `src-tauri/src/db/queries/boards.rs`
- Modify: `src-tauri/src/models/board.rs` (UUID types)

- [ ] **Step 1: Create `src-tauri/migrations/004_boards.sql`**

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
```

- [ ] **Step 2: Update `src-tauri/src/models/board.rs`**

Swap `id`, `user_id` field types from `String` to `Uuid`. Also swap `created_at`, `updated_at` from `String` to `DateTime<Utc>`. Check the Column model inside too (I know it exists from git status mentions).

Read the existing file; the exact transformation is field-level. After the changes:

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Board {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub repo_path: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Column {
    pub id: Uuid,
    pub board_id: Uuid,
    pub name: String,
    pub color: Option<String>,
    pub sort_order: i32,
    pub is_done_column: bool,
}

#[derive(Debug, Deserialize)]
pub struct CreateBoardInput {
    pub name: String,
    pub description: Option<String>,
    pub repo_path: Option<String>,
}
```

- [ ] **Step 3: Rewrite `src-tauri/src/db/queries/boards.rs` for Postgres**

Read the existing file first. Apply the exact conversion pattern from Task 4 Step 5 (users.rs rewrite): `SqlitePool` → `PgPool`, `?` placeholders → `$1`, `$2`, `$3`, etc., `String` id args → `Uuid`, SQLite `datetime('now')` → Postgres `now()`. Every function's signature changes from `(pool: &SqlitePool, id: &str, ...)` to `(pool: &PgPool, id: Uuid, ...)`. INSERTs drop the explicit `id` column (DB default generates via `gen_random_uuid()`). The new file compiles cleanly and mirrors the users.rs structure.

- [ ] **Step 4: Write integration test for boards**

Append to `src-tauri/tests/db_schema.rs`:

```rust
#[sqlx::test]
async fn boards_insert_and_cascade(pool: PgPool) -> sqlx::Result<()> {
    let user_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        "eve", "eve@x.com", "h"
    ).fetch_one(&pool).await?;

    let board_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id",
        user_id, "My Board"
    ).fetch_one(&pool).await?;

    sqlx::query!("DELETE FROM users WHERE id = $1", user_id).execute(&pool).await?;

    let remaining: i64 = sqlx::query_scalar!(
        "SELECT count(*) FROM boards WHERE id = $1", board_id
    ).fetch_one(&pool).await?.unwrap_or(0);

    assert_eq!(remaining, 0, "board must cascade-delete when its user is deleted");
    Ok(())
}
```

- [ ] **Step 5: Run test**

Run: `DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi cargo test --test db_schema 2>&1 | tail -15`
Expected: all schema tests pass.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/migrations/004_boards.sql src-tauri/src/models/board.rs src-tauri/src/db/queries/boards.rs src-tauri/tests/db_schema.rs
git commit -m "feat(db): migrate boards table to Postgres"
```

---

### Task 7: Columns + tasks migrations + query adapters

**Files:**
- Create: `src-tauri/migrations/005_columns.sql`
- Create: `src-tauri/migrations/006_tasks.sql`
- Rewrite: `src-tauri/src/db/queries/tasks.rs`
- Modify: `src-tauri/src/models/task.rs` (UUID + new `agent_session_id` field)
- Modify: `src-tauri/src/commands/kanban.rs` (PgPool signatures + `agent_session_id` on UpdateTaskInput)

- [ ] **Step 1: Create `src-tauri/migrations/005_columns.sql`**

```sql
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_done_column BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_columns_board_id ON columns(board_id);
```

- [ ] **Step 2: Create `src-tauri/migrations/006_tasks.sql`**

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    agent_type TEXT,
    agent_name TEXT,
    agent_session_id TEXT,
    terminal_session_id TEXT,
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

- [ ] **Step 3: Update `src-tauri/src/models/task.rs`**

Add `agent_session_id` field and swap ID types. Full file:

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: Uuid,
    pub column_id: Uuid,
    pub board_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
    pub agent_session_id: Option<String>,
    pub terminal_session_id: Option<String>,
    pub branch_name: Option<String>,
    pub worktree_path: Option<String>,
    pub status: String,
    pub pr_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub column_id: Uuid,
    pub board_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub id: Uuid,
    pub column_id: Option<Uuid>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub status: Option<String>,
    pub agent_type: Option<String>,
    pub agent_name: Option<String>,
    pub agent_session_id: Option<String>,
    pub terminal_session_id: Option<String>,
    pub branch_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MoveTaskInput {
    pub task_id: Uuid,
    pub target_column_id: Uuid,
    pub sort_order: i32,
}
```

- [ ] **Step 4: Rewrite `src-tauri/src/db/queries/tasks.rs`**

Read the existing file first. Apply the same dialect conversion recipe as Task 4 Step 5 and Task 6 Step 3. Add `agent_session_id` to the `update_task` function signature + COALESCE list. Every function: `SqlitePool` → `PgPool`, `?` → `$N`, `&str` ids → `Uuid`, remove manual id minting (rely on `gen_random_uuid()` default), use `now()` not `datetime('now')`. Key pattern for `update_task`:

```rust
pub async fn update_task(
    pool: &PgPool,
    id: Uuid,
    column_id: Option<Uuid>,
    title: Option<&str>,
    description: Option<&str>,
    sort_order: Option<i32>,
    status: Option<&str>,
    agent_type: Option<&str>,
    agent_name: Option<&str>,
    agent_session_id: Option<&str>,
    terminal_session_id: Option<&str>,
    branch_name: Option<&str>,
) -> Result<Task, sqlx::Error> {
    sqlx::query_as::<_, Task>(
        "UPDATE tasks SET
            column_id = COALESCE($2, column_id),
            title = COALESCE($3, title),
            description = COALESCE($4, description),
            sort_order = COALESCE($5, sort_order),
            status = COALESCE($6, status),
            agent_type = COALESCE($7, agent_type),
            agent_name = COALESCE($8, agent_name),
            agent_session_id = COALESCE($9, agent_session_id),
            terminal_session_id = COALESCE($10, terminal_session_id),
            branch_name = COALESCE($11, branch_name),
            updated_at = now()
         WHERE id = $1
         RETURNING *",
    )
    .bind(id)
    .bind(column_id)
    .bind(title)
    .bind(description)
    .bind(sort_order)
    .bind(status)
    .bind(agent_type)
    .bind(agent_name)
    .bind(agent_session_id)
    .bind(terminal_session_id)
    .bind(branch_name)
    .fetch_one(pool)
    .await
}
```

Other functions (`create_task`, `list_tasks`, `move_task`, `delete_task`) get the same `SqlitePool` → `PgPool`, `?` → `$N`, `String` → `Uuid` treatment.

- [ ] **Step 5: Update `src-tauri/src/commands/kanban.rs`**

Read the existing file. Apply mechanical swaps:
- `State<'_, SqlitePool>` → `State<'_, PgPool>` on every command signature
- Pass `agent_session_id` from `UpdateTaskInput` through to `tasks::update_task`
- Remove any `uuid::Uuid::new_v4().to_string()` calls used to mint IDs for INSERTs — the DB generates UUIDs via the `gen_random_uuid()` column default; commands pass only meaningful fields and consume the `RETURNING *` row
- Adjust any `String` parameters that are now `Uuid` types to match the new query signatures
- Remove unused imports (`use sqlx::SqlitePool;` becomes `use sqlx::PgPool;`)

- [ ] **Step 6: Write integration test**

Append to `src-tauri/tests/db_schema.rs`:

```rust
#[sqlx::test]
async fn tasks_full_lifecycle(pool: PgPool) -> sqlx::Result<()> {
    let user_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        "frank", "f@x.com", "h"
    ).fetch_one(&pool).await?;
    let board_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id",
        user_id, "B"
    ).fetch_one(&pool).await?;
    let column_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO columns (board_id, name) VALUES ($1, $2) RETURNING id",
        board_id, "Backlog"
    ).fetch_one(&pool).await?;

    let task_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO tasks (column_id, board_id, title) VALUES ($1, $2, $3) RETURNING id",
        column_id, board_id, "Ship it"
    ).fetch_one(&pool).await?;

    // agent_session_id round-trip
    sqlx::query!(
        "UPDATE tasks SET agent_session_id = $2 WHERE id = $1",
        task_id, "sess-abc"
    ).execute(&pool).await?;

    let got: Option<String> = sqlx::query_scalar!(
        "SELECT agent_session_id FROM tasks WHERE id = $1", task_id
    ).fetch_one(&pool).await?;

    assert_eq!(got.as_deref(), Some("sess-abc"));

    // is_done_column is BOOLEAN in Postgres (was INTEGER 0/1 in SQLite)
    let is_done: bool = sqlx::query_scalar!(
        "SELECT is_done_column FROM columns WHERE id = $1", column_id
    ).fetch_one(&pool).await?;
    assert!(!is_done);

    Ok(())
}
```

- [ ] **Step 7: Run tests**

Run: `DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi cargo test --test db_schema 2>&1 | tail -20`
Expected: all schema tests pass.

- [ ] **Step 8: Verify full compile**

Run: `cargo check 2>&1 | tail -20`
Expected: compile succeeds (warnings OK, errors not). All remaining SqlitePool references should be gone now that Tasks 4-7 are complete.

- [ ] **Step 9: Commit**

```bash
git add src-tauri/migrations/005_columns.sql src-tauri/migrations/006_tasks.sql src-tauri/src/models/task.rs src-tauri/src/db/queries/tasks.rs src-tauri/src/commands/kanban.rs src-tauri/tests/db_schema.rs
git commit -m "feat(db): migrate columns + tasks (adds agent_session_id) to Postgres"
```

---

### Task 8: task_attachments migration + CHECK + LO trigger

**Files:**
- Create: `src-tauri/migrations/007_task_attachments.sql`
- Modify: `src-tauri/migrations/008_triggers.sql` (append lo_manage trigger)
- Create: `src-tauri/src/models/attachment.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Create: `src-tauri/tests/db_attachments.rs`

- [ ] **Step 1: Create `src-tauri/migrations/007_task_attachments.sql`**

```sql
CREATE TABLE task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('link', 'text', 'file')),
    title TEXT NOT NULL,
    url TEXT,
    content TEXT,
    large_object_oid OID,
    content_type TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (kind = 'link' AND url IS NOT NULL) OR
        (kind = 'text' AND content IS NOT NULL) OR
        (kind = 'file' AND large_object_oid IS NOT NULL AND content_type IS NOT NULL)
    )
);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
```

- [ ] **Step 2: Append lo_manage trigger to `src-tauri/migrations/008_triggers.sql`**

Append (the file already has the user_settings trigger from Task 5):

```sql

-- Clean up pg_largeobject blobs when task_attachments row is
-- deleted or its large_object_oid is changed.
CREATE TRIGGER task_attachments_lo_cleanup
    BEFORE UPDATE OR DELETE ON task_attachments
    FOR EACH ROW
    EXECUTE FUNCTION lo_manage(large_object_oid);
```

- [ ] **Step 3: Create `src-tauri/src/models/attachment.rs`**

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::postgres::types::Oid;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Attachment {
    pub id: Uuid,
    pub task_id: Uuid,
    pub kind: String,
    pub title: String,
    pub url: Option<String>,
    pub content: Option<String>,
    #[serde(skip_serializing)]
    pub large_object_oid: Option<Oid>,
    pub content_type: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLinkAttachmentInput {
    pub task_id: Uuid,
    pub title: String,
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTextAttachmentInput {
    pub task_id: Uuid,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateFileAttachmentInput {
    pub task_id: Uuid,
    pub title: String,
    pub content_type: String,
    pub bytes: Vec<u8>,
}
```

- [ ] **Step 4: Export the model**

Edit `src-tauri/src/models/mod.rs` — append `pub mod attachment;`.

- [ ] **Step 5: Write integration tests for CHECK constraints and LO cleanup**

Create `src-tauri/tests/db_attachments.rs`:

```rust
use sqlx::{postgres::types::Oid, PgPool};

async fn seed_task(pool: &PgPool) -> sqlx::Result<sqlx::types::Uuid> {
    let user_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
        "attuser", "att@x.com", "h"
    ).fetch_one(pool).await?;
    let board_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO boards (user_id, name) VALUES ($1, $2) RETURNING id",
        user_id, "B"
    ).fetch_one(pool).await?;
    let column_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO columns (board_id, name) VALUES ($1, $2) RETURNING id",
        board_id, "Backlog"
    ).fetch_one(pool).await?;
    sqlx::query_scalar!(
        "INSERT INTO tasks (column_id, board_id, title) VALUES ($1, $2, $3) RETURNING id",
        column_id, board_id, "t"
    ).fetch_one(pool).await
}

#[sqlx::test]
async fn link_attachment_requires_url(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;

    // Valid: kind=link with url.
    let ok = sqlx::query!(
        "INSERT INTO task_attachments (task_id, kind, title, url) VALUES ($1, 'link', 'gh', 'https://github.com')",
        task_id
    ).execute(&pool).await;
    assert!(ok.is_ok());

    // Invalid: kind=link without url.
    let bad = sqlx::query!(
        "INSERT INTO task_attachments (task_id, kind, title) VALUES ($1, 'link', 'no-url')",
        task_id
    ).execute(&pool).await;
    assert!(bad.is_err(), "CHECK must reject link without url");
    Ok(())
}

#[sqlx::test]
async fn text_attachment_requires_content(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;

    let ok = sqlx::query!(
        "INSERT INTO task_attachments (task_id, kind, title, content) VALUES ($1, 'text', 't', 'note body')",
        task_id
    ).execute(&pool).await;
    assert!(ok.is_ok());

    let bad = sqlx::query!(
        "INSERT INTO task_attachments (task_id, kind, title) VALUES ($1, 'text', 'empty')",
        task_id
    ).execute(&pool).await;
    assert!(bad.is_err(), "CHECK must reject text without content");
    Ok(())
}

#[sqlx::test]
async fn file_attachment_requires_oid_and_mime(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;

    // Create a real large object via lo_create, write one byte, then insert the attachment row.
    let oid: Oid = sqlx::query_scalar("SELECT lo_create(0)").fetch_one(&pool).await?;

    let ok = sqlx::query!(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid, content_type)
         VALUES ($1, 'file', 'doc.pdf', $2, 'application/pdf')",
        task_id, oid
    ).execute(&pool).await;
    assert!(ok.is_ok());

    let bad = sqlx::query!(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid)
         VALUES ($1, 'file', 'no-mime', $2)",
        task_id, oid
    ).execute(&pool).await;
    assert!(bad.is_err(), "CHECK must reject file without content_type");
    Ok(())
}

#[sqlx::test]
async fn file_attachment_delete_unlinks_large_object(pool: PgPool) -> sqlx::Result<()> {
    let task_id = seed_task(&pool).await?;
    let oid: Oid = sqlx::query_scalar("SELECT lo_create(0)").fetch_one(&pool).await?;

    let att_id: sqlx::types::Uuid = sqlx::query_scalar!(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid, content_type)
         VALUES ($1, 'file', 't', $2, 'application/octet-stream') RETURNING id",
        task_id, oid
    ).fetch_one(&pool).await?;

    sqlx::query!("DELETE FROM task_attachments WHERE id = $1", att_id)
        .execute(&pool)
        .await?;

    let orphan_count: i64 = sqlx::query_scalar!(
        "SELECT count(*) FROM pg_largeobject_metadata WHERE oid = $1",
        oid
    ).fetch_one(&pool).await?.unwrap_or(0);

    assert_eq!(orphan_count, 0, "lo_manage trigger must unlink large object on row delete");
    Ok(())
}
```

- [ ] **Step 6: Run the tests**

Run: `DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi cargo test --test db_attachments 2>&1 | tail -20`
Expected: all four tests pass.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/migrations/007_task_attachments.sql src-tauri/migrations/008_triggers.sql src-tauri/src/models/attachment.rs src-tauri/src/models/mod.rs src-tauri/tests/db_attachments.rs
git commit -m "feat(db): add task_attachments table with CHECK + lo_manage trigger"
```

---

### Task 9: Attachments queries + Tauri commands

**Files:**
- Create: `src-tauri/src/db/queries/attachments.rs`
- Create: `src-tauri/src/commands/attachments.rs`
- Modify: `src-tauri/src/db/queries/mod.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs` (register commands)

- [ ] **Step 1: Create `src-tauri/src/db/queries/attachments.rs`**

```rust
use sqlx::postgres::types::Oid;
use sqlx::PgPool;
use uuid::Uuid;
use crate::models::attachment::Attachment;

pub async fn list_by_task(
    pool: &PgPool,
    task_id: Uuid,
) -> Result<Vec<Attachment>, sqlx::Error> {
    sqlx::query_as::<_, Attachment>(
        "SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY sort_order, created_at",
    )
    .bind(task_id)
    .fetch_all(pool)
    .await
}

pub async fn create_link(
    pool: &PgPool,
    task_id: Uuid,
    title: &str,
    url: &str,
) -> Result<Attachment, sqlx::Error> {
    sqlx::query_as::<_, Attachment>(
        "INSERT INTO task_attachments (task_id, kind, title, url)
         VALUES ($1, 'link', $2, $3) RETURNING *",
    )
    .bind(task_id).bind(title).bind(url)
    .fetch_one(pool).await
}

pub async fn create_text(
    pool: &PgPool,
    task_id: Uuid,
    title: &str,
    content: &str,
) -> Result<Attachment, sqlx::Error> {
    sqlx::query_as::<_, Attachment>(
        "INSERT INTO task_attachments (task_id, kind, title, content)
         VALUES ($1, 'text', $2, $3) RETURNING *",
    )
    .bind(task_id).bind(title).bind(content)
    .fetch_one(pool).await
}

pub async fn create_file(
    pool: &PgPool,
    task_id: Uuid,
    title: &str,
    content_type: &str,
    bytes: &[u8],
) -> Result<Attachment, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let oid: Oid = sqlx::query_scalar("SELECT lo_create(0)")
        .fetch_one(&mut *tx).await?;

    // Open the LO for writing (mode 0x20000 = INV_WRITE), write all bytes, close.
    let fd: i32 = sqlx::query_scalar("SELECT lo_open($1, 131072)")
        .bind(oid)
        .fetch_one(&mut *tx).await?;
    sqlx::query("SELECT lowrite($1, $2)")
        .bind(fd).bind(bytes)
        .execute(&mut *tx).await?;
    sqlx::query("SELECT lo_close($1)")
        .bind(fd)
        .execute(&mut *tx).await?;

    let row = sqlx::query_as::<_, Attachment>(
        "INSERT INTO task_attachments (task_id, kind, title, large_object_oid, content_type)
         VALUES ($1, 'file', $2, $3, $4) RETURNING *",
    )
    .bind(task_id).bind(title).bind(oid).bind(content_type)
    .fetch_one(&mut *tx).await?;

    tx.commit().await?;
    Ok(row)
}

pub async fn read_file(pool: &PgPool, attachment_id: Uuid) -> Result<Vec<u8>, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let oid: Option<Oid> = sqlx::query_scalar(
        "SELECT large_object_oid FROM task_attachments WHERE id = $1 AND kind = 'file'",
    )
    .bind(attachment_id)
    .fetch_optional(&mut *tx).await?
    .flatten();

    let oid = oid.ok_or(sqlx::Error::RowNotFound)?;

    // INV_READ = 0x40000
    let fd: i32 = sqlx::query_scalar("SELECT lo_open($1, 262144)")
        .bind(oid)
        .fetch_one(&mut *tx).await?;
    // Max 2GB chunk via loread; for MVP we read whole blob in one call with a very large cap.
    let bytes: Vec<u8> = sqlx::query_scalar("SELECT loread($1, 2147483647)")
        .bind(fd)
        .fetch_one(&mut *tx).await?;
    sqlx::query("SELECT lo_close($1)")
        .bind(fd)
        .execute(&mut *tx).await?;

    tx.commit().await?;
    Ok(bytes)
}

pub async fn delete(pool: &PgPool, attachment_id: Uuid) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM task_attachments WHERE id = $1")
        .bind(attachment_id)
        .execute(pool)
        .await?;
    Ok(())
}
```

- [ ] **Step 2: Export the module — edit `src-tauri/src/db/queries/mod.rs` append**

```rust
pub mod attachments;
```

- [ ] **Step 3: Create `src-tauri/src/commands/attachments.rs`**

```rust
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
```

- [ ] **Step 4: Export the commands module and register — edit `src-tauri/src/commands/mod.rs`**

Append:
```rust
pub mod attachments;
```

- [ ] **Step 5: Register commands in `lib.rs` invoke_handler**

Add below the Settings block:
```rust
            // Attachments
            commands::attachments::list_attachments,
            commands::attachments::create_link_attachment,
            commands::attachments::create_text_attachment,
            commands::attachments::create_file_attachment,
            commands::attachments::read_file_attachment,
            commands::attachments::delete_attachment,
```

- [ ] **Step 6: Write round-trip integration test**

Append to `src-tauri/tests/db_attachments.rs`:

```rust
#[sqlx::test]
async fn create_file_via_query_layer_round_trips(pool: PgPool) -> sqlx::Result<()> {
    use sofi_lib::db::queries::attachments;

    let task_id = seed_task(&pool).await?;
    let bytes = b"hello postgres large object".to_vec();

    let att = attachments::create_file(&pool, task_id, "greet.txt", "text/plain", &bytes).await?;
    assert_eq!(att.kind, "file");

    let got = attachments::read_file(&pool, att.id).await?;
    assert_eq!(got, bytes);

    Ok(())
}
```

- [ ] **Step 7: Run the test**

Run: `DATABASE_URL=postgres://sofi:sofi@localhost:5432/sofi cargo test --test db_attachments 2>&1 | tail -20`
Expected: all attachments tests pass, including the round-trip one.

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/db/queries/attachments.rs src-tauri/src/db/queries/mod.rs src-tauri/src/commands/attachments.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src-tauri/tests/db_attachments.rs
git commit -m "feat(attachments): Tauri commands for link/text/file attachments via pg_largeobject"
```

---

### Task 10: Keychain auth token — Rust side

**Files:**
- Create: `src-tauri/src/commands/auth_token.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/lib.rs` (register)

- [ ] **Step 1: Create `src-tauri/src/commands/auth_token.rs`**

```rust
use crate::error::AppError;

const SERVICE: &str = "sofi";
const ACCOUNT: &str = "session-token";

fn entry() -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(SERVICE, ACCOUNT)
        .map_err(|e| AppError::Internal(format!("keyring entry: {e}")))
}

#[tauri::command]
pub async fn auth_store_token(token: String) -> Result<(), AppError> {
    entry()?.set_password(&token).map_err(|e| AppError::Internal(format!("keyring set: {e}")))?;
    Ok(())
}

#[tauri::command]
pub async fn auth_get_token() -> Result<Option<String>, AppError> {
    match entry()?.get_password() {
        Ok(t) => Ok(Some(t)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Internal(format!("keyring get: {e}"))),
    }
}

#[tauri::command]
pub async fn auth_clear_token() -> Result<(), AppError> {
    match entry()?.delete_credential() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Internal(format!("keyring clear: {e}"))),
    }
}
```

- [ ] **Step 2: Export and register**

Append `pub mod auth_token;` to `src-tauri/src/commands/mod.rs`.

Add to `lib.rs` invoke_handler (after Auth block):
```rust
            // Auth token (keychain)
            commands::auth_token::auth_store_token,
            commands::auth_token::auth_get_token,
            commands::auth_token::auth_clear_token,
```

- [ ] **Step 3: Write round-trip unit test**

Create `src-tauri/tests/keychain.rs`:

```rust
#[tokio::test]
async fn keychain_round_trip() {
    // Clean any leftover state first.
    let _ = sofi_lib::commands::auth_token::auth_clear_token().await;

    sofi_lib::commands::auth_token::auth_store_token("test-token-123".to_string())
        .await
        .unwrap();

    let got = sofi_lib::commands::auth_token::auth_get_token().await.unwrap();
    assert_eq!(got.as_deref(), Some("test-token-123"));

    sofi_lib::commands::auth_token::auth_clear_token().await.unwrap();
    let gone = sofi_lib::commands::auth_token::auth_get_token().await.unwrap();
    assert_eq!(gone, None);
}
```

NOTE: this test hits the real OS keychain. On macOS it may prompt for password authorization the first time, and on CI it requires a backing keyring service. Mark it with `#[ignore]` if that's a concern; for dev machines it runs clean.

- [ ] **Step 4: Run the test**

Run: `cargo test --test keychain 2>&1 | tail -15`
Expected: `test keychain_round_trip ... ok`. If a macOS dialog appears, accept it once.

- [ ] **Step 5: Compile check**

Run: `cargo check 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/commands/auth_token.rs src-tauri/src/commands/mod.rs src-tauri/src/lib.rs src-tauri/tests/keychain.rs
git commit -m "feat(auth): store session token in OS keychain via keyring crate"
```

---

### Task 11: Keychain auth token — TS side migration

**Files:**
- Create: `src/lib/auth-token.ts`
- Rewrite: `src/features/auth/queries/mutations.ts`
- Rewrite: `src/features/auth/queries/options.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/lib/auth-token.ts`**

```ts
import { invoke } from "@/lib/tauri";

export function storeAuthToken(token: string): Promise<void> {
  return invoke<void>("auth_store_token", { token });
}

export function getAuthToken(): Promise<string | null> {
  return invoke<string | null>("auth_get_token");
}

export function clearAuthToken(): Promise<void> {
  return invoke<void>("auth_clear_token");
}
```

- [ ] **Step 2: Rewrite `src/features/auth/queries/mutations.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearAuthToken, storeAuthToken } from "@/lib/auth-token";
import { invoke } from "@/lib/tauri";
import type { AuthResponse, LoginInput, RegisterInput } from "../types";
import { authKeys } from "./keys";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => invoke<AuthResponse>("login", { input }),
    meta: { suppressToast: true },
    onSuccess: async (response) => {
      await storeAuthToken(response.token);
      queryClient.setQueryData(authKeys.session(), response.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => invoke<AuthResponse>("register", { input }),
    meta: { suppressToast: true },
    onSuccess: async (response) => {
      await storeAuthToken(response.token);
      queryClient.setQueryData(authKeys.session(), response.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return async () => {
    await clearAuthToken();
    queryClient.setQueryData(authKeys.session(), null);
  };
}
```

- [ ] **Step 3: Rewrite `src/features/auth/queries/options.ts`**

```ts
import { queryOptions } from "@tanstack/react-query";
import { clearAuthToken, getAuthToken } from "@/lib/auth-token";
import { ErrorCode, isAppError } from "@/lib/errors";
import { invoke } from "@/lib/tauri";
import type { AuthResponse, User } from "../types";
import { authKeys } from "./keys";

export const sessionQueryOptions = queryOptions({
  queryKey: authKeys.session(),
  queryFn: async (): Promise<User | null> => {
    const token = await getAuthToken();
    if (!token) return null;
    try {
      const response = await invoke<AuthResponse>("check_session", { token });
      return response.user;
    } catch (error) {
      if (isAppError(error) && error.code === ErrorCode.AUTH) {
        await clearAuthToken();
        return null;
      }
      throw error;
    }
  },
  staleTime: 5 * 60 * 1000,
});
```

- [ ] **Step 4: Edit `src/main.tsx`**

Find the line `localStorage.removeItem("sofi_token");` (around line 15 based on current code). Replace the surrounding logic with a call to `clearAuthToken()`. Open the file, inspect the context, and substitute accordingly. If the call is inside a synchronous handler, make it async.

- [ ] **Step 5: Verify no remaining localStorage references to `sofi_token` or `sofi:theme`**

Run: `rg "localStorage|sessionStorage" src/ tests/ --glob "!**/node_modules/**" -n`
Expected output:
- `tests/e2e/theme.spec.ts` still references — will be fixed in Task 14
- `src/components/theme/theme-provider.tsx` still references — will be fixed in Task 13
- No references under `src/features/auth/` or `src/main.tsx`

- [ ] **Step 6: Typecheck + lint**

Run: `pnpm tsc --noEmit 2>&1 | tail -10 && pnpm lint 2>&1 | tail -5`
Expected: both pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth-token.ts src/features/auth/queries src/main.tsx
git commit -m "feat(auth): migrate session token from localStorage to OS keychain"
```

---

### Task 12: Settings feature — TanStack Query wiring

**Files:**
- Create: `src/features/settings/types.ts`
- Create: `src/features/settings/queries/keys.ts`
- Create: `src/features/settings/queries/options.ts`
- Create: `src/features/settings/queries/mutations.ts`

- [ ] **Step 1: Create `src/features/settings/types.ts`**

```ts
export interface UserSettings {
  user_id: string;
  theme: "system" | "light" | "dark";
  default_agent_type: string;
  default_shell: string;
  font_size: number;
  font_family: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateUserSettingsInput {
  theme?: UserSettings["theme"];
  default_agent_type?: string;
  default_shell?: string;
  font_size?: number;
  font_family?: string;
}
```

- [ ] **Step 2: Create `src/features/settings/queries/keys.ts`**

```ts
export const settingsKeys = {
  all: ["settings"] as const,
  userSettings: (userId: string) => [...settingsKeys.all, "user", userId] as const,
};
```

- [ ] **Step 3: Create `src/features/settings/queries/options.ts`**

```ts
import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { UserSettings } from "../types";
import { settingsKeys } from "./keys";

export function userSettingsQueryOptions(userId: string) {
  return queryOptions({
    queryKey: settingsKeys.userSettings(userId),
    queryFn: () => invoke<UserSettings>("get_user_settings", { userId }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
```

- [ ] **Step 4: Create `src/features/settings/queries/mutations.ts`**

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { UpdateUserSettingsInput, UserSettings } from "../types";
import { settingsKeys } from "./keys";

export function useUpdateUserSettings(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserSettingsInput) =>
      invoke<UserSettings>("update_user_settings", { userId, input }),
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.userSettings(userId), data);
    },
  });
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/settings/types.ts src/features/settings/queries
git commit -m "feat(settings): TanStack Query wiring for user_settings"
```

---

### Task 13: ThemeProvider rewrite — DB-backed, no localStorage

**Files:**
- Rewrite: `src/components/theme/theme-provider.tsx`
- Modify: `src/features/settings/components/settings-page.tsx` (verify still works)

- [ ] **Step 1: Rewrite `src/components/theme/theme-provider.tsx`**

Full replacement:

```tsx
import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionQueryOptions } from "@/features/auth/queries/options";
import { useUpdateUserSettings } from "@/features/settings/queries/mutations";
import { userSettingsQueryOptions } from "@/features/settings/queries/options";

type Theme = "system" | "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sessionQuery = useQuery(sessionQueryOptions);
  const userId = sessionQuery.data?.id;

  const settingsQuery = useQuery({
    ...userSettingsQueryOptions(userId ?? ""),
    enabled: !!userId,
  });

  const updateMutation = useUpdateUserSettings(userId ?? "");

  const theme: Theme = settingsQuery.data?.theme ?? "system";

  // Apply the .light class to <html> based on the resolved theme.
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light");

    if (theme === "system") {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      if (prefersLight) root.classList.add("light");
      return;
    }
    if (theme === "light") root.classList.add("light");
  }, [theme]);

  // When theme = "system", listen to OS changes.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      root.classList.toggle("light", e.matches);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        if (!userId) return;
        updateMutation.mutate({ theme: next });
      },
    }),
    [theme, userId, updateMutation],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

Key changes: no `localStorage`, no `storageKey` prop, no `defaultTheme` prop. Theme comes from the authenticated user's `user_settings` row via TanStack Query; `setTheme` goes straight to a mutation.

- [ ] **Step 2: Verify `settings-page.tsx` still compiles**

Read `src/features/settings/components/settings-page.tsx` — it uses `useTheme()` already, no import changes needed. The existing `theme` / `setTheme` API is preserved.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | tail -10`
Expected: no errors.

- [ ] **Step 4: Verify no remaining localStorage in theme code**

Run: `rg "localStorage|sessionStorage" src/components/theme/ -n`
Expected: no output (empty).

- [ ] **Step 5: Commit**

```bash
git add src/components/theme/theme-provider.tsx
git commit -m "feat(theme): ThemeProvider reads from and writes to user_settings (no localStorage)"
```

---

### Task 14: LoadingGate component + FOUC script removal + wire into main.tsx

**Files:**
- Create: `src/components/boot/loading-gate.tsx`
- Modify: `src/main.tsx`
- Modify: `index.html`

- [ ] **Step 1: Create `src/components/boot/loading-gate.tsx`**

```tsx
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { sessionQueryOptions } from "@/features/auth/queries/options";
import { userSettingsQueryOptions } from "@/features/settings/queries/options";

type Step =
  | "connecting"
  | "checking-session"
  | "loading-settings"
  | "applying-theme"
  | "ready";

const STEP_LABELS: Record<Step, string> = {
  connecting: "Connecting to Sofi…",
  "checking-session": "Checking your session…",
  "loading-settings": "Loading your preferences…",
  "applying-theme": "Applying theme…",
  ready: "Ready.",
};

export function LoadingGate({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState<Step>("connecting");

  const sessionQuery = useQuery(sessionQueryOptions);
  const userId = sessionQuery.data?.id;

  const settingsQuery = useQuery({
    ...userSettingsQueryOptions(userId ?? ""),
    enabled: !!userId,
  });

  useEffect(() => {
    if (sessionQuery.isLoading) {
      setStep("checking-session");
      return;
    }
    if (!sessionQuery.data) {
      // Unauthenticated — render children (router handles /login redirect).
      setStep("ready");
      return;
    }
    if (settingsQuery.isLoading) {
      setStep("loading-settings");
      return;
    }
    if (settingsQuery.data) {
      setStep("applying-theme");
      // Give ThemeProvider one tick to apply the .light class.
      const id = requestAnimationFrame(() => setStep("ready"));
      return () => cancelAnimationFrame(id);
    }
  }, [sessionQuery.isLoading, sessionQuery.data, settingsQuery.isLoading, settingsQuery.data]);

  if (step === "ready") return <>{children}</>;

  const error = sessionQuery.error ?? settingsQuery.error;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f1a",
        color: "#e2e8f0",
        fontFamily: "Inter, system-ui, sans-serif",
        gap: "16px",
      }}
    >
      <div style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em" }}>Sofi</div>
      <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
        {error ? `Error: ${error instanceof Error ? error.message : String(error)}` : STEP_LABELS[step]}
      </div>
      {error && (
        <button
          type="button"
          onClick={() => {
            sessionQuery.refetch();
            settingsQuery.refetch();
          }}
          style={{
            padding: "8px 16px",
            background: "#7c3aed",
            border: "none",
            borderRadius: "6px",
            color: "white",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
```

NOTE: inline styles used deliberately — the LoadingGate must render before Tailwind is guaranteed applied (first paint) and before the theme class is on `<html>`. Pixel-perfect Stitch design deferred; this is the functional placeholder.

- [ ] **Step 2: Wire LoadingGate into `src/main.tsx`**

Read the current `src/main.tsx` structure. Wrap the inner content of `<ThemeProvider>` so the order is:

```tsx
<ErrorBoundary>
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <LoadingGate>
        <RouterProvider router={router} />
        <ReactQueryDevtools initialIsOpen={false} />
      </LoadingGate>
    </QueryClientProvider>
  </ThemeProvider>
</ErrorBoundary>
```

Add the import: `import { LoadingGate } from "@/components/boot/loading-gate";`

- [ ] **Step 3: Delete FOUC script from `index.html`**

Read `index.html`. Find the `<script>` block between lines ~14-30 that contains `(() => { let stored;` or `localStorage.getItem("sofi:theme")`. Delete the entire `<script>...</script>` tag. Verify nothing else in the head references `localStorage`.

- [ ] **Step 4: Verify no localStorage remains in app code**

Run: `rg "localStorage|sessionStorage" src/ index.html --glob "!**/node_modules/**" -n`
Expected: only `src/features/` occurrences unrelated to state, or nothing. If any appear, audit and remove.

- [ ] **Step 5: Typecheck + lint**

Run: `pnpm tsc --noEmit 2>&1 | tail -10 && pnpm lint 2>&1 | tail -5`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/boot/loading-gate.tsx src/main.tsx index.html
git commit -m "feat(boot): add LoadingGate + remove FOUC localStorage script"
```

---

### Task 15: E2E theme test rewrite + final verification

**Files:**
- Rewrite: `tests/e2e/theme.spec.ts`
- Modify: README or dev notes if present (mention `docker compose up` prerequisite)

- [ ] **Step 1: Rewrite `tests/e2e/theme.spec.ts`**

The old tests anchored on `localStorage.setItem("sofi:theme", ...)`. With DB-backed theme, the login page has no user context — there's no user-specific theme to apply. The tests must now verify the LoadingGate behavior and the authenticated-user theme path.

Full replacement:

```ts
import { expect, test } from "@playwright/test";

test.describe("loading gate + theme", () => {
  test("unauthenticated root shows login without theme flash", async ({ page }) => {
    await page.goto("/");
    // LoadingGate renders, then router redirects to /login.
    await expect(page).toHaveURL(/\/login$/);
    const classes = await page.locator("html").getAttribute("class");
    // No .light class is applied for unauthenticated users.
    expect(classes || "").not.toContain("light");
  });

  test("loading gate surfaces error when DB unreachable", async ({ page }) => {
    // Intercept the Tauri IPC check_session call and force it to fail.
    await page.addInitScript(() => {
      // Stub the Tauri invoke to simulate a DB connection error.
      // @ts-expect-error -- test-only injection
      window.__TAURI_INTERNALS__ = {
        invoke: () => Promise.reject(new Error("Postgres unreachable")),
      };
    });
    await page.goto("/");
    await expect(page.getByText(/Error:/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
```

NOTE: depending on how the Playwright Tauri harness is set up in this repo, the intercept mechanism may differ. Consult `tests/e2e/` for any existing Tauri mock helpers and adapt. If no harness exists, mark the second test `test.skip` with a comment explaining that full Tauri-backed E2E requires dev-server integration that isn't wired in yet.

- [ ] **Step 2: Run tests**

Run (with Docker Postgres + dev server running): `pnpm test:e2e tests/e2e/theme.spec.ts 2>&1 | tail -20`
Expected: both tests pass. If the second fails because of Tauri-harness specifics, leave it `skip()` with a note and land the first.

- [ ] **Step 3: Final cold-start verification (manual)**

Acceptance run:
```bash
# 1. Nuke any legacy SQLite leftover
rm -f ~/Library/Application\ Support/sofi/sofi.db*

# 2. Reset Postgres to a clean state (optional, to prove migrations work from zero)
docker compose down -v && docker compose up -d

# 3. Start Sofi
pnpm tauri dev
```

Expected behavior:
- LoadingGate renders immediately ("Connecting to Sofi…")
- Transitions through narrated steps
- Lands on `/login` (unauthenticated) — no theme flash
- Sign up → auto-redirected to authenticated route
- Adminer (localhost:8080) shows `user_settings` row auto-created for the new user
- Change theme in Settings → page swaps immediately
- Close Sofi, reopen → keychain-stored token auto-authenticates; theme is preserved
- `rg "localStorage|sessionStorage" src/ index.html` → empty

- [ ] **Step 4: Commit any test or dev-note polish**

```bash
git add tests/e2e/theme.spec.ts
git commit -m "test(theme): rewrite e2e tests for DB-backed theme + LoadingGate"
```

---

## Acceptance Criteria (from spec)

- [ ] `docker-compose up -d` brings up Postgres + Adminer locally — **Task 1**
- [ ] Sofi dev app starts, runs migrations, reaches login screen — **Task 3+**
- [ ] New user signup creates a `users` row + auto-creates a `user_settings` row — **Task 5**
- [ ] No code in the repo uses `localStorage`, `sessionStorage`, or `IndexedDB` — **Tasks 11, 13, 14**
- [ ] Theme change in Settings persists to `user_settings.theme` row; Sofi restart preserves the theme — **Tasks 12, 13, 15**
- [ ] Auth token lives in OS keychain; Sofi restart preserves the session — **Tasks 10, 11**
- [ ] LoadingGate renders before any main-app content; narrates each fetch step; transitions to error + retry if Postgres is unreachable — **Task 14**
- [ ] Attachments table accepts valid link/text/file rows and rejects invalid ones via CHECK — **Task 8**
- [ ] File attachment deletion leaves zero orphaned rows in `pg_largeobject_metadata` — **Task 8**
- [ ] E2E theme tests updated to reflect the new storage model — **Task 15**
- [ ] No FOUC — cold start shows loading screen, then correct theme, never the wrong theme briefly — **Task 14, 15**
