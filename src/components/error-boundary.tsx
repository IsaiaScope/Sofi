import { Component, type ErrorInfo, type ReactNode } from "react";
import { FaultPage } from "@/components/fault-page";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Sofi] Unhandled error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <FaultPage statusKey="hud.faultRuntime" scope="boundary" error={this.state.error} />;
    }
    return this.props.children;
  }
}
