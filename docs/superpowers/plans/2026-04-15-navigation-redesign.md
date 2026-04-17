# Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement IDE-style navigation with a redesigned top bar (icon tabs, colored active states, embedded board badge) and a contextual left sidebar for section sub-views.

**Architecture:** Top bar uses icon + label tabs with section-colored pills for active state. A 44px left sidebar renders contextual icons per section (kanban: board/agents/list/settings, terminal: sessions/new/settings, git: diff/branches/history). Sidebar reads the current route via TanStack Router to determine active state. Git sub-view switching migrates from Zustand state to route navigation.

**Tech Stack:** Material Symbols (Google Fonts), TanStack Router, Tailwind CSS 4, Base UI Menu

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `src/components/layout/sidebar.tsx` | Contextual icon sidebar, renders per-section icons |
| `src/routes/_authenticated/kanban/agents.tsx` | Placeholder route |
| `src/routes/_authenticated/kanban/list.tsx` | Placeholder route |
| `src/routes/_authenticated/kanban/settings.tsx` | Placeholder route |
| `src/routes/_authenticated/terminal/settings.tsx` | Placeholder route |

### Modified files
| File | Change |
|------|--------|
| `index.html` | Add Material Symbols font link |
| `src/components/layout/app-layout.tsx` | Add Sidebar to layout (flex row) |
| `src/components/top-bar/top-bar.tsx` | Redesign NavButton with icons + colored pills + board badge |
| `src/features/git/components/git-view.tsx` | Remove inline sub-view tab bar, use route-based sub-view |
| `src/lib/routes.ts` | Add `getGitSubView()` helper for deriving git sub-view from pathname |

---

### Task 1: Add Material Symbols font and placeholder routes

**Files:**
- Modify: `index.html`
- Create: `src/routes/_authenticated/kanban/agents.tsx`
- Create: `src/routes/_authenticated/kanban/list.tsx`
- Create: `src/routes/_authenticated/kanban/settings.tsx`
- Create: `src/routes/_authenticated/terminal/settings.tsx`

- [ ] **Step 1: Add Material Symbols to index.html**

Add the font link in `<head>` after the viewport meta tag:

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20,400,0" rel="stylesheet" />
```

- [ ] **Step 2: Create placeholder route files**

All 4 files follow the same pattern. Each is a file-based route that renders a centered placeholder message.

`src/routes/_authenticated/kanban/agents.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kanban/agents")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      Agent overview — coming soon
    </div>
  ),
});
```

`src/routes/_authenticated/kanban/list.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kanban/list")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      List view — coming soon
    </div>
  ),
});
```

`src/routes/_authenticated/kanban/settings.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/kanban/settings")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      Board settings — coming soon
    </div>
  ),
});
```

`src/routes/_authenticated/terminal/settings.tsx`:
```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/terminal/settings")({
  component: () => (
    <div className="flex h-full items-center justify-center text-base text-sofi-text-muted">
      Shell settings — coming soon
    </div>
  ),
});
```

- [ ] **Step 3: Regenerate route tree**

Start Vite briefly to trigger the TanStack Router plugin:
```bash
pnpm vite --mode development &
sleep 5 && kill %1 2>/dev/null; wait 2>/dev/null
```

Verify `src/routeTree.gen.ts` includes the new routes.

- [ ] **Step 4: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add index.html src/routes/_authenticated/kanban/agents.tsx src/routes/_authenticated/kanban/list.tsx src/routes/_authenticated/kanban/settings.tsx src/routes/_authenticated/terminal/settings.tsx src/routeTree.gen.ts
git commit -m "feat: add Material Symbols font and placeholder sub-view routes"
```

---

### Task 2: Create Sidebar component

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Modify: `src/lib/routes.ts`

- [ ] **Step 1: Add git sub-view helper to routes.ts**

Read `src/lib/routes.ts` and add a helper function to derive the git sub-view from the pathname. This replaces the `useGitUIStore.subView` state for git sub-navigation.

Add to the end of `src/lib/routes.ts`:

```tsx
export type GitSubView = "diff" | "branches" | "history";

export function getGitSubView(pathname: string): GitSubView {
  if (pathname.includes("/git/branches")) return "branches";
  if (pathname.includes("/git/history")) return "history";
  return "diff";
}
```

- [ ] **Step 2: Create the Sidebar component**

