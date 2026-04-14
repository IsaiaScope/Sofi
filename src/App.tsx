import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { type View, VIEWS } from "@/lib/constants";
import { Board } from "@/features/kanban/components/board";
import { TerminalView } from "@/features/terminal/components/terminal-view";
import { GitView } from "@/features/git/components/git-view";

export default function App() {
  const [activeView, setActiveView] = useState<View>(VIEWS.KANBAN);

  const handleCardClickTerminal = () => {
    setActiveView(VIEWS.TERMINAL);
  };

  return (
    <AppLayout activeView={activeView} onViewChange={setActiveView}>
      {activeView === VIEWS.KANBAN && (
        <Board onClickTerminal={handleCardClickTerminal} />
      )}
      {activeView === VIEWS.TERMINAL && <TerminalView />}
      {activeView === VIEWS.GIT && <GitView />}
    </AppLayout>
  );
}
