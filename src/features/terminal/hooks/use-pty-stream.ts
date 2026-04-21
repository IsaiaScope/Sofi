import type { Terminal } from "@xterm/xterm";
import { useEffect } from "react";
import { listen, writeTerminal } from "@/lib/tauri";
import type { TerminalExitEvent, TerminalOutputEvent } from "../types";

export function usePtyStream(sessionId: string | null, terminal: Terminal | null) {
  useEffect(() => {
    if (!sessionId || !terminal) return;

    let cancelled = false;
    let unlistenOutput: (() => void) | null = null;
    let unlistenExit: (() => void) | null = null;

    // Listen for terminal output
    listen<TerminalOutputEvent>("terminal-output", (event) => {
      if (!cancelled && event.payload.session_id === sessionId) {
        terminal.write(new Uint8Array(event.payload.data));
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlistenOutput = fn;
      }
    });

    // Listen for terminal exit
    listen<TerminalExitEvent>("terminal-exit", (event) => {
      if (!cancelled && event.payload.session_id === sessionId) {
        terminal.writeln("\r\n\x1b[90m[Session ended]\x1b[0m");
      }
    }).then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlistenExit = fn;
      }
    });

    const disposable = terminal.onData((data) => {
      if (!cancelled) writeTerminal(sessionId, data).catch(console.error);
    });

    return () => {
      cancelled = true;
      unlistenOutput?.();
      unlistenExit?.();
      disposable.dispose();
    };
  }, [sessionId, terminal]);
}
