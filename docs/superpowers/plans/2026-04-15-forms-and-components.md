# Forms & Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace manual form state with React Hook Form + Zod, replace hand-built Modal/Dropdown with accessible Base UI primitives, and create a reusable component layer styled with Tailwind + CVA.

**Architecture:** Thin UI primitive wrappers in `src/components/ui/` backed by Base UI for accessibility (Dialog, Menu) and native elements for form inputs (Input, Textarea). React Hook Form manages form state with Zod schemas for typed validation. CVA handles Button variants. Minimum text size 16px (`text-base`) for all readable content.

**Tech Stack:** React Hook Form, Zod, @hookform/resolvers, @base-ui/react, class-variance-authority, Tailwind CSS 4, tailwind-merge

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `src/components/ui/button.tsx` | Button with CVA variants (primary, outline, ghost, danger, success) |
| `src/components/ui/input.tsx` | Styled `<input>` with forwardRef for RHF register() |
| `src/components/ui/textarea.tsx` | Styled `<textarea>` with forwardRef |
| `src/components/ui/field.tsx` | Field, FieldLabel, FieldError layout components |
| `src/components/ui/dialog.tsx` | Base UI Dialog wrapper (replaces modal.tsx) |
| `src/components/ui/menu.tsx` | Base UI Menu wrapper (replaces dropdown.tsx) |
| `src/features/auth/schemas.ts` | loginSchema, registerSchema (Zod) |
| `src/features/kanban/schemas.ts` | createBoardSchema, createTaskSchema (Zod) |

### Files to modify

| File | Change |
|------|--------|
| `src/features/auth/components/login-page.tsx` | useForm + loginSchema + UI components |
| `src/features/auth/components/register-page.tsx` | useForm + registerSchema + UI components |
| `src/components/top-bar/top-bar.tsx` | Dialog replaces Modal, Menu replaces Dropdown, useForm for new board |
| `src/features/kanban/components/column.tsx` | useForm for add-task inline form |
| `src/features/kanban/components/task-detail-modal.tsx` | Dialog replaces Modal, useForm for edit fields |

### Files to delete

| File | Replaced by |
|------|------------|
| `src/components/ui/modal.tsx` | `dialog.tsx` |
| `src/components/ui/dropdown.tsx` | `menu.tsx` |

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install all new dependencies**

```bash
pnpm add react-hook-form @hookform/resolvers zod @base-ui/react class-variance-authority
```

- [ ] **Step 2: Verify installation**

```bash
pnpm ls react-hook-form zod @base-ui/react class-variance-authority
```

