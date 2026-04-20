import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useRegister } from "../queries/mutations";
import { type RegisterFormData, registerSchema } from "../schemas";
import { isVerificationPending } from "../types";
import { AuthShell } from "./auth-shell";
import { ErrorBanner } from "./error-banner";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onVerificationPending: (email: string) => void;
  onAuthenticated: () => void;
}

export function RegisterPage({
  onSwitchToLogin,
  onVerificationPending,
  onAuthenticated,
}: RegisterPageProps) {
  const { t } = useTranslation("auth");
  const registerMutation = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: "", email: "", password1: "", password2: "" },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(
      {
        email: data.email,
        password1: data.password1,
        password2: data.password2,
        display_name: data.displayName || undefined,
      },
      {
        onSuccess: (response) => {
          if (isVerificationPending(response)) {
            onVerificationPending(data.email);
          } else {
            onAuthenticated();
          }
        },
      },
    );
  };

  return (
    <AuthShell
      footer={
        <>
          {t("register.haveAccess")}{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-violet-hover hover:underline"
          >
            {t("register.signIn")}
          </button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <h1 className="-mt-2 mb-6 text-center font-heading text-lg font-semibold text-sofi-text">
          {t("register.title")}
        </h1>

        {registerMutation.error && <ErrorBanner message={registerMutation.error.message} />}

        <Field className="mb-4">
          <FieldLabel>{t("register.displayNameLabel")}</FieldLabel>
          <Input
            {...form.register("displayName")}
            placeholder={t("register.displayNamePlaceholder")}
            aria-invalid={!!form.formState.errors.displayName}
          />
          <FieldError>{form.formState.errors.displayName?.message}</FieldError>
        </Field>

        <Field className="mb-4">
          <FieldLabel>{t("register.emailLabel")}</FieldLabel>
          <Input
            {...form.register("email")}
            type="email"
            placeholder={t("register.emailPlaceholder")}
            aria-invalid={!!form.formState.errors.email}
          />
          <FieldError>{form.formState.errors.email?.message}</FieldError>
        </Field>

        <Field className="mb-4">
          <FieldLabel>{t("register.passwordLabel")}</FieldLabel>
          <PasswordInput
            {...form.register("password1")}
            placeholder="••••••••"
            aria-invalid={!!form.formState.errors.password1}
          />
          <FieldError>{form.formState.errors.password1?.message}</FieldError>
        </Field>

        <Field className="mb-6">
          <FieldLabel>{t("register.confirmPasswordLabel")}</FieldLabel>
          <PasswordInput
            {...form.register("password2")}
            placeholder="••••••••"
            aria-invalid={!!form.formState.errors.password2}
          />
          <FieldError>{form.formState.errors.password2?.message}</FieldError>
        </Field>

        <Button
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting || registerMutation.isPending}
        >
          {registerMutation.isPending ? t("register.creating") : t("register.signUp")}
        </Button>
      </form>
    </AuthShell>
  );
}
