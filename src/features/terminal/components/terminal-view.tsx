export function TerminalView() {
  return (
    <div className="flex h-full flex-col bg-sofi-terminal p-4">
      <div className="mb-3 flex items-center gap-2 border-b border-sofi-border pb-3">
        <span className="text-xs font-semibold text-sofi-green">Terminal</span>
        <span className="text-xs text-sofi-text-dim">|</span>
        <span className="text-xs text-sofi-text-muted">
          xterm.js integration coming in Phase 2
        </span>
      </div>
      <div className="flex-1 font-mono text-sm text-sofi-green/80">
        <p className="text-sofi-text-dim">$ sofi terminal --ready</p>
        <p className="mt-1">Terminal sessions will appear here.</p>
        <p className="mt-1">Click a Kanban card with an active agent to view its terminal.</p>
        <p className="mt-3 animate-pulse">▌</p>
      </div>
    </div>
  );
}
