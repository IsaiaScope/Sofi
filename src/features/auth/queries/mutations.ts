import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { apiClient, clearClientAuth, setBearerCache } from "@/lib/api-client";
import { ErrorCode, toAppError } from "@/lib/errors";
import { i18n } from "@/lib/i18n";
import { invoke } from "@/lib/tauri";
import {
  type AuthResponse,
  isVerificationPending,
  type LoginInput,
  type OAuthProvider,
  type RegisterInput,
  type RegisterResponse,
} from "../types";
import { authKeys } from "./keys";

async function persistAuth(response: AuthResponse, queryClient: ReturnType<typeof useQueryClient>) {
  await invoke("auth_store_token", { token: response.token });
  setBearerCache(response.token);
  queryClient.setQueryData(authKeys.session(), response.user);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiClient.post<AuthResponse>("/auth/login/", input, { authenticate: false }),
    meta: { suppressToast: true },
    onSuccess: (response) => persistAuth(response, queryClient),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiClient.post<RegisterResponse>("/auth/registration/", input, { authenticate: false }),
    meta: { suppressToast: true },
    onSuccess: (response) => {
      if (!isVerificationPending(response)) {
        return persistAuth(response, queryClient);
      }
      return undefined;
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ detail: string }>(
        "/auth/registration/resend-email/",
        { email },
        { authenticate: false },
      ),
    meta: { suppressToast: true },
  });
}

// Password reset — request phase. Always returns 200 from dj-rest-auth regardless
// of whether the email is registered (intentional: prevents account enumeration).
// The UI commits to the same contract and always shows the success state on 2xx.
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) =>
      apiClient.post<{ detail: string }>(
        "/auth/password/reset/",
        { email },
        { authenticate: false },
      ),
    meta: { suppressToast: true },
  });
}

interface ConfirmPasswordResetInput {
  uid: string;
  token: string;
  new_password1: string;
  new_password2: string;
}

// Password reset — confirm phase. 400 with kind `password_reset.invalid_token`
// means the link is dead (expired, tampered, or malformed uid); any other kind
// came from a password validator and stays inline on the form.
export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (input: ConfirmPasswordResetInput) =>
      apiClient.post<{ detail: string }>("/auth/password/reset/confirm/", input, {
        authenticate: false,
      }),
    meta: { suppressToast: true },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => apiClient.post<void>("/auth/logout/"),
    onSettled: async () => {
      await clearClientAuth();
      queryClient.setQueryData(authKeys.session(), null);
      await router.navigate({ to: "/login" });
    },
  });
}

// OAuth — desktop authorization-code flow with loopback redirect.
// Django holds the provider client_secret and exchanges the code server-side.

const PROVIDER_AUTH_URL: Record<OAuthProvider, string> = {
  google: "https://accounts.google.com/o/oauth2/v2/auth",
  github: "https://github.com/login/oauth/authorize",
};

const PROVIDER_SCOPE: Record<OAuthProvider, string> = {
  google: "openid email profile",
  github: "user:email",
};

function randomState(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function clientIdFor(provider: OAuthProvider): string {
  const id =
    provider === "google"
      ? import.meta.env.VITE_GOOGLE_CLIENT_ID
      : import.meta.env.VITE_GITHUB_CLIENT_ID;
  if (!id) {
    throw toAppError({
      code: ErrorCode.INTERNAL,
      message: `Missing VITE_${provider.toUpperCase()}_CLIENT_ID in build environment.`,
    });
  }
  return id;
}

interface OauthStartResult {
  code: string;
  callback_url: string;
}

export function useOAuthLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (provider: OAuthProvider): Promise<AuthResponse> => {
      const state = randomState();
      const clientId = clientIdFor(provider);
      const scope = PROVIDER_SCOPE[provider];
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        scope,
        state,
      });
      if (provider === "google") params.set("access_type", "offline");
      const partialUrl = `${PROVIDER_AUTH_URL[provider]}?${params.toString()}`;

      const { code, callback_url } = await invoke<OauthStartResult>("oauth_start", {
        // `locale` + `provider` let Rust render a localized, provider-aware
        // success page on the loopback server. `i18n.language` is the live
        // user preference (synced to localStorage + the backend on change).
        args: {
          partial_auth_url: partialUrl,
          expected_state: state,
          locale: i18n.language,
          provider,
        },
      });

      return apiClient.post<AuthResponse>(
        `/auth/${provider}/`,
        { code, callback_url },
        { authenticate: false },
      );
    },
    meta: { suppressToast: true },
    onSuccess: (response) => persistAuth(response, queryClient),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => apiClient.delete<void>("/auth/account/"),
    onSuccess: async () => {
      await clearClientAuth();
      queryClient.setQueryData(authKeys.session(), null);
      await router.navigate({ to: "/login" });
    },
  });
}
