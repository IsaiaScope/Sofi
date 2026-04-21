import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { WindowChrome } from "@/components/layout/window-chrome";
import { TopBar } from "@/components/top-bar/top-bar";
import { MAIN_LANDMARK_ID } from "@/lib/a11y";

interface AppLayoutProps {
  children: ReactNode;
  onNewTerminalSession?: () => void;
}

export function AppLayout({ children, onNewTerminalSession }: AppLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-sofi-bg pt-8">
      <WindowChrome />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar onNewTerminalSession={onNewTerminalSession} />
        <main
          id={MAIN_LANDMARK_ID}
          tabIndex={-1}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
