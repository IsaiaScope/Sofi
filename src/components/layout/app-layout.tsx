import type { ReactNode } from "react";
import { type View, VIEWS } from "@/lib/constants";
import { TopBar } from "@/components/top-bar/top-bar";

interface AppLayoutProps {
  activeView: View;
  onViewChange: (view: View) => void;
  children: ReactNode;
}

export function AppLayout({
  activeView,
  onViewChange,
  children,
}: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-sofi-bg">
      <TopBar activeView={activeView} onViewChange={onViewChange} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
