# Sofi — Forms & Component Library Refactor

## Context

Sofi's forms use manual `useState` per field with no validation. UI primitives (Modal, Dropdown) are hand-built without proper accessibility (no focus trap, no ARIA roles, no keyboard navigation). This design introduces React Hook Form + Zod for form management, Base UI for headless accessible primitives, and a thin component layer styled with Tailwind + CVA.

**Why:** Manual form state doesn't scale — every new form field means another `useState`, `onChange`, and submission handler. The existing Modal lacks focus trap (tabbing escapes the modal), and Dropdown has no keyboard navigation (arrow keys don't work). These are solved problems in Base UI.

**Outcome:** Type-safe forms with validation, accessible UI primitives, and a reusable component layer that follows Sofi's dark-violet theme with a 16px minimum text size.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form library | React Hook Form + `@hookform/resolvers` | Performant (uncontrolled by default), minimal re-renders, `register()` works with native inputs |
| Validation | Zod schemas per feature | Type-safe, reusable, colocated with feature code |
| Headless primitives | Base UI (`@base-ui/react`) first, Radix fallback | Accessible, unstyled, from the Radix/MUI team |
| Styling | Tailwind `className` + `tailwind-merge` | Consistent with existing codebase |
| Variants | CVA (`class-variance-authority`) where reusable | Button has genuine variants (primary/outline/ghost, sm/md/lg); Input does not |
| Min text size | 16px (`text-base`) minimum for all readable text | User requirement — readability on desktop |

---

## UI Primitive Components

All components live in `src/components/ui/`. Each is a thin wrapper around Base UI or native elements, pre-styled with Sofi's theme, accepting `className` for overrides via `tailwind-merge`.

### Button (`button.tsx`) — CVA variants

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base",
  {
    variants: {
      variant: {
        primary: "bg-violet-primary text-white hover:bg-violet-hover",
        outline: "border border-sofi-border bg-transparent text-sofi-text-muted hover:bg-sofi-elevated hover:text-sofi-text",
        ghost: "bg-transparent text-sofi-text-muted hover:bg-white/5 hover:text-sofi-text",
        danger: "bg-sofi-red/10 text-sofi-red hover:bg-sofi-red/20",
        success: "bg-sofi-green/15 text-sofi-green hover:bg-sofi-green/25",
      },
      size: {
        sm: "px-3 py-1.5",
        md: "px-4 py-2.5",
        lg: "w-full py-2.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}
```

**Variants justified:** Button is used in 10+ places with distinct visual treatments — primary submit, outline cancel, ghost nav, danger delete, success terminal-open. CVA keeps these consistent.

### Input (`input.tsx`)

Native `<input>` with Sofi styling. No CVA — one visual style across the app.

```tsx
// Base classes:
// "w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5"
// "text-base text-sofi-text outline-none"
// "focus:border-violet-primary"
// "placeholder:text-sofi-text-dim"
// "aria-[invalid=true]:border-sofi-red"
```

Accepts `React.InputHTMLAttributes<HTMLInputElement>` + `className`. Uses `React.forwardRef` for RHF `register()` compatibility.

### Textarea (`textarea.tsx`)

Same pattern as Input, adds `resize-none` default.

### Field, FieldLabel, FieldError (`field.tsx`)

Layout components for form fields:

- **Field** — `<div className="flex flex-col gap-1.5">` wrapper
- **FieldLabel** — `<label>` styled with `text-base font-semibold text-sofi-text-muted uppercase tracking-wider`
- **FieldError** — `<p>` with `text-base text-sofi-red`, only renders when message is truthy

### Dialog (`dialog.tsx`) — replaces `modal.tsx`

Wraps Base UI `Dialog`:

```tsx
import { Dialog as BaseDialog } from "@base-ui/react/dialog";

// Composed from:
// BaseDialog.Root — open/onOpenChange state
// BaseDialog.Portal — renders in portal
// BaseDialog.Backdrop — dark overlay with backdrop-blur
// BaseDialog.Popup — the panel (focus-trapped, aria-modal)
// BaseDialog.Title — accessible title
// BaseDialog.Close — close button
```

**Gains over current Modal:**
- Focus trap (Tab stays inside modal)
- `aria-modal="true"`, `role="dialog"`
- Return focus to trigger element on close
- Animated mount/unmount (via Base UI's data attributes)

**API stays compatible:** `<Dialog open={open} onClose={onClose} title="..." />`

### Menu (`menu.tsx`) — replaces `dropdown.tsx`

Wraps Base UI `Menu`:

```tsx
import { Menu as BaseMenu } from "@base-ui/react/menu";

// Composed from:
// BaseMenu.Root — open state
// BaseMenu.Trigger — the button that opens the menu
// BaseMenu.Portal + BaseMenu.Positioner — positioning
// BaseMenu.Popup — the dropdown panel
// BaseMenu.Item — focusable, keyboard-navigable items
// BaseMenu.Separator — visual divider
// BaseMenu.Group + BaseMenu.GroupLabel — labeled sections
```

**Gains over current Dropdown:**
- Arrow key navigation between items
- Typeahead (type a letter to jump to matching item)
- `role="menu"` / `role="menuitem"` ARIA
- Proper focus management (focus moves into menu on open)

**API adapts:** `<Menu trigger={<Button>...</Button>}>` with `<MenuItem>`, `<MenuSeparator>`, `<MenuLabel>`.

---

## Form Schemas (Zod)

Schemas live in each feature folder as `schemas.ts`:

### Auth schemas (`src/features/auth/schemas.ts`)

```tsx
import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "At least 6 characters"),
  displayName: z.string().optional(),
});
export type RegisterFormData = z.infer<typeof registerSchema>;
```

### Kanban schemas (`src/features/kanban/schemas.ts`)

```tsx
export const createBoardSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  repoPath: z.string().optional(),
});
export type CreateBoardFormData = z.infer<typeof createBoardSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
});
export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
```

---

## Form Integration Pattern

### Standard form (login, register, new board)

```tsx
const form = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: { username: "", password: "" },
});

