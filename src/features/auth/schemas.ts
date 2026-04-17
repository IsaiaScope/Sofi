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
