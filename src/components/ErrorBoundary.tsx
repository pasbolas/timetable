import { Component, ErrorInfo, ReactNode } from "react";
import { StorageService } from "../services/storage";
import { AlertTriangle, RotateCw, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      StorageService.clearAllCaches();
    } catch (e) {
      console.warn("Could not clear cache in ErrorBoundary:", e);
    }
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen min-h-[100dvh] w-full bg-black text-white flex items-center justify-center p-4 font-mono select-none">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            {/* Subtle background glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Error Header Icon & Title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-base font-black text-white tracking-tight leading-tight">
                  Something went wrong
                </h1>
                <p className="text-[11px] text-zinc-400 font-medium">
                  An unexpected display or schedule error occurred.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6">
              Don't worry — your degree and course preferences are saved. Reloading the app will resolve transient connection or formatting issues.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col gap-2.5 mb-5">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-black text-xs hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reload Timetable</span>
              </button>

              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 border border-white/15 text-zinc-300 font-bold text-xs hover:bg-zinc-800 hover:text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Clear Cache & Reload</span>
              </button>
            </div>

            {/* Collapsible Technical Error Details */}
            {this.state.error && (
              <div className="border-t border-white/10 pt-3">
                <button
                  onClick={this.toggleDetails}
                  className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 py-1"
                >
                  <span className="font-semibold">Technical Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-white/10 text-[10px] text-red-300 font-mono overflow-x-auto max-h-40 break-all select-text">
                    <p className="font-bold mb-1">{this.state.error.name}: {this.state.error.message}</p>
                    {this.state.error.stack && (
                      <pre className="text-[9px] text-zinc-400 whitespace-pre-wrap leading-tight">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
