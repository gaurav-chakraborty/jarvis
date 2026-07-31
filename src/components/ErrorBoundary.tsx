import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <div className="bg-gray-800 rounded-lg border border-red-600 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <h1 className="text-xl font-bold">Something went wrong</h1>
                </div>

                <p className="text-gray-300 mb-4 text-sm">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>

                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-300">
                      Error details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-auto text-red-400">
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
        )
      );
    }

    return this.props.children;
  }
}
