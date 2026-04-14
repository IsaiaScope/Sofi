import { cn } from "@/lib/cn";
import type { DiffHunk } from "../types";

interface DiffViewerProps {
  hunks: DiffHunk[];
  selectedFile: string | null;
}

export function DiffViewer({ hunks, selectedFile }: DiffViewerProps) {
  const filteredHunks = selectedFile ? hunks.filter((h) => h.file_path === selectedFile) : hunks;

  if (filteredHunks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-sofi-text-dim">
        {selectedFile ? "No changes in this file" : "No changes to display"}
      </div>
    );
  }

  // Build side-by-side view
  return (
    <div className="h-full overflow-auto font-mono text-xs">
      {filteredHunks.map((hunk, hunkIdx) => {
        const oldLines: { lineno: number | null; content: string; type: string }[] = [];
        const newLines: { lineno: number | null; content: string; type: string }[] = [];

        for (const line of hunk.lines) {
          if (line.origin === "-") {
            oldLines.push({ lineno: line.old_lineno, content: line.content, type: "del" });
          } else if (line.origin === "+") {
            newLines.push({ lineno: line.new_lineno, content: line.content, type: "add" });
          } else {
            // Pad shorter side to keep sync
            while (oldLines.length < newLines.length) {
              oldLines.push({ lineno: null, content: "", type: "empty" });
            }
            while (newLines.length < oldLines.length) {
              newLines.push({ lineno: null, content: "", type: "empty" });
            }
            oldLines.push({ lineno: line.old_lineno, content: line.content, type: "ctx" });
            newLines.push({ lineno: line.new_lineno, content: line.content, type: "ctx" });
          }
        }
        // Final pad
        while (oldLines.length < newLines.length) {
          oldLines.push({ lineno: null, content: "", type: "empty" });
        }
        while (newLines.length < oldLines.length) {
          newLines.push({ lineno: null, content: "", type: "empty" });
        }

        return (
          <div key={`hunk-${hunkIdx}-${hunk.old_start}`}>
            {/* Hunk header */}
            <div className="sticky top-0 bg-sofi-elevated/80 px-4 py-1 text-[10px] text-sofi-text-dim backdrop-blur">
              {hunk.file_path} @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},
              {hunk.new_lines} @@
            </div>
            {/* Side-by-side */}
            <div className="grid grid-cols-2">
              {/* Old (left) */}
              <div className="border-r border-sofi-border">
                {oldLines.map((line, i) => (
                  <div
                    key={`old-${i}`}
                    className={cn(
                      "flex min-h-[1.5em] whitespace-pre",
                      line.type === "del" && "bg-red-500/10",
                      line.type === "empty" && "bg-sofi-terminal/50",
                    )}
                  >
                    <span className="inline-block w-10 shrink-0 select-none pr-2 text-right text-sofi-text-dim/50">
                      {line.lineno ?? ""}
                    </span>
                    <span
                      className={cn(
                        "flex-1",
                        line.type === "del" && "text-red-400",
                        line.type === "ctx" && "text-sofi-text/70",
                      )}
                    >
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
              {/* New (right) */}
              <div>
                {newLines.map((line, i) => (
                  <div
                    key={`new-${i}`}
                    className={cn(
                      "flex min-h-[1.5em] whitespace-pre",
                      line.type === "add" && "bg-green-500/10",
                      line.type === "empty" && "bg-sofi-terminal/50",
                    )}
                  >
                    <span className="inline-block w-10 shrink-0 select-none pr-2 text-right text-sofi-text-dim/50">
                      {line.lineno ?? ""}
                    </span>
                    <span
                      className={cn(
                        "flex-1",
                        line.type === "add" && "text-green-400",
                        line.type === "ctx" && "text-sofi-text/70",
                      )}
                    >
                      {line.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
