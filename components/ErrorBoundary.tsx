'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full">
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>

              <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>

              <p className="text-muted-foreground mb-6">
                We encountered an unexpected error. Please try refreshing the page or go back to the
                home page.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-muted rounded-md text-left">
                  <p className="text-xs font-mono text-destructive break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
                <a
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
