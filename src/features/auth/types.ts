export interface User {
  id: string;
  email: string;
  display_name: string;
  date_joined: string;
}

export interface AuthResponse {
  token: string;
  expiry: string | null;
  user: User;
}

export interface VerificationPendingResponse {
  detail: string;
}

// /auth/registration/ returns a token only when email verification is
// disabled/optional. Under mandatory verification it returns {detail}.
export type RegisterResponse = AuthResponse | VerificationPendingResponse;

export function isVerificationPending(res: RegisterResponse): res is VerificationPendingResponse {
  return !("token" in res);
}

export interface RegisterInput {
  email: string;
  password1: string;
  password2: string;
  display_name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type OAuthProvider = "google" | "github";
