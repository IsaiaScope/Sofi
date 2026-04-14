import { useState } from "react";
import logo from "@/assets/logo.svg";
import { cn } from "@/lib/cn";
import { APP_NAME } from "@/lib/constants";
import { useAuthStore } from "../store/auth-store";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register, isLoading, error } = useAuthStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({
      username,
      email,
      password,
      display_name: displayName || undefined,
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sofi-terminal p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={logo} alt={APP_NAME} className="h-12 w-12" />
          <h1 className="font-heading text-2xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-sofi-text-muted">Set up your command center</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-sofi-border bg-sofi-surface p-6"
        >
          {error && (
            <div className="mb-4 rounded-lg bg-sofi-red/10 px-3 py-2 text-xs text-sofi-red">
              {error}
            </div>
          )}

          <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-muted">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="mb-4 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
          />

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

          <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-muted">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mb-4 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
          />

          <label className="mb-1 block font-label text-[10px] font-semibold uppercase tracking-wider text-sofi-text-muted">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="mb-6 w-full rounded-lg border border-sofi-border bg-sofi-bg px-3 py-2.5 text-sm text-sofi-text placeholder:text-sofi-text-dim outline-none focus:border-violet-primary"
          />

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
            {isLoading ? "Creating..." : "Initialize Session"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-sofi-text-muted">
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
