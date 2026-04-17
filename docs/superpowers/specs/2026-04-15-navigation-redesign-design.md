# Sofi — Navigation Redesign

## Context

Sofi's current navigation is a flat top bar with plain NavButton components for Kanban/Terminal/Git switching. The Stitch design introduces two changes: (1) a redesigned top bar with icon-based section tabs, colored active states, and an embedded board selector badge, (2) a new left sidebar with contextual icon navigation for sub-views within each section.

**Why:** As the app grows, each section needs sub-navigation (Kanban: board/agents/list, Git: diff/branches/history, Terminal: sessions). The current flat nav can't express this hierarchy. The sidebar provides a consistent pattern for section-internal navigation without cluttering the top bar.

**Outcome:** IDE-style navigation with a top bar for section switching and a contextual sidebar for sub-views. Matches the Stitch reference design.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sidebar position | Left, 44px wide | Stitch design, IDE convention |
| Sidebar content | Contextual per section | Each section has different sub-views |
| Section colors | Blue (Kanban), Green (Terminal), Orange (Git) | Established color semantics from design system |
| Icons | Material Symbols (outlined) via Google Fonts | Consistent with Stitch design, lightweight |
| Routing | Sidebar icons navigate to sub-routes | Integrates with TanStack Router, replaces Git's subView state |

---

## Top Bar Redesign

### Section Tabs

Each section tab has an icon + label. The active tab gets a colored pill background matching the section color. Inactive tabs are transparent with muted text.

```
[Sofi logo]  [▦ Kanban  MY PROJECT ▼]  [⬛ Terminal]  [🔀 Git]  ─── [●Claude] [○Codex] [⚙] [🔔] [👤]
              ─── blue active pill ──   ── muted ──    ── muted ──
```

**Kanban tab** — When active, shows board name as an embedded blue badge with dropdown arrow. Clicking opens the Menu for board switching. When inactive, shows just "Kanban" without the board badge.

**Terminal tab** — Green pill when active. Shows terminal icon.

**Git tab** — Orange pill when active. Shows git branch icon.

### Right Section

- Agent status pills with inline dots (green = available, gray = unavailable)
- Settings gear icon (navigates to /settings)
- Notification bell icon (placeholder for now)
- User avatar with dropdown menu (username, sign out)

---

## Left Sidebar

A 44px-wide vertical strip rendered between the top bar and content area inside `AppLayout`. Icons change based on which section is active.

### Sidebar per section

**Kanban:**
| Icon | Label | Route | Notes |
|------|-------|-------|-------|
| `dashboard` | Board | `/kanban` (default) | Current kanban board view |
| `smart_toy` | Agents | `/kanban/agents` | Agent overview (new placeholder) |
| `view_list` | List | `/kanban/list` | Task list view (new placeholder) |
| `settings` | Settings | `/kanban/settings` | Board settings (new placeholder, bottom) |

**Terminal:**
| Icon | Label | Route | Notes |
|------|-------|-------|-------|
| `terminal` | Sessions | `/terminal` (default) | Current terminal sessions |
| `add` | New | (action) | Creates new terminal session |
| `settings` | Settings | `/terminal/settings` | Shell preferences (placeholder, bottom) |

**Git:**
| Icon | Label | Route | Notes |
|------|-------|-------|-------|
| `difference` | Diff | `/git` or `/git/diff` (default) | Current diff view |
| `account_tree` | Branches | `/git/branches` | Current branches view |
| `history` | History | `/git/history` | Current commit log view |

**Settings:** No sidebar — settings is a full-width view.

### Active State

The active sidebar icon gets a colored background matching the section (blue/green/orange) with a rounded-lg shape. Inactive icons are muted gray.

### Tooltip

Icons show tooltip on hover with the label text (e.g., "Board", "Agents", "Sessions").

---

## Layout Structure

```
┌─────────────────────────────────────────────┐
│ TopBar (48px)                                │
├──────┬──────────────────────────────────────┤
│      │                                       │
│ Side │  Content Area                         │
│ bar  │  (persistent CSS visibility)          │
│ 44px │                                       │
│      │                                       │
├──────┴──────────────────────────────────────┤
```

The sidebar is part of `AppLayout`, rendered alongside the content. It reads the current route to determine which section is active and renders the appropriate icons.

---

## Component Structure

### New Components

| Component | File | Responsibility |
|-----------|------|---------------|
| `Sidebar` | `src/components/layout/sidebar.tsx` | Renders contextual icon sidebar based on active route |
| `SidebarIcon` | (inside sidebar.tsx) | Single icon button with tooltip, active state |

### Modified Components

| Component | Change |
|-----------|--------|
| `TopBar` (`src/components/top-bar/top-bar.tsx`) | Redesign NavButton to icon tabs with colored pills, add settings/bell icons, embed board badge in Kanban tab |
| `AppLayout` (`src/components/layout/app-layout.tsx`) | Add Sidebar to the layout, flex row with sidebar + content |

### New Route Files (placeholders)

| Route | File | Content |
|-------|------|---------|
| `/kanban/agents` | `src/routes/_authenticated/kanban/agents.tsx` | Placeholder "Agent overview — coming soon" |
| `/kanban/list` | `src/routes/_authenticated/kanban/list.tsx` | Placeholder "List view — coming soon" |
| `/kanban/settings` | `src/routes/_authenticated/kanban/settings.tsx` | Placeholder "Board settings — coming soon" |
| `/terminal/settings` | `src/routes/_authenticated/terminal/settings.tsx` | Placeholder "Shell settings — coming soon" |

### Git Sub-View Migration

Git currently uses `useGitUIStore.subView` state to switch between diff/branches/history. This should migrate to route-based navigation:
- `/git` or `/git/diff` → diff view (default)
- `/git/branches` → branches view
- `/git/history` → history view

These routes already exist in the route tree. The sidebar clicks navigate to them instead of calling `setSubView()`.

---

## Icons

Use Material Symbols (Outlined) loaded via Google Fonts CDN in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20,400,0" rel="stylesheet" />
```

Icon usage in components:
```tsx
<span className="material-symbols-outlined text-xl">dashboard</span>
```

---

## Files to Create/Modify

### New
- `src/components/layout/sidebar.tsx` — Sidebar component
- `src/routes/_authenticated/kanban/agents.tsx` — Placeholder route
- `src/routes/_authenticated/kanban/list.tsx` — Placeholder route
- `src/routes/_authenticated/kanban/settings.tsx` — Placeholder route
- `src/routes/_authenticated/terminal/settings.tsx` — Placeholder route

### Modify
- `src/components/top-bar/top-bar.tsx` — Redesign NavButton, add icons, board badge
- `src/components/layout/app-layout.tsx` — Add Sidebar to layout
- `src/features/git/components/git-view.tsx` — Remove inline sub-view tab bar (sidebar handles it)
- `index.html` — Add Material Symbols font link

### Route tree
- Regenerate `routeTree.gen.ts` after adding new route files

---

## Verification

- [ ] Top bar shows section tabs with icons and colored active state
- [ ] Kanban tab embeds board name badge when active
- [ ] Board dropdown works from Kanban tab
- [ ] Sidebar shows correct icons per section (Kanban: 4, Terminal: 3, Git: 3)
- [ ] Sidebar active icon matches current route
- [ ] Clicking sidebar icons navigates to the correct sub-route
- [ ] Git sub-view switching works via sidebar (replaces inline tabs)
- [ ] Placeholder routes render "coming soon" messages
- [ ] Icons show tooltips on hover
- [ ] All views still work (kanban board, terminal, git diff/branches/history)
- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] Minimum 16px text size maintained
