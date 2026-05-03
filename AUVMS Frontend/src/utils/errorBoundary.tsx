/**
 * Frontend Error Boundaries and Error Handling
 */

import React, { ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, stack: string) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  stack: string | null;
}

/**
 * Error Boundary component for React applications
 * Catches errors in child components and displays fallback UI
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      stack: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      stack: error.stack || null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo.componentStack);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      stack: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback
        ? this.props.fallback(this.state.error, this.resetError)
        : this.renderDefaultFallback();
    }

    return this.props.children;
  }

  private renderDefaultFallback() {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1>Something went wrong</h1>
        <p>{this.state.error?.message}</p>
        {process.env.NODE_ENV === "development" && (
          <pre
            style={{ textAlign: "left", overflow: "auto", maxHeight: "200px" }}
          >
            {this.state.stack}
          </pre>
        )}
        <button onClick={this.resetError}>Try again</button>
      </div>
    );
  }
}

/**
 * Hook for handling async errors in functional components
 */
export const useAsyncError = () => {
  const [, setError] = React.useState<Error | null>(null);

  React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    [setError],
  );

  return setError;
};

/**
 * Async error handler wrapper
 */
export const handleAsyncError = async <T,>(
  asyncFunction: () => Promise<T>,
  errorCallback?: (error: Error) => void,
): Promise<T | null> => {
  try {
    return await asyncFunction();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    errorCallback?.(err);
    console.error("Async operation failed:", err);
    return null;
  }
};

/**
 * API error response handler
 */
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    if ("message" in error) {
      return String(error.message);
    }
    if ("status" in error && "statusText" in error) {
      return `${error.status}: ${error.statusText}`;
    }
  }

  return "An unexpected error occurred";
};
