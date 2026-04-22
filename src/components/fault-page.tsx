import i18next from "i18next";
import { useState } from "react";
import {
  AuthHeading,
  AuthSubmitButton,
  BracketGlyph,
} from "@/features/auth/components/auth-primitives";
import { AuthShell } from "@/features/auth/components/auth-shell";

interface FaultPageProps {
  /** i18n key for the status line (e.g. `hud.faultRuntime`). */
  statusKey: string;
  /** i18n key prefix in the `errors` namespace (e.g. `boundary`, `route`). */
  scope: "boundary" | "route";
  /** The error that triggered the fault; surfaces in dev-only TRACE expander. */
  error?: unknown;
  /** Override the reload handler. Defaults to `window.location.reload()`. */
  onReload?: () => void;
}

// Shared chassis for every fault surface (error boundary + route loader error).
// Matches the spec's fault palette: amber chrome via AuthShell variant="fault",
// amber warning glyph, violet heading (violet stays the anchor per spec 1e),
// red one-line failure copy, violet RELOAD button ("reload is an action, not a
// warning").
export function FaultPage({ statusKey, scope, error, onReload }: FaultPageProps) {
  const t = (key: string, fallback: string) =>
    i18next.t(`errors:${scope}.${key}`, { defaultValue: fallback });
  const handleReload = onReload ?? (() => window.location.reload());
  const title = t("title", scope === "boundary" ? "SYSTEM FAULT" : "ROUTE FAULT");
  const description = t(
    "description",
    scope === "boundary"
      ? "Core process unresponsive. Reload to recover."
      : "An unexpected error occurred.",
  );
  const reloadLabel = t("reload", "RELOAD");
  // Route fault: include the runtime error message as the failure line.
  const failureLine = scope === "route" && error instanceof Error ? error.message : description;
  return (
    <AuthShell statusKey={statusKey} variant="fault">
      <BracketGlyph icon="warning" color="var(--color-sofi-orange)" label={title} />
      <AuthHeading align="center">{title}</AuthHeading>
      <p className="-mt-2 mb-6 text-center font-mono text-base text-sofi-red">{failureLine}</p>
      <AuthSubmitButton type="button" onClick={handleReload} icon="refresh">
        {reloadLabel}
      </AuthSubmitButton>
      {import.meta.env.DEV && error instanceof Error ? <DevTrace error={error} /> : null}
    </AuthShell>
  );
}

function DevTrace({ error }: { error: Error }) {
  const [open, setOpen] = useState(false);
  const label = i18next.t("errors:boundary.trace", { defaultValue: "TRACE" });
  // First 3 stack frames keep the expander scannable; deeper frames tend to be
  // framework noise that obscures the actual crash site.
  const frames = (error.stack ?? "").split("\n").slice(1, 4).join("\n").trim();
  return (
    <div className="mt-4 border-sofi-orange/20 border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 font-mono text-base text-sofi-text-dim uppercase tracking-wider transition-colors hover:text-sofi-orange"
      >
        <span
          className="material-symbols-outlined !text-[18px] transition-transform"
          style={{ transform: open ? "rotate(90deg)" : undefined }}
        >
          arrow_right
        </span>
        {label}
      </button>
      {open && (
        <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words bg-sofi-terminal/60 p-3 font-mono text-base text-sofi-text-muted">
          {error.message}
          {frames ? `\n${frames}` : ""}
        </pre>
      )}
    </div>
  );
}
