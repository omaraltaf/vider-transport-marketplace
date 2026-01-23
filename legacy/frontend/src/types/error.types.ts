/**
 * Error Handling Types
 * Comprehensive type definitions for the API Error Handling and Reliability system
 */

export enum ApiErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  PERMISSION = 'PERMISSION',
  PARSING = 'PARSING',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  VALIDATION = 'VALIDATION',
  CLIENT = 'CLIENT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ErrorResolution {
  RETRIED_SUCCESS = 'retried_success',
  FALLBACK_USED = 'fallback_used',
  USER_NOTIFIED = 'user_notified',
  ESCALATED = 'escalated',
  IGNORED = 'ignored'
}

export enum FallbackType {
  CACHED = 'cached',
  MOCK = 'mock',
  EMPTY_STATE = 'empty_state',
  DEFAULT = 'default'
}

export enum RecoveryType {
  RETRY = 'retry',
  REFRESH_TOKEN = 'refresh_token',
  USE_CACHE = 'use_cache',
  REDIRECT = 'redirect',
  SHOW_FALLBACK = 'show_fallback'
}

export interface ErrorContext {
  endpoint: string;
  method: string;
  component: string;
  userId?: string;
  timestamp: Date;
  retryCount: number;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface ApiError {
  type: ApiErrorType;
  message: string;
  statusCode?: number;
  originalError: Error;
  context: ErrorContext;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  userMessage: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorResponse {
  handled: boolean;
  fallbackData?: unknown;
  userMessage: string;
  shouldRetry: boolean;
  retryAfter?: number;
  requiresUserAction: boolean;
  recoveryType?: RecoveryType;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: unknown;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  error: ApiError;
  context: ErrorContext;
  resolution: ErrorResolution;
  userImpact: UserImpact;
  stackTrace?: string;
}

export interface UserImpact {
  severity: ErrorSeverity;
  affectedFeatures: string[];
  userNotified: boolean;
  fallbackProvided: boolean;
  dataLoss: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ApiErrorType[];
  timeoutMs: number;
}

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: Date;
  expiresAt: Date;
  source: 'api' | 'fallback' | 'mock';
  metadata?: Record<string, unknown>;
}

export interface CacheMetadata {
  totalSize: number;
  entryCount: number;
  oldestEntry: Date;
  hitRate: number;
  lastPurge: Date;
}

export interface TokenState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  isRefreshing: boolean;
  lastRefresh: Date | null;
}

export interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
  successCount: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<ApiErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoveryRate: number;
  averageResolutionTime: number;
  userImpactScore: number;
}

export interface MonitoringThresholds {
  errorRatePerMinute: number;
  criticalErrorsPerHour: number;
  failureRateThreshold: number;
  responseTimeThreshold: number;
}

// Type guards
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    'context' in error
  );
};

export const isNetworkError = (error: ApiError): boolean => {
  return error.type === ApiErrorType.NETWORK;
};

export const isAuthError = (error: ApiError): boolean => {
  return error.type === ApiErrorType.AUTH;
};

export const isRecoverableError = (error: ApiError): boolean => {
  return error.isRecoverable;
};

export const isCriticalError = (error: ApiError): boolean => {
  return error.severity === ErrorSeverity.CRITICAL;
};

// Error Pattern Detection Types
export interface ErrorPattern {
  type: string;
  description: string;
  frequency: number;
  severity: ErrorSeverity;
  firstOccurrence: Date;
  lastOccurrence: Date;
  affectedEndpoints: string[];
  suggestedAction: string;
}

// Escalation System Types
export interface EscalationCondition {
  severity?: ErrorSeverity;
  errorType?: ApiErrorType;
  endpoint?: string;
  count: number;
  timeWindowMinutes: number;
}

export interface EscalationAction {
  type: 'immediate' | 'escalate' | 'alert';
  notificationChannels: string[];
  assignTo: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  condition: EscalationCondition;
  action: EscalationAction;
}