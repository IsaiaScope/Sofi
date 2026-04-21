import i18next from "i18next";
import { z } from "zod";

const msg = (key: string) => ({
  get message() {
    return i18next.t(`auth:validation.${key}`);
  },
});

export const loginSchema = z.object({
  email: z.string().email(msg("emailInvalid")),
  password: z.string().min(1, msg("passwordRequired")),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const recoverSchema = z.object({
  email: z.string().email(msg("emailInvalid")),
});
export type RecoverFormData = z.infer<typeof recoverSchema>;

export const recoverConfirmSchema = z
  .object({
    password1: z.string().min(8, msg("passwordMinLength")),
    password2: z.string(),
  })
  .refine((data) => data.password1 === data.password2, {
    get message() {
      return i18next.t("auth:validation.passwordMismatch");
    },
    path: ["password2"],
  });
export type RecoverConfirmFormData = z.infer<typeof recoverConfirmSchema>;

export const registerSchema = z
  .object({
    email: z.string().email(msg("emailInvalid")),
    password1: z.string().min(8, msg("passwordMinLength")),
    password2: z.string(),
    displayName: z.string().optional(),
  })
  .refine((data) => data.password1 === data.password2, {
    get message() {
      return i18next.t("auth:validation.passwordMismatch");
    },
    path: ["password2"],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;