```tsx
// src/components/layout/sidebar.tsx
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback } from "react";
import { cn } from "@/lib/cn";
import { type AppSection, getActiveSection, getGitSubView } from "@/lib/routes";

interface SidebarItem {
  icon: string;
  label: string;
  route?: string;
  action?: () => void;
  position?: "bottom";
}

const SECTION_ITEMS: Record<AppSection, SidebarItem[]> = {
  kanban: [
    { icon: "dashboard", label: "Board", route: "/kanban" },
    { icon: "smart_toy", label: "Agents", route: "/kanban/agents" },
    { icon: "view_list", label: "List", route: "/kanban/list" },
    { icon: "settings", label: "Settings", route: "/kanban/settings", position: "bottom" },
  ],
  terminal: [
    { icon: "terminal", label: "Sessions", route: "/terminal" },
    { icon: "add", label: "New Session" },
    { icon: "settings", label: "Settings", route: "/terminal/settings", position: "bottom" },
  ],
  git: [
    { icon: "difference", label: "Diff", route: "/git" },
    { icon: "account_tree", label: "Branches", route: "/git/branches" },
    { icon: "history", label: "History", route: "/git/history" },
  ],
  settings: [],
};

const SECTION_COLORS: Record<AppSection, string> = {
  kanban: "bg-[#1a3a6e] text-[#adc6ff]",
  terminal: "bg-sofi-green/15 text-sofi-green",
  git: "bg-sofi-orange/15 text-sofi-orange",
  settings: "",
};

function isItemActive(item: SidebarItem, pathname: string, section: AppSection): boolean {
  if (!item.route) return false;
  if (section === "git") {
    const gitSub = getGitSubView(pathname);
    if (item.route === "/git" && gitSub === "diff") return true;
    if (item.route === "/git/branches" && gitSub === "branches") return true;
    if (item.route === "/git/history" && gitSub === "history") return true;
    return false;
  }
  // For kanban/terminal: exact match or starts-with for index routes
  if (item.route === `/${section}`) {
    // Default route — active when no sub-route matches
    const subItems = SECTION_ITEMS[section].filter((i) => i.route && i.route !== `/${section}`);
    return !subItems.some((i) => i.route && pathname.startsWith(i.route));
  }
  return item.route ? pathname.startsWith(item.route) : false;
}

interface SidebarProps {
  onNewTerminalSession?: () => void;
}

export function Sidebar({ onNewTerminalSession }: SidebarProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeSection = getActiveSection(pathname);
  const items = SECTION_ITEMS[activeSection];

  const handleClick = useCallback(
    (item: SidebarItem) => {
      if (item.route) {
        navigate({ to: item.route });
      } else if (item.label === "New Session" && onNewTerminalSession) {
        onNewTerminalSession();
      }
    },
    [navigate, onNewTerminalSession],
  );

  if (items.length === 0) return null;

  const topItems = items.filter((i) => i.position !== "bottom");
  const bottomItems = items.filter((i) => i.position === "bottom");

  return (
    <aside className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-sofi-border bg-sofi-bg py-2">
      {topItems.map((item) => (
        <SidebarIcon
          key={item.icon + item.label}
          icon={item.icon}
          label={item.label}
          active={isItemActive(item, pathname, activeSection)}
          activeColor={SECTION_COLORS[activeSection]}
          onClick={() => handleClick(item)}
        />
      ))}
      <div className="flex-1" />
      {bottomItems.map((item) => (
        <SidebarIcon
          key={item.icon + item.label}
          icon={item.icon}
          label={item.label}
          active={isItemActive(item, pathname, activeSection)}
          activeColor={SECTION_COLORS[activeSection]}
          onClick={() => handleClick(item)}
        />
      ))}
    </aside>
  );
}

interface SidebarIconProps {
  icon: string;
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
}

function SidebarIcon({ icon, label, active, activeColor, onClick }: SidebarIconProps) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        active ? activeColor : "text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text",
      )}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </button>
  );
}
```

- [ ] **Step 3: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx src/lib/routes.ts
git commit -m "feat: add contextual Sidebar component with per-section icons"
```

---

### Task 3: Update AppLayout to include Sidebar

**Files:**
- Modify: `src/components/layout/app-layout.tsx`

- [ ] **Step 1: Add Sidebar to the layout**

Read `src/components/layout/app-layout.tsx`. Currently it's:
```tsx
<div className="flex h-screen flex-col bg-sofi-bg">
  <TopBar />
  <main className="flex-1 overflow-hidden">{children}</main>
