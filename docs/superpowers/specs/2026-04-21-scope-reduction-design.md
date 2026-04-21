# Scope Reduction: Welcome + Auth + Settings

**Date:** 2026-04-21
**Status:** Approved (auto-mode brainstorm, 4 clarifying turns)
**Branch:** `refactor/scope-reduction`

## Goal

Strip the Sofi desktop app down to its auth flow plus a minimal welcome page, removing all currently-built feature surfaces (kanban, terminal, git, agents). Settings stays. The goal is a clean foundation to rebuild on, not a refactor of the removed features.

## Scope

### Keep

- **Auth flow** — full `_public/` routes (login, register, recover, recover/confirm, verify-success, check-email, fault-preview) and `src/features/auth/`.
- **Settings** — `src/features/settings/` and its existing route. Language switcher and user profile remain useful for the welcome shell.
- **Layout chrome** — `src/components/layout/app-layout.tsx` (top bar, user menu, language switcher) stays. Section nav is slimmed.
- **Loading + error handling** — root-level loading states and error boundaries, already feature-agnostic.
- **Backend** — Django backend in `backend/` is untouched. Auth and settings both consume it as-is.

### Delete — Frontend

- `src/features/kanban/`
- `src/features/terminal/`
- `src/features/git/`
- `src/features/agents/`
- `src/routes/_authenticated/kanban/` (folder: `index.tsx`, `list.tsx`, `agents.tsx`, `settings.tsx`)
- `src/routes/_authenticated/terminal/` (folder: `index.tsx`, `settings.tsx`)
- `src/routes/_authenticated/git/` (folder: `index.tsx`)
- `src/routes/index.tsx` (current redirect to `/kanban`)
- i18n keys/files in `public/locales/{en,it}/` scoped to removed namespaces (kanban/terminal/git/agents)
- E2E specs in `e2e/` scoped to removed features (auth e2e specs stay)

### Delete — Rust/Tauri

- `src-tauri/src/commands/git.rs`
- `src-tauri/src/commands/terminal.rs`
- `src-tauri/src/commands/agents.rs`
- `src-tauri/src/commands/worktree.rs`
- `src-tauri/src/services/git_engine.rs`
- `src-tauri/src/services/pty_manager.rs`
- `src-tauri/src/services/shell_detector.rs`
- `src-tauri/src/services/agent_manager.rs`
- `src-tauri/src/services/worktree_manager.rs`
- Module declarations in `src-tauri/src/commands/mod.rs` and `src-tauri/src/services/mod.rs`
- `invoke_handler` registrations and `manage(...)` state setup in `src-tauri/src/lib.rs`
- Cargo deps in `src-tauri/Cargo.toml` only used by removed modules — verify with `cargo check` after removal; only delete deps that are demonstrably unused.

### Add / Modify

- **New:** `src/routes/_authenticated/index.tsx` — welcome page at `/`. Reads `sessionQueryOptions`, renders `<h1>Hallo, {user.username}</h1>` (or email fallback if `username` is null).
- **Modify:** `src/routes/_authenticated.tsx` — drop the `APP_SECTIONS.map(... hidden ...)` rendering pattern. Use TanStack Router's `<Outlet />` so each route renders normally. Auth gate (`sessionQueryOptions` redirect) is preserved.
- **Modify:** `src/lib/routes.ts` — `APP_SECTIONS` becomes `["welcome", "settings"]`. `getActiveSection` updated accordingly.
- **Modify:** `src/components/layout/app-layout.tsx` (or wherever section nav renders) — nav items reduced to `[Welcome, Settings]`.
- **Regenerate:** `src/routeTree.gen.ts` regenerates automatically on next dev/build run.

## Architecture

### Before
```
/  →  /kanban (redirect)
_authenticated.tsx  →  AppLayout {
  conditionally render: Board | TerminalView | GitView | SettingsPage
}
```

### After
```
/  →  _authenticated/index.tsx (Welcome)
_authenticated.tsx  →  AppLayout {
  <Outlet />  // renders Welcome or SettingsPage based on route
}
```

The `hidden`-class trick (which kept all sections mounted simultaneously to preserve in-section state) is no longer needed: with only two routes and no expensive in-section state to preserve, the standard `<Outlet />` pattern is simpler and correct.

## Execution Order

1. **Worktree** ✓ — `.worktrees/scope-reduction/` on branch `refactor/scope-reduction` off `dev`.
2. **Frontend deletions** — feature folders + route folders. Compilation errors surface dangling imports.
3. **Frontend rewiring** — update `routes.ts`, `_authenticated.tsx`, `app-layout.tsx` nav. Add `_authenticated/index.tsx` welcome page.
4. **Rust deletions** — files + `mod.rs` updates + `lib.rs` registrations. `cargo check` confirms.
5. **Cargo.toml cleanup** — remove unused deps surfaced by `cargo check` warnings.
6. **i18n + tests** — strip namespaces and specs scoped to removed features.
7. **Verification** — `pnpm lint` (must not regress beyond pre-existing baseline), `cargo check`, `pnpm tauri dev` smoke test (login → welcome → settings → logout).
8. **Commit** — atomic commits per layer where possible (frontend / rust / cleanup), or single commit if churn makes splitting noisy.

## Out of Scope

- Backend changes. Auth and settings endpoints stay as-is.
- Renaming the app, changing branding, or design refresh.
- Touching i18n for kept features (auth, settings, common).
- Rebuilding any of the removed features in any form. This spec is purely subtractive plus the welcome stub.
- Database migrations or schema changes.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Hidden coupling: kept feature secretly imports from removed feature | TypeScript compilation will surface every dangling import; fix-as-you-go |
| Rust state Arc dropped without consumer left referencing it | `cargo check` will flag unused vars and unused imports |
| Cargo deps removed too aggressively, breaking auth backend deps | Only remove deps after `cargo check --locked` proves nothing else uses them |
| i18n key parity check (CI guard) breaks if keys deleted unevenly between en/it | Delete from both locales in lockstep; run the parity script if present |
| Pre-existing lint failures in `backend/apps/users/templates/` masking real issues | Baseline established: those errors pre-exist and are out of scope; new errors must be in `src/` to be mine |

## Verification Criteria

- `pnpm lint` shows no NEW errors in `src/` (backend template parse errors are pre-existing baseline).
- `cargo check` clean.
- `pnpm tauri dev` boots; user can: register → verify email → login → land on welcome page → see "Hallo, {username}" → navigate to settings → log out → return to login.
- No console errors during the smoke test.
- Bundle size reduced (informational only — measured with `pnpm build` if time permits).
