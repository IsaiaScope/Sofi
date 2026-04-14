# Development Guide

## Prerequisites

- **Node.js** 22+ (via Volta recommended)
- **pnpm** 10+
- **Rust** 1.94+ (via rustup)
- **Xcode Command Line Tools** (macOS): `xcode-select --install`

## Setup

```bash
# Clone
git clone https://github.com/IsaiaScope/Sofi.git
cd Sofi

# Install frontend dependencies
pnpm install

# Run development mode (starts Vite + Tauri)
source ~/.cargo/env
pnpm tauri dev
```

On first launch, the app will:
1. Create the SQLite database at `~/Library/Application Support/com.isaiascope.sofi/sofi.db`
2. Run all migrations automatically
3. Show the login/register page

## Project Structure

```
sofi/
├── src/                    # React frontend
│   ├── components/         # Shared UI components
│   ├── features/           # Feature modules (kanban, terminal, git, auth, agents)
│   ├── lib/                # Utilities
│   ├── styles/             # Tailwind CSS globals
│   └── App.tsx             # Root component with auth flow
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri IPC command handlers
│   │   ├── services/       # Business logic (PTY, agents, git)
│   │   ├── db/             # Database layer (pool, queries)
│   │   └── models/         # Shared types
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── docs/                   # Documentation
└── biome.jsonc             # Biome + UltraCite linter config
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm tauri dev` | Start development mode |
| `pnpm tauri build` | Build release binary |
| `pnpm vite build` | Build frontend only |
| `pnpm lint` | Lint with Biome + UltraCite |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm format` | Format code with Biome |
| `cargo check` | Check Rust compilation (from src-tauri/) |
| `cargo test` | Run Rust tests (from src-tauri/) |

## External Drive Note (macOS)

If developing on an external drive (exFAT/APFS), macOS creates `._*` resource fork files that corrupt Cargo builds. The project is configured to redirect the Rust build target to the internal drive:

```toml
# src-tauri/.cargo/config.toml
[build]
target-dir = "/Users/{username}/.sofi-build/target"
```

## Environment

### Tailwind CSS 4

Uses the new `@theme` directive in `src/styles/globals.css` for custom tokens. No `tailwind.config.ts` needed — configuration is in CSS.

### Biome + UltraCite

Zero-config linting and formatting. Extends `ultracite` preset in `biome.jsonc`. Run `pnpm lint` before committing.

### TypeScript

Path alias `@/` maps to `src/` via both `tsconfig.json` and Vite config.

## Adding New Features

### New Tauri Command

1. Create the command function in `src-tauri/src/commands/`
2. Register it in `src-tauri/src/lib.rs` `invoke_handler`
3. Call from frontend: `invoke<ReturnType>("command_name", { args })`

### New Frontend Feature

1. Create a new directory under `src/features/{name}/`
2. Add `components/`, `hooks/`, `store/`, `types.ts`
3. Create a Zustand store in `store/`
4. Wire to the appropriate view in `App.tsx`

### New Database Table

1. Add the `CREATE TABLE` statement to `src-tauri/src/db/pool.rs` in `run_migrations()`
2. Create the model struct in `src-tauri/src/models/`
3. Create query functions in `src-tauri/src/db/queries/`
