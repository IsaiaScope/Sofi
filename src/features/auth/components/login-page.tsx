import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import wordmark from "@/assets/sofi-wordmark.svg";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/lib/constants";
import { useLogin } from "../queries/mutations";
import { type LoginFormData, loginSchema } from "../schemas";

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
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={wordmark} alt={APP_NAME} className="h-14" />
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
              {loginMutation.error.message}
            </div>
          )}

          {/* Username */}
          <Field className="mb-4">
            <FieldLabel>Username</FieldLabel>
            <Input
              {...form.register("username")}
              placeholder="operator"
              aria-invalid={!!form.formState.errors.username}
            />
            <FieldError>{form.formState.errors.username?.message}</FieldError>
          </Field>

          {/* Password */}
          <Field className="mb-6">
            <div className="flex items-center justify-between">
              <FieldLabel>Password</FieldLabel>
              <button
                type="button"
                className="text-base text-violet-hover hover:underline"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <Input
              {...form.register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
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

          {/* GitHub (placeholder for Phase 2 OAuth) */}
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
