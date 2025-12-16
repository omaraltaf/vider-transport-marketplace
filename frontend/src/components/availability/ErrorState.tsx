/**
 * Error State Component
 * Displays error messages with retry functionality
 */

import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  error: Error | string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: 'default' | 'network' | 'permission' | 'notFound';
}

const getErrorDetails = (error: Error | string, variant?: string) => {
  const errorMessage = typeof error === 'string' ? error : error.message;
  
  switch (variant) {
    case 'network':
      return {
        icon: WifiOff,
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        suggestion: 'Check your network connection and try again.',
      };
    case 'permission':
      return {
        icon: AlertCircle,
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource.',
        suggestion: 'Please contact your administrator if you believe this is an error.',
      };
    case 'notFound':
      return {
        icon: AlertCircle,
        title: 'Not Found',
        message: 'The requested resource could not be found.',
        suggestion: 'Please check the URL or try navigating back.',
      };
    default:
      return {
        icon: AlertCircle,
        title: 'Error',
        message: errorMessage || 'An unexpected error occurred.',
        suggestion: 'Please try again. If the problem persists, contact support.',
      };
  }
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  retryLabel = 'Try Again',
  className = '',
  variant = 'default',
}) => {
  const { icon: Icon, title, message, suggestion } = getErrorDetails(error, variant);

  return (
    <Card className={`${styles.errorState} ${className}`} padding="lg">
      <div className={styles.errorContent}>
        <div className={styles.errorIcon}>
          <Icon size={48} />
        </div>
        <div className={styles.errorText}>
          <h3 className={styles.errorTitle}>{title}</h3>
          <p className={styles.errorMessage}>{message}</p>
          <p className={styles.errorSuggestion}>{suggestion}</p>
        </div>
        {onRetry && (
          <div className={styles.errorActions}>
            <Button
              variant="primary"
              onClick={onRetry}
              leftIcon={<RefreshCw size={16} />}
            >
              {retryLabel}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

ErrorState.displayName = 'ErrorState';