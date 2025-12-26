/**
 * Error Classification Utilities
 * Functions for classifying and categorizing different types of errors
 */

import {
  ApiError,
  ApiErrorType,
  ErrorSeverity,
  ErrorContext
} from '../../../types/error.types';

/**
 * Classifies an error based on its characteristics
 */
export function classifyError(
  error: Error,
  context: ErrorContext,
  statusCode?: number
): ApiError {
  const errorType = determineErrorType(error, statusCode);
  const severity = determineSeverity(errorType, statusCode);
  const isRecoverable = determineRecoverability(errorType, statusCode);

  return {
    type: errorType,
    message: error.message,
    statusCode,
    originalError: error,
    context,
    severity,
    isRecoverable,
    userMessage: generateUserMessage(errorType, severity),
    metadata: extractErrorMetadata(error)
  };
}

/**
 * Generates user-friendly error messages
 */
function generateUserMessage(type: ApiErrorType, severity: ErrorSeverity): string {
  switch (type) {
    case ApiErrorType.NETWORK:
      return 'Network connection issue. Please check your internet connection and try again.';
    case ApiErrorType.AUTH:
      return 'Authentication failed. Please log in again.';
    case ApiErrorType.PARSING:
      return 'Data format error. Please try again or contact support.';
    case ApiErrorType.TIMEOUT:
      return 'Request timed out. Please try again.';
    case ApiErrorType.SERVER:
      return severity === ErrorSeverity.CRITICAL 
        ? 'Service temporarily unavailable. Please try again later.'
        : 'Server error occurred. Please try again.';
    case ApiErrorType.VALIDATION:
      return 'Invalid data provided. Please check your input.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Determines the error type based on error characteristics
 */
function determineErrorType(error: Error, statusCode?: number): ApiErrorType {
  // Network errors - check for various network error patterns
  if (
    error.name === 'TypeError' && 
    (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch'))
  ) {
    return ApiErrorType.NETWORK;
  }

  if (
    error.message.includes('ECONNREFUSED') ||
    error.message.includes('ETIMEDOUT') ||
    error.message.includes('ENOTFOUND') ||
    error.message.includes('Network request failed')
  ) {
    return ApiErrorType.NETWORK;
  }

  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return ApiErrorType.TIMEOUT;
  }

  // Authentication errors
  if (statusCode === 401 || statusCode === 403) {
    return ApiErrorType.AUTH;
  }

  if (
    error.message.includes('Token expired') ||
    error.message.includes('Invalid token') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('Forbidden')
  ) {
    return ApiErrorType.AUTH;
  }

  // Parsing errors - check for various parsing error patterns
  if (
    error.name === 'SyntaxError' || 
    error.message.includes('JSON') ||
    error.message.includes('parse') ||
    error.message.includes('Unexpected token') ||
    error.message.includes('Unexpected end of JSON') ||
    error.message.includes('Invalid JSON format') ||
    error.message.includes('Malformed response')
  ) {
    return ApiErrorType.PARSING;
  }

  // Server errors
  if (statusCode && statusCode >= 500) {
    return ApiErrorType.SERVER;
  }

  // Validation errors
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return ApiErrorType.VALIDATION;
  }

  return ApiErrorType.UNKNOWN;
}

/**
 * Determines error severity based on type and status code
 */
function determineSeverity(type: ApiErrorType, statusCode?: number): ErrorSeverity {
  switch (type) {
    case ApiErrorType.AUTH:
      return ErrorSeverity.HIGH;
    
    case ApiErrorType.SERVER:
      return statusCode === 500 ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH;
    
    case ApiErrorType.NETWORK:
    case ApiErrorType.TIMEOUT:
      return ErrorSeverity.MEDIUM;
    
    case ApiErrorType.PARSING:
      return ErrorSeverity.MEDIUM;
    
    case ApiErrorType.VALIDATION:
      return ErrorSeverity.LOW;
    
    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * Determines if an error is recoverable
 */
function determineRecoverability(type: ApiErrorType, statusCode?: number): boolean {
  switch (type) {
    case ApiErrorType.NETWORK:
    case ApiErrorType.TIMEOUT:
    case ApiErrorType.SERVER:
      return true;
    
    case ApiErrorType.AUTH:
      return statusCode === 401; // Token refresh might help
    
    case ApiErrorType.PARSING:
      return false; // Usually indicates a bug
    
    case ApiErrorType.VALIDATION:
      return false; // Client-side issue
    
    default:
      return false;
  }
}

/**
 * Extracts metadata from error for debugging
 */
function extractErrorMetadata(error: Error): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    name: error.name,
    stack: error.stack
  };

  // Extract additional properties if they exist
  if ('cause' in error) {
    metadata.cause = error.cause;
  }

  if ('code' in error) {
    metadata.code = (error as any).code;
  }

  if ('errno' in error) {
    metadata.errno = (error as any).errno;
  }

  return metadata;
}

/**
 * Checks if an error should trigger an alert
 */
export function shouldTriggerAlert(error: ApiError): boolean {
  return (
    error.severity === ErrorSeverity.CRITICAL ||
    (error.severity === ErrorSeverity.HIGH && error.context.retryCount > 2)
  );
}

/**
 * Gets error priority for handling order
 */
export function getErrorPriority(error: ApiError): number {
  const severityPriority = {
    [ErrorSeverity.CRITICAL]: 1000,
    [ErrorSeverity.HIGH]: 100,
    [ErrorSeverity.MEDIUM]: 10,
    [ErrorSeverity.LOW]: 1
  };

  const typePriority = {
    [ApiErrorType.AUTH]: 50,
    [ApiErrorType.SERVER]: 40,
    [ApiErrorType.NETWORK]: 30,
    [ApiErrorType.TIMEOUT]: 20,
    [ApiErrorType.PARSING]: 15,
    [ApiErrorType.VALIDATION]: 10,
    [ApiErrorType.UNKNOWN]: 5
  };

  return severityPriority[error.severity] + typePriority[error.type];
}

/**
 * Checks if errors are similar (for deduplication)
 */
export function areErrorsSimilar(error1: ApiError, error2: ApiError): boolean {
  return (
    error1.type === error2.type &&
    error1.context.endpoint === error2.context.endpoint &&
    error1.statusCode === error2.statusCode &&
    error1.message === error2.message
  );
}