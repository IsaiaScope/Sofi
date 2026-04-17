import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/top-bar/top-bar";

interface AppLayoutProps {
  children: ReactNode;
  onNewTerminalSession?: () => void;
}

export function AppLayout({ children, onNewTerminalSession }: AppLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-sofi-bg">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar onNewTerminalSession={onNewTerminalSession} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
