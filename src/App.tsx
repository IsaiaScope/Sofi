import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { type View, VIEWS } from "@/lib/constants";
import { Board } from "@/features/kanban/components/board";
import { TerminalView } from "@/features/terminal/components/terminal-view";
import { GitView } from "@/features/git/components/git-view";
import { LoginPage } from "@/features/auth/components/login-page";
import { RegisterPage } from "@/features/auth/components/register-page";
import { useAuthStore } from "@/features/auth/store/auth-store";

type AuthPage = "login" | "register";

export default function App() {
  const { user, isLoading, checkSession } = useAuthStore();
  const [activeView, setActiveView] = useState<View>(VIEWS.KANBAN);
  const [authPage, setAuthPage] = useState<AuthPage>("login");

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-sofi-terminal">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-primary border-t-transparent" />
          <p className="text-sm text-sofi-text-muted">Loading Sofi...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    if (authPage === "register") {
      return <RegisterPage onSwitchToLogin={() => setAuthPage("login")} />;
    }
    return <LoginPage onSwitchToRegister={() => setAuthPage("register")} />;
  }

  // Authenticated — main app
  return (
    <AppLayout activeView={activeView} onViewChange={setActiveView}>
      {activeView === VIEWS.KANBAN && (
        <Board
          userId={user.id}
          onClickTerminal={() => setActiveView(VIEWS.TERMINAL)}
        />
      )}
      {activeView === VIEWS.TERMINAL && <TerminalView />}
      {activeView === VIEWS.GIT && <GitView />}
    </AppLayout>
  );
}