Expected: all packages listed with versions

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add react-hook-form, zod, base-ui, cva dependencies"
```

---

### Task 2: Create Button component with CVA

**Files:**
- Create: `src/components/ui/button.tsx`

- [ ] **Step 1: Create the Button component**

```tsx
// src/components/ui/button.tsx
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base",
  {
    variants: {
      variant: {
        primary: "bg-violet-primary text-white hover:bg-violet-hover",
        outline:
          "border border-sofi-border bg-transparent text-sofi-text-muted hover:bg-sofi-elevated hover:text-sofi-text",
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
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: add Button component with CVA variants"
```

---

### Task 3: Create Input, Textarea, Field components

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/field.tsx`

- [ ] **Step 1: Create Input**

```tsx
// src/components/ui/input.tsx
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5",
        "text-base text-sofi-text outline-none",
        "focus:border-violet-primary",
        "placeholder:text-sofi-text-dim",
        "aria-[invalid=true]:border-sofi-red",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 2: Create Textarea**

```tsx
// src/components/ui/textarea.tsx
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5",
        "text-base text-sofi-text outline-none",
        "focus:border-violet-primary",
        "placeholder:text-sofi-text-dim",
        "aria-[invalid=true]:border-sofi-red",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
```

- [ ] **Step 3: Create Field, FieldLabel, FieldError**

```tsx
// src/components/ui/field.tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  children: ReactNode;
  className?: string;
}

export function Field({ children, className }: FieldProps) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}

interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

export function FieldLabel({ children, className, ...props }: FieldLabelProps) {
  return (
    <label
      className={cn(
        "block text-base font-semibold uppercase tracking-wider text-sofi-text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

interface FieldErrorProps {
  children?: ReactNode;
  className?: string;
}

export function FieldError({ children, className }: FieldErrorProps) {
  if (!children) return null;
  return <p className={cn("text-base text-sofi-red", className)}>{children}</p>;
}
```

- [ ] **Step 4: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/field.tsx
git commit -m "feat: add Input, Textarea, Field form primitives"
```

---

### Task 4: Create Dialog component (Base UI)

**Files:**
- Create: `src/components/ui/dialog.tsx`

- [ ] **Step 1: Create the Dialog component**

Read the Base UI Dialog docs to confirm the API — check Context7 for `@base-ui/react` Dialog if needed. The component wraps Base UI's Dialog parts with Sofi's dark theme styling.

```tsx
// src/components/ui/dialog.tsx
import type { ReactNode } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <BaseDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border border-sofi-border bg-sofi-surface p-6 shadow-2xl",
            "max-h-[85vh] overflow-y-auto",
            className,
          )}
        >
          {title && (
            <div className="mb-4 flex items-center justify-between">
              <BaseDialog.Title className="font-heading text-lg font-semibold text-white">
                {title}
              </BaseDialog.Title>
              <BaseDialog.Close className="text-sofi-text-dim hover:text-sofi-text text-base">
                ✕
              </BaseDialog.Close>
            </div>
          )}
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
```

Note: Base UI Dialog provides focus trap, `aria-modal`, `role="dialog"`, Escape handling, and return-focus automatically. Verify the import path `@base-ui/react/dialog` is correct by checking node_modules after install.

- [ ] **Step 2: Verify types and that the import path resolves**

```bash
npx tsc --noEmit
```

If `@base-ui/react/dialog` doesn't resolve, check the package exports — it might be `@base-ui/react` with named imports. Adjust the import accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dialog.tsx
git commit -m "feat: add Dialog component wrapping Base UI Dialog"
```

---

### Task 5: Create Menu component (Base UI)

**Files:**
- Create: `src/components/ui/menu.tsx`

- [ ] **Step 1: Create the Menu component**

Read the Base UI Menu docs to confirm the API. The component wraps Base UI's Menu parts with Sofi's dark theme styling, replacing the hand-built Dropdown.

```tsx
// src/components/ui/menu.tsx
import type { ReactNode } from "react";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import { cn } from "@/lib/cn";

interface MenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function Menu({ trigger, children, align = "left", className }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger className="appearance-none border-0 bg-transparent p-0 m-0 cursor-pointer">
        {trigger}
      </BaseMenu.Trigger>
      <BaseMenu.Portal>
        <BaseMenu.Positioner side="bottom" alignment={align === "right" ? "end" : "start"} sideOffset={6}>
          <BaseMenu.Popup
            className={cn(
              "z-40 min-w-[200px] rounded-lg border border-sofi-border bg-sofi-elevated shadow-xl",
              "max-h-[300px] overflow-y-auto",
              className,
            )}
          >
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

interface MenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

export function MenuItem({ children, onClick, active, className }: MenuItemProps) {
  return (
    <BaseMenu.Item
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-base transition-colors cursor-default",
        active
          ? "bg-violet-muted text-white"
          : "text-sofi-text-muted hover:bg-white/5 hover:text-sofi-text data-[highlighted]:bg-white/5 data-[highlighted]:text-sofi-text",
        className,
      )}
    >
      {children}
    </BaseMenu.Item>
  );
}

export function MenuSeparator() {
  return <BaseMenu.Separator className="my-1 h-px bg-sofi-border" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <BaseMenu.GroupLabel className="px-3 py-1.5 text-base font-semibold uppercase tracking-wider text-sofi-text-dim">
      {children}
    </BaseMenu.GroupLabel>
  );
}
```

Note: Verify the import path `@base-ui/react/menu` resolves. Base UI Menu provides arrow key navigation, typeahead, `role="menu"`/`role="menuitem"`, and focus management automatically.

- [ ] **Step 2: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/menu.tsx
git commit -m "feat: add Menu component wrapping Base UI Menu"
```

---

### Task 6: Create Zod schemas

**Files:**
- Create: `src/features/auth/schemas.ts`
- Create: `src/features/kanban/schemas.ts`

- [ ] **Step 1: Create auth schemas**

```tsx
// src/features/auth/schemas.ts
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

- [ ] **Step 2: Create kanban schemas**

```tsx
// src/features/kanban/schemas.ts
import { z } from "zod";

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

- [ ] **Step 3: Verify types**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/schemas.ts src/features/kanban/schemas.ts
git commit -m "feat: add Zod form schemas for auth and kanban"
```

---

### Task 7: Refactor login page

**Files:**
- Modify: `src/features/auth/components/login-page.tsx`

- [ ] **Step 1: Rewrite login page with RHF + UI components**

Replace the entire file content. Key changes:
- Remove all `useState` for form fields
- Use `useForm<LoginFormData>` with `zodResolver(loginSchema)`
- Replace raw `<input>` with `<Input {...form.register("field")} />`
- Replace raw `<label>` with `<FieldLabel>`
- Replace raw `<button type="submit">` with `<Button type="submit" size="lg">`
- Add `<FieldError>` for validation messages
- Update all text sizes to minimum `text-base` (16px)
- Keep mutation error display (backend errors separate from Zod client errors)
- Keep `showPassword` as local `useState` (it's UI state, not form data)

```tsx
// src/features/auth/components/login-page.tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/lib/constants";
import { useLogin } from "../queries/mutations";
import { loginSchema, type LoginFormData } from "../schemas";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sofi-terminal p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={logo} alt={APP_NAME} className="h-12 w-12" />
          <h1 className="font-heading text-2xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-base text-sofi-text-muted">{APP_DESCRIPTION}</p>
        </div>

        {/* Card */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl border border-sofi-border bg-sofi-surface p-6"
        >
          <h2 className="mb-1 text-lg font-semibold text-white">Welcome back</h2>
          <p className="mb-6 text-base text-sofi-text-muted">Access your AI command center</p>

          {loginMutation.error && (
            <div className="mb-4 rounded-lg bg-sofi-red/10 px-3 py-2 text-base text-sofi-red">
              {String(loginMutation.error)}
            </div>
          )}

          {/* Username */}
          <Field className="mb-4">
            <FieldLabel htmlFor="login-username">Username</FieldLabel>
            <Input
              id="login-username"
              {...form.register("username")}
              placeholder="operator"
              autoComplete="username"
              aria-invalid={!!form.formState.errors.username}
            />
            <FieldError>{form.formState.errors.username?.message}</FieldError>
          </Field>

          {/* Password */}
          <Field className="mb-6">
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <button
                type="button"
                className="text-base text-violet-hover hover:underline"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              {...form.register("password")}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!form.formState.errors.password}
            />
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting || loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-sofi-border" />
            <span className="text-base text-sofi-text-dim">OR</span>
            <div className="h-px flex-1 bg-sofi-border" />
          </div>

          {/* GitHub (placeholder) */}
          <Button type="button" variant="outline" size="lg" disabled>
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continue with GitHub
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-base text-sofi-text-muted">
          New operator?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-violet-hover hover:underline"
          >
            Request Access
          </button>
        </p>

        <p className="mt-4 text-center text-base text-sofi-text-dim">v{APP_VERSION}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/components/login-page.tsx
git commit -m "refactor: login page to React Hook Form + Zod + UI components"
```

---

### Task 8: Refactor register page

**Files:**
- Modify: `src/features/auth/components/register-page.tsx`

- [ ] **Step 1: Rewrite register page with RHF + UI components**

Same pattern as login. Key differences: 4 fields (displayName, username, email, password), uses `registerSchema` and `RegisterFormData`. Note that the Zod schema uses `displayName` (camelCase) but the mutation expects `display_name` (snake_case) — transform in onSubmit.

```tsx
// src/features/auth/components/register-page.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";
import { useRegister } from "../queries/mutations";
import { registerSchema, type RegisterFormData } from "../schemas";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const registerMutation = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "", displayName: "" },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate({
      username: data.username,
      email: data.email,
      password: data.password,
      display_name: data.displayName || undefined,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sofi-terminal p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={logo} alt={APP_NAME} className="h-12 w-12" />
          <h1 className="font-heading text-2xl font-bold text-white">Create Account</h1>
          <p className="text-base text-sofi-text-muted">Set up your command center</p>
        </div>

        {/* Card */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl border border-sofi-border bg-sofi-surface p-6"
        >
          {registerMutation.error && (
            <div className="mb-4 rounded-lg bg-sofi-red/10 px-3 py-2 text-base text-sofi-red">
              {String(registerMutation.error)}
            </div>
          )}

          <Field className="mb-4">
            <FieldLabel htmlFor="register-displayName">Display Name</FieldLabel>
            <Input
              id="register-displayName"
              {...form.register("displayName")}
              placeholder="Your name"
            />
          </Field>

          <Field className="mb-4">
            <FieldLabel htmlFor="register-username">Username</FieldLabel>
            <Input
              id="register-username"
              {...form.register("username")}
              placeholder="operator"
              autoComplete="username"
              aria-invalid={!!form.formState.errors.username}
            />
            <FieldError>{form.formState.errors.username?.message}</FieldError>
          </Field>

          <Field className="mb-4">
            <FieldLabel htmlFor="register-email">Email</FieldLabel>
            <Input
              id="register-email"
              type="email"
              {...form.register("email")}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
            />
            <FieldError>{form.formState.errors.email?.message}</FieldError>
          </Field>

          <Field className="mb-6">
            <FieldLabel htmlFor="register-password">Password</FieldLabel>
            <Input
              id="register-password"
              type="password"
              {...form.register("password")}
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
            />
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>

          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting || registerMutation.isPending}
          >
            {registerMutation.isPending ? "Creating..." : "Initialize Session"}
          </Button>
        </form>

        <p className="mt-6 text-center text-base text-sofi-text-muted">
          Already have access?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-violet-hover hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/components/register-page.tsx
git commit -m "refactor: register page to React Hook Form + Zod + UI components"
```

---

### Task 9: Refactor TopBar — Menu replaces Dropdown, Dialog replaces Modal, useForm for new board

**Files:**
- Modify: `src/components/top-bar/top-bar.tsx`

- [ ] **Step 1: Update imports and replace Dropdown/Modal with Menu/Dialog**

Read the current `top-bar.tsx` first. Replace:
- `import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown"` → `import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu"`
- `import { Modal } from "@/components/ui/modal"` → `import { Dialog } from "@/components/ui/dialog"`
- Add: `import { useForm } from "react-hook-form"`, `import { zodResolver } from "@hookform/resolvers/zod"`, `import { Button } from "@/components/ui/button"`, `import { Field, FieldError, FieldLabel } from "@/components/ui/field"`, `import { Input } from "@/components/ui/input"`, `import { createBoardSchema, type CreateBoardFormData } from "@/features/kanban/schemas"`

Replace `useState` for `newBoardName`/`newBoardRepo` with `useForm<CreateBoardFormData>`:

```tsx
const boardForm = useForm<CreateBoardFormData>({
  resolver: zodResolver(createBoardSchema),
  defaultValues: { name: "", repoPath: "" },
});
```

Replace `handleCreateBoard`:
```tsx
const handleCreateBoard = async (data: CreateBoardFormData) => {
  if (!user) return;
  await createBoardMutation.mutateAsync({
    userId: user.id,
    name: data.name,
    repoPath: data.repoPath || undefined,
  });
  boardForm.reset();
  setShowNewBoard(false);
};
```

In JSX:
- `<Dropdown trigger={...}>` → `<Menu trigger={...}>`
- `<DropdownLabel>` → `<MenuLabel>`
- `<DropdownItem>` → `<MenuItem>`
- `<DropdownSeparator />` → `<MenuSeparator />`
- `<Modal open={showNewBoard} ...>` → `<Dialog open={showNewBoard} ...>`
- Replace raw inputs in the new board dialog with `<Field>`, `<FieldLabel>`, `<Input>`, `<FieldError>`, `<Button>`
- Replace the board form body with `<form onSubmit={boardForm.handleSubmit(handleCreateBoard)}>` wrapping the fields
- Update text sizes: NavButton and agent pills can stay smaller as they are decorative nav elements, but the new board form fields must use `text-base`

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

If lint finds formatting issues: `pnpm lint:fix`

- [ ] **Step 3: Commit**

```bash
git add src/components/top-bar/top-bar.tsx
git commit -m "refactor: TopBar to Menu, Dialog, and useForm for new board"
```

---

### Task 10: Refactor column add-task inline form

**Files:**
- Modify: `src/features/kanban/components/column.tsx`

- [ ] **Step 1: Replace useState with useForm for add-task**

Read `column.tsx` first. Replace `useState` for `newTitle` with `useForm<CreateTaskFormData>`. The inline input pattern stays the same (show/hide with `isAdding` toggle), but uses `form.register("title")` and `form.handleSubmit()`.

Key changes:
- Remove `useState` for `newTitle` and `cancelledRef`
- Add `useForm<CreateTaskFormData>` with `zodResolver(createTaskSchema)`
- `form.register("title")` on the input
- On Enter: `form.handleSubmit(onSubmit)()`
- On Escape: `form.reset(); setIsAdding(false)`
- On blur: `form.handleSubmit(onSubmit)()` (same as before — submit on blur)
- After successful submit: `form.reset(); setIsAdding(false)`
- Replace raw `<input>` with `<Input>` component
- Replace `+ Add task` button with `<Button variant="ghost">`
- Update text to minimum `text-base`

```tsx
const taskForm = useForm<CreateTaskFormData>({
  resolver: zodResolver(createTaskSchema),
  defaultValues: { title: "" },
});

const handleTaskSubmit = async (data: CreateTaskFormData) => {
  await createTaskMutation.mutateAsync({ columnId: column.id, boardId, title: data.title });
  taskForm.reset();
  setIsAdding(false);
};

const handleCancel = () => {
  taskForm.reset();
  setIsAdding(false);
};
```

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/features/kanban/components/column.tsx
git commit -m "refactor: column add-task to useForm + createTaskSchema"
```

---

### Task 11: Refactor task detail modal

**Files:**
- Modify: `src/features/kanban/components/task-detail-modal.tsx`

- [ ] **Step 1: Replace Modal with Dialog, replace useState with useForm**

Read `task-detail-modal.tsx` first. Replace:
- `import { Modal } from "@/components/ui/modal"` → `import { Dialog } from "@/components/ui/dialog"`
- Remove `useState` for `title` and `description`
- Add `useForm` with `defaultValues` from task prop
- Use `useEffect` to `form.reset()` when task changes (sync form with new task data)
- Use `form.register("title", { onBlur: handleTitleBlur })` pattern for blur-save
- Replace raw inputs with `<Input>`, `<Textarea>`, `<FieldLabel>`, `<Button>`
- Replace status buttons with `<Button variant="ghost">`
- Update text sizes to `text-base` minimum

```tsx
const form = useForm({
  defaultValues: { title: task?.title ?? "", description: task?.description ?? "" },
});

useEffect(() => {
  if (task) {
    form.reset({ title: task.title, description: task.description ?? "" });
  }
}, [task, form]);
```

Register with blur handlers:
```tsx
<Input
  {...form.register("title")}
  onBlur={() => {
    const value = form.getValues("title").trim();
    if (value && value !== task.title) {
      updateTaskMutation.mutate({ id: task.id, title: value, boardId: task.board_id });
    }
  }}
  className="font-medium text-white"
/>
```

Replace `<Modal open title="Task Details" onClose={onClose}>` with `<Dialog open={!!task} onClose={onClose} title="Task Details">`.

Replace action buttons:
```tsx
<Button variant="success" size="sm" onClick={onOpenTerminal}>Open Terminal</Button>
<Button variant="danger" size="sm" onClick={handleDelete}>Delete Task</Button>
```

- [ ] **Step 2: Verify types and lint**

```bash
npx tsc --noEmit && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/features/kanban/components/task-detail-modal.tsx
git commit -m "refactor: task detail modal to Dialog + useForm"
```

---

### Task 12: Delete old components and final verification

**Files:**
- Delete: `src/components/ui/modal.tsx`
- Delete: `src/components/ui/dropdown.tsx`

- [ ] **Step 1: Verify no remaining imports of old components**

```bash
grep -r "from.*ui/modal" src/
grep -r "from.*ui/dropdown" src/
```

Expected: no matches. If matches remain, update those files first.

- [ ] **Step 2: Delete old files**

```bash
rm src/components/ui/modal.tsx src/components/ui/dropdown.tsx
```

- [ ] **Step 3: Run full verification**

```bash
npx tsc --noEmit && pnpm lint
```

Both must pass with zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old Modal and Dropdown components"
```

---

## Verification Checklist

After all tasks complete, verify manually:

- [ ] Login form validates (submit empty shows "Username is required")
- [ ] Login works end-to-end with backend
- [ ] Register form validates all fields
- [ ] New Board dialog opens, validates name, creates board
- [ ] Add-task inline form validates non-empty title
- [ ] Task detail dialog opens, edits save on blur
- [ ] Dialog traps focus (Tab stays inside)
- [ ] Menu navigates with arrow keys
- [ ] No text below 16px in any form component
- [ ] `npx tsc --noEmit` — zero errors
- [ ] `pnpm lint` — zero errors
