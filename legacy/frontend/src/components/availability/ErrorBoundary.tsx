/**
 * Error Boundary Component
 * Catches JavaScript errors in component tree and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className={styles.errorBoundary} padding="lg">
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>
              <AlertTriangle size={48} />
            </div>
            <div className={styles.errorText}>
              <h3 className={styles.errorTitle}>Something went wrong</h3>
              <p className={styles.errorMessage}>
                An unexpected error occurred while loading the calendar. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className={styles.errorDetails}>
                  <summary>Error Details (Development)</summary>
                  <pre className={styles.errorStack}>
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            <div className={styles.errorActions}>
              <Button
                variant="primary"
                onClick={this.handleRetry}
                leftIcon={<RefreshCw size={16} />}
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.displayName = 'ErrorBoundary';