const onSubmit = (data: LoginFormData) => {
  loginMutation.mutate(data);
};

return (
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <Field>
      <FieldLabel htmlFor="username">Username</FieldLabel>
      <Input
        id="username"
        {...form.register("username")}
        placeholder="operator"
        aria-invalid={!!form.formState.errors.username}
      />
      <FieldError>{form.formState.errors.username?.message}</FieldError>
    </Field>
    <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
      Sign In
    </Button>
  </form>
);
```

**Key patterns:**
- `form.register("fieldName")` returns `{ name, ref, onChange, onBlur }` — spread directly onto Input
- `aria-invalid` on Input triggers red border via `aria-[invalid=true]:border-sofi-red`
- Error from mutation (backend) shown separately from Zod errors (client validation)
- `form.formState.isSubmitting` disables the button during async submission

### Inline form (column add-task)

For the inline task creation in columns, RHF is still used but lighter — just `register` + `handleSubmit` on the single input. The schema ensures non-empty title.

### Task detail modal

The task detail modal has editable fields (title, description, status) that save on blur. This uses `useForm` with `defaultValues` from the task prop, and individual field blur handlers that call `updateTaskMutation.mutate()`.

---

## Forms to Refactor

| Form | Location | Schema | Mutation |
|------|----------|--------|----------|
| Login | `auth/components/login-page.tsx` | `loginSchema` | `useLogin()` |
| Register | `auth/components/register-page.tsx` | `registerSchema` | `useRegister()` |
| New Board modal | `components/top-bar/top-bar.tsx` | `createBoardSchema` | `useCreateBoard()` |
| Add Task (inline) | `kanban/components/column.tsx` | `createTaskSchema` | `useCreateTask()` |
| Task Detail | `kanban/components/task-detail-modal.tsx` | (per-field updates) | `useUpdateTask()` |

---

## File Structure

### New files

```
src/components/ui/
├── button.tsx       # CVA variants
├── input.tsx        # forwardRef, Sofi-styled
├── textarea.tsx     # forwardRef, Sofi-styled
├── field.tsx        # Field, FieldLabel, FieldError
├── dialog.tsx       # Base UI Dialog wrapper
└── menu.tsx         # Base UI Menu wrapper

src/features/auth/schemas.ts
src/features/kanban/schemas.ts
```

### Files to modify

```
src/features/auth/components/login-page.tsx     — useForm + loginSchema + UI components
src/features/auth/components/register-page.tsx  — useForm + registerSchema + UI components
src/components/top-bar/top-bar.tsx              — Dialog replaces Modal, Menu replaces Dropdown, useForm for new board
src/features/kanban/components/column.tsx        — useForm for add-task
src/features/kanban/components/task-detail-modal.tsx — Dialog + useForm for edit fields
```

### Files to delete

```
src/components/ui/modal.tsx     — replaced by dialog.tsx
src/components/ui/dropdown.tsx  — replaced by menu.tsx
```

---

## Dependencies

### Add

- `react-hook-form` — form state management
- `@hookform/resolvers` — connects Zod to RHF
- `zod` — schema validation
- `@base-ui/react` — headless accessible primitives
- `class-variance-authority` — CVA for Button variants

### Already installed

- `tailwind-merge` — className merging (via `cn()`)
- `clsx` — conditional classes

---

## Migration Strategy

**Phase 1: Create UI primitives** (no breaking changes)
1. Install dependencies
2. Create `button.tsx`, `input.tsx`, `textarea.tsx`, `field.tsx`
3. Create `dialog.tsx` (wrapping Base UI Dialog)
4. Create `menu.tsx` (wrapping Base UI Menu)

**Phase 2: Refactor forms** (one at a time)
1. Create Zod schemas
2. Login page — simplest, proves the pattern
3. Register page — similar pattern
4. New Board modal (in TopBar) — Dialog replaces Modal, useForm replaces useState
5. Column add-task — inline form with useForm
6. Task detail modal — Dialog + per-field useForm

**Phase 3: Clean up**
1. Delete old `modal.tsx` and `dropdown.tsx`
2. Update remaining Modal/Dropdown usages to Dialog/Menu
3. Ensure 16px minimum text size across all touched components

---

## Verification

- [ ] All forms validate on submit (empty fields show errors)
- [ ] Login/register work end-to-end with backend
- [ ] Dialog traps focus (Tab stays inside)
- [ ] Dialog returns focus to trigger on close
- [ ] Menu navigates with arrow keys
- [ ] Menu opens/closes with Enter/Escape
- [ ] No text below 16px in form components
- [ ] `pnpm lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] All existing functionality preserved (no regressions)
