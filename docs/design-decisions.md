# Design Decisions

Key architectural and technology decisions made during Sofi's development, with rationale.

## Technology Stack

### Why Tauri 2.0 over Electron

- **Bundle size**: ~10MB vs 100MB+ (Electron ships Chromium + Node.js)
- **Memory**: 20-40MB vs 200-400MB baseline
- **Performance**: Rust backend handles I/O-heavy operations (PTY, git, file watching) without GC pauses
- **Security**: Capability-based permissions — only explicitly enabled commands are accessible
- **Proven**: Vibe Kanban (a similar agent orchestrator) uses Tauri + Rust successfully

### Why Zustand over Redux/Jotai

- Subscription-based model ideal for real-time streams (terminal output, agent status)
- Components subscribe to slices without re-rendering the whole tree
- Minimal boilerplate compared to Redux
- 57.7k GitHub stars — strong community validation

### Why SQLite over PostgreSQL (default)

- Zero-setup for users — no server to install
- PostgreSQL support was planned but SQLite provides a better first-run experience for an open-source desktop app
- sqlx abstracts the backend — PostgreSQL can be added later with the same query interface

### Why portable-pty over raw PTY

- Part of wezterm (20k+ stars) — battle-tested terminal emulator
- Handles cross-platform PTY differences (ConPTY on Windows, /dev/ptmx on macOS/Linux)
- Thread-safe reader/writer pattern works well with Tauri's async runtime

### Why git2-rs over shelling out to git CLI

- Structured data (diff hunks, branch refs, worktree handles) vs parsing CLI output
- No dependency on git being installed on the user's machine
- Maintained by the rust-lang organization — reliable and well-documented

### Why Biome + UltraCite over ESLint + Prettier

- Single tool for linting and formatting (Rust-based, sub-second performance)
- Zero-config with UltraCite preset
- Modern approach for 2026 — the ecosystem is moving toward Biome

## UI/UX Decisions

### Three Uniform Dropdown Selects

Instead of a sidebar (VS Code) or tabs, all three views (Kanban, Terminal, Git) are accessed via dropdown selects in the top bar. Rationale:
- Uniform interaction pattern — no mental model switch
- Each select shows contextual sub-options (boards, sessions, git views)
- Top bar is always visible without consuming horizontal space
- Dropdown labels update to show current selection ("Terminal: Refactor API")

### Card-to-Terminal Navigation

Clicking a Kanban card with an active agent switches to the Terminal view and auto-selects that agent's session. This creates a direct feedback loop: plan (Kanban) → watch (Terminal) → review (Git).

### Dark Violet Primary (#7c3aed)

- Distinguishes Sofi from the blue-dominant landscape (VS Code, GitHub, Slack)
- Violet conveys intelligence and creativity — fitting for an AI agent tool
- High contrast against dark backgrounds for accessibility

### Side-by-Side Diff (VS Code style)

Old file on left, new file on right, synced scroll — the most familiar pattern for developers coming from VS Code or Cursor.

## Data Architecture

### Agent Isolation via Git Worktrees

Each agent task gets its own git worktree and branch. This prevents:
- File conflicts between parallel agents
- Accidental modifications to the main working directory
- Complex merge resolution during agent operation

Pattern borrowed from Vibe Kanban, where it's proven at scale with 10+ concurrent agents.

### Session Tokens over JWT

For a local desktop app, simple UUID session tokens stored in SQLite are simpler and more appropriate than JWTs. There's no distributed system to validate tokens across — the single SQLite database is the source of truth.
