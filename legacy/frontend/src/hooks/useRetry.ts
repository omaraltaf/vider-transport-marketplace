/**
 * useRetry Hook
 * Provides retry functionality with exponential backoff
 */

import { useState, useCallback } from 'react';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export interface RetryState {
  isRetrying: boolean;
  attemptCount: number;
  canRetry: boolean;
}

export const useRetry = (options: RetryOptions = {}) => {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    canRetry: true,
  });

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = initialDelay * Math.pow(backoffFactor, attempt);
    return Math.min(delay, maxDelay);
  }, [initialDelay, backoffFactor, maxDelay]);

  const retry = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T> => {
    if (retryState.attemptCount >= maxAttempts) {
      throw new Error(`Maximum retry attempts (${maxAttempts}) exceeded`);
    }

    setRetryState(prev => ({
      ...prev,
      isRetrying: true,
      attemptCount: prev.attemptCount + 1,
    }));

    try {
      const result = await operation();
      
      // Reset on success
      setRetryState({
        isRetrying: false,
        attemptCount: 0,
        canRetry: true,
      });
      
      return result;
    } catch (error) {
      const newAttemptCount = retryState.attemptCount + 1;
      const canRetryAgain = newAttemptCount < maxAttempts;
      
      setRetryState({
        isRetrying: false,
        attemptCount: newAttemptCount,
        canRetry: canRetryAgain,
      });

      if (canRetryAgain) {
        // Wait before allowing next retry
        const delay = calculateDelay(newAttemptCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      throw error;
    }
  }, [retryState.attemptCount, maxAttempts, calculateDelay]);

  const reset = useCallback(() => {
    setRetryState({
      isRetrying: false,
      attemptCount: 0,
      canRetry: true,
    });
  }, []);

  return {
    retry,
    reset,
    ...retryState,
  };
};

export default useRetry;