import { useState } from "react";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/cn";
import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "@/lib/constants";
import { useAuthStore } from "../store/auth-store";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ username, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sofi-terminal p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={logo} alt={APP_NAME} className="h-12 w-12" />
          <h1 className="font-heading text-2xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-sm text-sofi-text-muted">{APP_DESCRIPTION}</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-sofi-border bg-sofi-surface p-6"
        >
          <h2 className="mb-1 text-lg font-semibold text-white">Welcome back</h2>
          <p className="mb-6 text-xs text-sofi-text-muted">Access your AI command center</p>

          {error && (
            <div className="mb-4 rounded-lg bg-sofi-red/10 px-3 py-2 text-xs text-sofi-red">
              {error}
            </div>
          )}

          {/* Username */}
          <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-muted">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="operator"
            required
            className="mb-4 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
          />

          {/* Password */}
          <div className="mb-1 flex items-center justify-between">
            <label className="font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-muted">
              Password
            </label>
            <button
              type="button"
              className="text-[10px] text-violet-hover hover:underline"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mb-6 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors",
              isLoading
                ? "cursor-not-allowed bg-violet-primary/50"
                : "bg-violet-primary hover:bg-violet-hover",
            )}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-sofi-border" />
            <span className="text-[10px] text-sofi-text-dim">OR</span>
            <div className="h-px flex-1 bg-sofi-border" />
          </div>

          {/* GitHub (placeholder for Phase 2 OAuth) */}
          <button
            type="button"
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-sofi-border py-2.5 text-sm text-sofi-text-muted transition-colors hover:border-white/15 disabled:opacity-40"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continue with GitHub
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-sofi-text-muted">
          New operator?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold text-violet-hover hover:underline"
          >
            Request Access
          </button>
        </p>

        <p className="mt-4 text-center text-[10px] text-sofi-text-dim">v{APP_VERSION}</p>
      </div>
    </div>
  );
}
