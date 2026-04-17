import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import wordmark from "@/assets/sofi-wordmark.svg";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/lib/constants";
import { useRegister } from "../queries/mutations";
import { type RegisterFormData, registerSchema } from "../schemas";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const registerMutation = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", username: "", email: "", password: "" },
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
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={wordmark} alt={APP_NAME} className="h-14" />
          <h1 className="font-heading text-xl font-bold text-white">Create Account</h1>
          <p className="text-base text-sofi-text-muted">Set up your command center</p>
        </div>

        {/* Card */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="rounded-xl border border-sofi-border bg-sofi-surface p-6"
        >
          {registerMutation.error && (
            <div className="mb-4 rounded-lg bg-sofi-red/10 px-3 py-2 text-base text-sofi-red">
              {registerMutation.error.message}
            </div>
          )}

          {/* Display Name */}
          <Field className="mb-4">
            <FieldLabel>Display Name</FieldLabel>
            <Input
              {...form.register("displayName")}
              placeholder="Your name"
              aria-invalid={!!form.formState.errors.displayName}
            />
            <FieldError>{form.formState.errors.displayName?.message}</FieldError>
          </Field>

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

          {/* Email */}
          <Field className="mb-4">
            <FieldLabel>Email</FieldLabel>
            <Input
              {...form.register("email")}
              type="email"
              placeholder="you@example.com"
              aria-invalid={!!form.formState.errors.email}
            />
            <FieldError>{form.formState.errors.email?.message}</FieldError>
          </Field>

          {/* Password */}
          <Field className="mb-6">
            <FieldLabel>Password</FieldLabel>
            <Input
              {...form.register("password")}
              type="password"
              placeholder="••••••••"
              aria-invalid={!!form.formState.errors.password}
            />
            <FieldError>{form.formState.errors.password?.message}</FieldError>
          </Field>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            disabled={form.formState.isSubmitting || registerMutation.isPending}
          >
            {registerMutation.isPending ? "Creating..." : "Initialize Session"}
          </Button>
        </form>

        {/* Footer */}
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
