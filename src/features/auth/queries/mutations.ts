import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@/lib/tauri";
import type { AuthResponse, LoginInput, RegisterInput } from "../types";
import { authKeys } from "./keys";

const STORAGE_KEY = "sofi_token";

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => invoke<AuthResponse>("login", { input }),
    meta: { suppressToast: true },
    onSuccess: (response) => {
      localStorage.setItem(STORAGE_KEY, response.token);
      queryClient.setQueryData(authKeys.session(), response.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => invoke<AuthResponse>("register", { input }),
    meta: { suppressToast: true },
    onSuccess: (response) => {
      localStorage.setItem(STORAGE_KEY, response.token);
      queryClient.setQueryData(authKeys.session(), response.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return () => {
    localStorage.removeItem(STORAGE_KEY);
    queryClient.setQueryData(authKeys.session(), null);
  };
}
