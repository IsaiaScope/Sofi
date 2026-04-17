import { Component, type ErrorInfo, type ReactNode } from "react";
import logo from "@/assets/sofi-icon.svg";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Sofi] Unhandled error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-sofi-bg p-4">
          <div className="w-full max-w-md text-center">
            <img src={logo} alt="Sofi" className="mx-auto mb-4 h-12 w-12" />
            <h1 className="mb-2 font-heading text-xl font-bold text-white">Something went wrong</h1>
            <p className="mb-6 text-base text-sofi-text-muted">
              The application encountered an unexpected error.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-violet-primary px-4 py-2 text-base font-medium text-white hover:bg-violet-hover"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