</div>
```

Change to a flex-row body with Sidebar + content:

```tsx
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/top-bar/top-bar";

interface AppLayoutProps {
  children: ReactNode;
  onNewTerminalSession?: () => void;
}

export function AppLayout({ children, onNewTerminalSession }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-sofi-bg">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onNewTerminalSession={onNewTerminalSession} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

Fix formatting if needed: `pnpm lint:fix`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/app-layout.tsx
git commit -m "feat: add Sidebar to AppLayout"
```

---

### Task 4: Redesign TopBar with icon tabs

**Files:**
- Modify: `src/components/top-bar/top-bar.tsx`

- [ ] **Step 1: Redesign the NavButton and top bar**

Read `src/components/top-bar/top-bar.tsx`. Replace the `NavButton` component and update the header layout.

Key changes:
1. **NavButton** → redesign with Material Symbols icon + label, section-colored pill when active, no border when inactive
2. **Kanban tab** — when active, embed board name as a badge inside the pill; dropdown arrow stays for the Menu trigger
3. **Terminal/Git tabs** — simple icon + label, no dropdown
4. **Agent pills** — update to use inline status dots with `text-base` font size
5. **Add settings gear and notification bell** before user avatar
6. **Remove the dropdown chevron SVG** from non-dropdown tabs

Replace the `NavButton` component with `SectionTab`:

```tsx
interface SectionTabProps {
  icon: string;
  label: string;
  isActive: boolean;
  activeColor: string;
  badge?: string;
  onClick?: () => void;
}

function SectionTab({ icon, label, isActive, activeColor, badge, onClick }: SectionTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-base font-medium transition-colors",
        isActive
          ? `${activeColor} text-white`
          : "text-sofi-text-muted hover:bg-white/5 hover:text-sofi-text",
      )}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      <span className="hidden md:inline">{label}</span>
      {badge && isActive && (
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm font-semibold">
          {badge}
        </span>
      )}
    </button>
  );
}
```

In the header JSX:
- Kanban Menu trigger: `<SectionTab icon="dashboard" label="Kanban" isActive={activeView === "kanban"} activeColor="bg-[#0e69dc]" badge={activeBoard?.name} />`
- Terminal: `<SectionTab icon="terminal" label="Terminal" isActive={activeView === "terminal"} activeColor="bg-sofi-green" onClick={() => navigate({ to: "/terminal" })} />`
- Git: `<SectionTab icon="account_tree" label="Git" isActive={activeView === "git"} activeColor="bg-sofi-orange" onClick={() => navigate({ to: "/git" })} />`

Add settings and notification icons before the user avatar:
```tsx
<button
  type="button"
  onClick={() => navigate({ to: "/settings" })}
  className="flex h-8 w-8 items-center justify-center rounded-lg text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text"
>
  <span className="material-symbols-outlined text-xl">settings</span>
</button>
<button
  type="button"
  className="flex h-8 w-8 items-center justify-center rounded-lg text-sofi-text-dim hover:bg-white/5 hover:text-sofi-text"
>
  <span className="material-symbols-outlined text-xl">notifications</span>
</button>
```

Update agent pills: change `text-[10px]` to `text-base`.

Remove the old `NavButton` component entirely after replacing all usages with `SectionTab`.

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

Fix formatting: `pnpm lint:fix`

- [ ] **Step 3: Commit**

```bash
git add src/components/top-bar/top-bar.tsx
git commit -m "feat: redesign TopBar with icon tabs and colored active states"
```

---

### Task 5: Migrate Git sub-view switching from state to routes

**Files:**
- Modify: `src/features/git/components/git-view.tsx`

- [ ] **Step 1: Replace sub-view tab bar with route-based navigation**

Read `src/features/git/components/git-view.tsx`. Changes:

1. **Remove the inline sub-view tab bar** (lines 64-86 — the `<div>` with diff/branches/history buttons). The sidebar now handles this navigation.
2. **Replace `subView` from Zustand** with `getGitSubView(pathname)` from `@/lib/routes`.
3. **Import `useRouterState` from `@tanstack/react-router`** to read pathname.
4. **Remove `setSubView` usage** — sidebar navigates via routes.
5. **Change the branches/history query hooks** — instead of `subView === "branches" ? repoPath : null`, use the route-derived sub-view.
6. **Keep `selectedFile`, `setSelectedFile`, `repoPath`, `setRepoPath`** from `useGitUIStore` — these are still UI state.

Updated imports:
```tsx
import { useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useKanbanUIStore } from "@/features/kanban/store/kanban-ui-store";
import { cn } from "@/lib/cn";
import { getGitSubView } from "@/lib/routes";
import { useGitBranches, useGitDiff, useGitHistory, useGitStatus } from "../queries/hooks";
import { useGitUIStore } from "../store/git-ui-store";
import { DiffViewer } from "./diff-viewer";
```

Replace the subView line:
```tsx
// Old:
const { subView, setSubView, selectedFile, ... } = useGitUIStore();

