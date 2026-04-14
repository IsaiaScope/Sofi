export function GitView() {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-sofi-border pb-3">
        <span className="text-xs font-semibold text-sofi-orange">
          Git — Diff View
        </span>
        <span className="text-xs text-sofi-text-dim">|</span>
        <span className="text-xs text-sofi-text-muted">
          Side-by-side diff coming in Phase 4
        </span>
      </div>
      <div className="flex flex-1 gap-3">
        {/* File list placeholder */}
        <div className="hidden w-48 shrink-0 rounded-lg bg-white/[0.02] p-3 md:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sofi-text-dim">
            Changed Files
          </p>
          <div className="mt-3 space-y-1.5 text-xs text-sofi-text-muted">
            <p className="text-sofi-green">A src/api/registry.ts</p>
            <p className="text-sofi-orange">M src/api/routes.ts</p>
            <p className="text-sofi-green">A tests/registry.test.ts</p>
          </div>
        </div>
        {/* Diff placeholder */}
        <div className="flex-1 rounded-lg bg-white/[0.02] p-4 font-mono text-xs">
          <p className="text-sofi-text-dim">VS Code-style side-by-side diff</p>
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-sofi-border">
            <div className="bg-sofi-terminal p-3">
              <p className="text-sofi-text-dim">// Old version</p>
              <p className="bg-red-500/10 text-red-400">
                - const routes = [];
              </p>
            </div>
            <div className="bg-sofi-terminal p-3">
              <p className="text-sofi-text-dim">// New version</p>
              <p className="bg-green-500/10 text-green-400">
                + const routes = new Map();
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
