import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { apiClient, clearClientAuth, setBearerCache } from "@/lib/api-client";
import { ErrorCode, toAppError } from "@/lib/errors";
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
        args: { partial_auth_url: partialUrl, expected_state: state },
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
