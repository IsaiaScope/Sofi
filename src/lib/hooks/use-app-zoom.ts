import { useEffect } from "react";
import { invoke } from "@/lib/tauri";

const STORAGE_KEY = "sofi:app-zoom";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1.0;

function readStoredZoom(): number {
  if (typeof window === "undefined") return DEFAULT_ZOOM;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_ZOOM;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_ZOOM;
  return clampZoom(parsed);
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 10) / 10));
}

async function applyZoom(zoom: number): Promise<void> {
  const clamped = clampZoom(zoom);
  window.localStorage.setItem(STORAGE_KEY, String(clamped));
  await invoke<number>("set_window_zoom", { zoom: clamped });
}

export function useAppZoom(): void {
  useEffect(() => {
    let current = readStoredZoom();
    if (current !== DEFAULT_ZOOM) void applyZoom(current);

    function handleKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      let next: number | null = null;
      if (event.key === "=" || event.key === "+") {
        next = current + ZOOM_STEP;
      } else if (event.key === "-" || event.key === "_") {
        next = current - ZOOM_STEP;
      } else if (event.key === "0") {
        next = DEFAULT_ZOOM;
      }

      if (next === null) return;
      event.preventDefault();
      current = clampZoom(next);
      void applyZoom(current);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
