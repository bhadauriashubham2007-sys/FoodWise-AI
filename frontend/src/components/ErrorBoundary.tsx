import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Robust React Error Boundary with practical user recovery actions:
 * 1. "Try Again" re-mounts the children component tree without full reload.
 * 2. "Return to Home" safely routes back to root.
 * 3. "Reload Application" performs a fresh document reload.
 * 4. Technical error details and component stacks are shielded in production to prevent information disclosure.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('[ErrorBoundary] Caught runtime error in React component tree:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.state = { hasError: false, error: null, errorInfo: null };
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Shield technical error details in production to prevent information disclosure.
      // Rendered only when import.meta.env.DEV is true.
      const isDev = Boolean(
        import.meta.env?.DEV ??
        ((globalThis as any).process?.env?.NODE_ENV !== 'production')
      );

      return (
        <div className="min-h-[450px] flex items-center justify-center p-6" role="alert" aria-live="assertive">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl text-center space-y-5">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                An unexpected interface error occurred. Your saved deals and preferences remain safe.
              </p>
            </div>

            {/* Recovery Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#FF5E1E] hover:bg-[#E54E12] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return Home</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="p-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center transition-colors"
                title="Reload full application"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Collapsible Error Debug Details: Shielded in production */}
            {isDev && this.state.error && (
              <details className="text-left text-[11px] text-stone-500 bg-stone-50 rounded-xl p-3 border border-stone-200">
                <summary className="cursor-pointer font-semibold text-stone-700 hover:text-stone-900 select-none">
                  Technical Details (Debug)
                </summary>
                <div className="mt-2 space-y-1">
                  <p className="font-mono text-red-700 break-words font-semibold">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="font-mono text-[10px] text-stone-600 overflow-x-auto max-h-32 p-1.5 bg-white rounded border border-stone-200">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
