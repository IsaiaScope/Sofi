import { useEffect, useRef } from "react";
import type { Terminal } from "@xterm/xterm";
import { listen } from "@/lib/tauri";
import { invoke } from "@/lib/tauri";
import type { TerminalOutputEvent, TerminalExitEvent } from "../types";

export function usePtyStream(
  sessionId: string | null,
  terminal: Terminal | null,
) {
  const unlistenOutput = useRef<(() => void) | null>(null);
  const unlistenExit = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sessionId || !terminal) return;

    // Listen for terminal output
    listen<TerminalOutputEvent>("terminal-output", (event) => {
      if (event.payload.session_id === sessionId) {
        terminal.write(new Uint8Array(event.payload.data));
      }
    }).then((unlisten) => {
      unlistenOutput.current = unlisten;
    });

    // Listen for terminal exit
    listen<TerminalExitEvent>("terminal-exit", (event) => {
      if (event.payload.session_id === sessionId) {
        terminal.writeln("\r\n\x1b[90m[Session ended]\x1b[0m");
      }
    }).then((unlisten) => {
      unlistenExit.current = unlisten;
    });

    // Handle user input → PTY write
    const disposable = terminal.onData((data) => {
      invoke("write_terminal", {
        sessionId,
        data: Array.from(new TextEncoder().encode(data)),
      }).catch(console.error);
    });

    return () => {
      unlistenOutput.current?.();
      unlistenExit.current?.();
      disposable.dispose();
    };
  }, [sessionId, terminal]);
}
