import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { useTerminalStore } from "../store/terminal-store";
import { TerminalInstance } from "./terminal-instance";

export function TerminalView() {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    removeSession,
    loadShells,
  } = useTerminalStore();

  useEffect(() => {
    loadShells();
  }, [loadShells]);

  // Auto-create a session if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      createSession({ label: "Terminal" });
    }
  }, [sessions.length, createSession]);

  return (
    <div className="flex h-full flex-col bg-sofi-terminal">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-sofi-border bg-sofi-surface/50 px-2 py-1">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => setActiveSession(session.id)}
            className={cn(
              "group flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
              session.id === activeSessionId
                ? "bg-sofi-green/15 text-sofi-green"
                : "text-sofi-text-muted hover:bg-sofi-elevated hover:text-sofi-text",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                session.isAgentSession ? "bg-sofi-blue" : "bg-sofi-green",
              )}
            />
            <span className="max-w-[160px] truncate">{session.label}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                removeSession(session.id);
              }}
              onKeyDown={() => {}}
              className="ml-1 hidden text-sofi-text-dim hover:text-sofi-red group-hover:inline"
            >
              x
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => createSession()}
          className="rounded-md px-2 py-1 text-xs text-sofi-text-dim hover:bg-sofi-elevated hover:text-sofi-text"
        >
          +
        </button>
      </div>

      {/* Terminal area */}
      <div className="flex-1 overflow-hidden">
        {sessions.map((session) => (
          <TerminalInstance
            key={session.id}
            sessionId={session.id}
            isActive={session.id === activeSessionId}
          />
        ))}
      </div>
    </div>
  );
}