// New:
const { selectedFile, setSelectedFile, repoPath, setRepoPath } = useGitUIStore();
const pathname = useRouterState({ select: (s) => s.location.pathname });
const subView = getGitSubView(pathname);
```

Update the query hooks to use route-derived subView:
```tsx
const branchesQuery = useGitBranches(subView === "branches" ? repoPath : null);
const historyQuery = useGitHistory(subView === "history" ? repoPath : null);
```

**Remove the entire sub-view tab bar** (the `<div className="flex shrink-0 ...">` block with the diff/branches/history buttons and the file count). The content rendering (`subView === "diff"`, `subView === "branches"`, `subView === "history"`) stays the same.

Also add a file count display near the top of the diff view instead (since the tab bar is gone):
```tsx
{subView === "diff" && (
  <div className="flex flex-1 overflow-hidden">
    {/* File sidebar with count header */}
    <div className="hidden w-52 shrink-0 overflow-y-auto border-r border-sofi-border bg-white/[0.01] p-2 md:block">
      <p className="mb-2 text-base font-semibold uppercase tracking-wider text-sofi-text-dim">
        Changed Files
        {files.length > 0 && (
          <span className="ml-2 text-base font-normal text-sofi-text-dim">
            {files.length}
          </span>
        )}
      </p>
```

- [ ] **Step 2: Remove `subView` and `setSubView` from git-ui-store**

Read `src/features/git/store/git-ui-store.ts`. Remove `subView` and `setSubView` from the interface and store since they're now route-derived:

```tsx
import { create } from "zustand";

interface GitUIState {
  repoPath: string | null;
  selectedFile: string | null;
  setRepoPath: (path: string | null) => void;
  setSelectedFile: (path: string | null) => void;
}

export const useGitUIStore = create<GitUIState>((set) => ({
  repoPath: null,
  selectedFile: null,
  setRepoPath: (path) => set({ repoPath: path }),
  setSelectedFile: (path) => set({ selectedFile: path }),
}));
```

Also remove the `GitSubView` import from `../types` if it was only used here. Check if it's used elsewhere first.

- [ ] **Step 3: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

Fix formatting: `pnpm lint:fix`

- [ ] **Step 4: Commit**

```bash
git add src/features/git/components/git-view.tsx src/features/git/store/git-ui-store.ts
git commit -m "refactor: migrate Git sub-view switching from Zustand state to routes"
```

---

### Task 6: Final verification

**Files:** None (verification only)

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors

- [ ] **Step 2: Lint check**

```bash
pnpm lint
```

Expected: zero errors. Fix with `pnpm lint:fix` if needed.

- [ ] **Step 3: Manual verification checklist**

Run `pnpm tauri dev` (or `pnpm vite` for frontend-only) and verify:

- [ ] Top bar shows section tabs with Material Symbols icons
- [ ] Kanban tab has blue pill with board name badge when active
- [ ] Terminal tab has green pill when active
- [ ] Git tab has orange pill when active
- [ ] Sidebar shows Kanban icons (board/agents/list/settings) when Kanban is active
- [ ] Sidebar shows Terminal icons (sessions/new/settings) when Terminal is active
- [ ] Sidebar shows Git icons (diff/branches/history) when Git is active
- [ ] Settings has no sidebar
- [ ] Clicking sidebar icons navigates correctly
- [ ] Git sub-view switching works via sidebar (diff/branches/history)
- [ ] Placeholder routes show "coming soon" messages
- [ ] Agent pills visible in top bar
- [ ] Settings gear and notification bell visible
- [ ] User avatar dropdown works
- [ ] Board dropdown works from Kanban tab
- [ ] All text minimum 16px

- [ ] **Step 4: Commit if any fixes were made**

```bash
git add -A
git commit -m "fix: navigation redesign polish"
```
