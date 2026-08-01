import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

function categorizeError(error: Error): string {
  const message = error.message.toLowerCase();
  if (message.includes('network') || message.includes('fetch')) return 'network';
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('permission') || message.includes('unauthorized')) return 'auth';
  if (message.includes('not found')) return 'notfound';
  return 'unknown';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorCategory = categorizeError(error);
    const level = this.props.level || 'page';

    console.error(`[${level.toUpperCase()}] ${errorCategory} error:`, error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  getErrorMessage = (): string => {
    const { error } = this.state;
    if (!error) return 'An unexpected error occurred';

    const category = categorizeError(error);
    const messages: Record<string, string> = {
      network: 'Network connection failed. Please check your internet and try again.',
      timeout: 'Request timed out. The server took too long to respond.',
      auth: 'Authentication failed. Please log in again.',
      notfound: 'The requested resource was not found.',
      unknown: error.message,
    };

    return messages[category] || error.message;
  };

  render() {
    if (this.state.hasError) {
      const level = this.props.level || 'page';
      const isPageLevel = level === 'page';

      if (this.props.fallback) {
        return this.props.fallback;
      }

      if (isPageLevel) {
        return (
          <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <div className="bg-gray-800 rounded-lg border border-red-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <h1 className="text-xl font-bold">Something went wrong</h1>
                </div>

                <p className="text-gray-300 mb-4 text-sm">{this.getErrorMessage()}</p>

                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                      Error details (Attempt #{this.state.retryCount})
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-auto text-red-400 max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                <button
                  onClick={this.handleReset}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded p-3 mb-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-300">Component Error</p>
              <p className="text-xs text-red-200 mt-1">{this.getErrorMessage()}</p>
            </div>
            <button
              onClick={this.handleReset}
              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded text-white flex-shrink-0"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
