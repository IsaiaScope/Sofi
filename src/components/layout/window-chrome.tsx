import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { isMacOS } from "@/lib/platform";

const IS_MAC = isMacOS();

export function WindowChrome() {
  return (
    <>
      <div
        data-tauri-drag-region=""
        className={cn(
          "fixed top-0 z-50 h-8 cursor-grab active:cursor-grabbing",
          IS_MAC ? "right-0 left-20" : "right-36 left-0",
        )}
      />
      {!IS_MAC && <WindowControls />}
    </>
  );
}

function WindowControls() {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    void appWindow.isMaximized().then(setMaximized);
    // onResized fires per pixel during drag — only push state when the boolean flips.
    void appWindow
      .onResized(async () => {
        const next = await appWindow.isMaximized();
        setMaximized((prev) => (prev === next ? prev : next));
      })
      .then((fn) => {
        unlisten = fn;
      });
    return () => unlisten?.();
  }, [appWindow]);

  return (
    <div className="fixed top-0 right-0 z-50 flex h-8">
      <ChromeButton onClick={() => void appWindow.minimize()} label="Minimize" icon="minimize" />
      <ChromeButton
        onClick={() => void appWindow.toggleMaximize()}
        label={maximized ? "Restore" : "Maximize"}
        icon={maximized ? "filter_none" : "crop_square"}
      />
      <ChromeButton
        onClick={() => void appWindow.close()}
        label="Close"
        icon="close"
        variant="danger"
      />
    </div>
  );
}

interface ChromeButtonProps {
  onClick: () => void;
  label: string;
  icon: string;
  variant?: "danger";
}

function ChromeButton({ onClick, label, icon, variant }: ChromeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex w-12 cursor-pointer items-center justify-center text-sofi-text transition-colors",
        variant === "danger" ? "hover:bg-sofi-red hover:text-white" : "hover:bg-white/10",
      )}
    >
      <span className="material-symbols-outlined !text-[18px]">{icon}</span>
    </button>
  );
}
