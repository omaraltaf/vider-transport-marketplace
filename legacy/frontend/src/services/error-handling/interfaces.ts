/**
 * Error Handling Service Interfaces
 * Core interfaces for the API Error Handling and Reliability system
 */

import {
  ApiError,
  ErrorContext,
  ErrorResponse,
  ValidationResult,
  RetryConfig,
  TokenState,
  CacheEntry,
  CacheMetadata,
  FallbackType,
  CircuitBreakerState,
  ErrorMetrics,
  MonitoringThresholds
} from '../../types/error.types';

// Core Error Handler Interface
export interface IApiErrorHandler {
  handleError(error: ApiError, context: ErrorContext): Promise<ErrorResponse>;
  registerErrorType(type: string, handler: IErrorTypeHandler): void;
  setFallbackStrategy(strategy: IFallbackStrategy): void;
  getErrorMetrics(): ErrorMetrics;
  clearErrorHistory(): void;
}

// Error Type Handler Interface
export interface IErrorTypeHandler {
  canHandle(error: ApiError): boolean;
  handle(error: ApiError, context: ErrorContext): Promise<ErrorResponse>;
  getPriority(): number;
}

// Token Manager Interface
export interface ITokenManager {
  getValidToken(): Promise<string>;
  refreshToken(): Promise<string>;
  isTokenValid(token: string): boolean;
  handleTokenError(error: ApiError): Promise<void>;
  syncTokenAcrossTabs(): void;
  getTokenState(): TokenState;
  clearTokens(): void;
}

// Response Validator Interface
export interface IResponseValidator {
  validateResponse(response: Response): Promise<ValidationResult>;
  sanitizeData<T>(data: unknown, schema?: Schema<T>): T;
  detectContentType(response: Response): ContentType;
  isValidJson(text: string): boolean;
}

// Retry Controller Interface
export interface IRetryController {
  executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T>;
  shouldRetry(error: ApiError, attempt: number): boolean;
  calculateDelay(attempt: number, config: RetryConfig): number;
  getCircuitBreakerState(endpoint: string): CircuitBreakerState;
}

// Fallback Manager Interface
export interface IFallbackManager {
  getFallbackData<T>(key: string, type: FallbackType): Promise<T | null>;
  cacheFreshData<T>(key: string, data: T): Promise<void>;
  clearStaleCache(): Promise<void>;
  getCacheMetadata(): CacheMetadata;
  queueOfflineOperation(operation: OfflineOperation): void;
  processOfflineQueue(): Promise<void>;
}

// Error Monitor Interface
export interface IErrorMonitor {
  recordError(error: ApiError, context: ErrorContext): void;
  getErrorMetrics(timeRange?: TimeRange): ErrorMetrics;
  checkThresholds(): Promise<ThresholdAlert[]>;
  generateReport(timeRange: TimeRange): Promise<ErrorReport>;
  subscribeToAlerts(callback: (alert: ThresholdAlert) => void): void;
}

// Logging Service Interface
export interface ILoggingService {
  logError(error: ApiError, context: ErrorContext): void;
  logInfo(message: string, metadata?: Record<string, unknown>): void;
  logWarning(message: string, metadata?: Record<string, unknown>): void;
  logDebug(message: string, metadata?: Record<string, unknown>): void;
  getLogs(filter?: LogFilter): Promise<LogEntry[]>;
  clearLogs(olderThan?: Date): Promise<void>;
}

// Supporting Types and Interfaces

export interface Schema<T> {
  validate(data: unknown): ValidationResult;
  sanitize(data: unknown): T;
  getDefaultValue(): T;
}

export enum ContentType {
  JSON = 'application/json',
  HTML = 'text/html',
  TEXT = 'text/plain',
  XML = 'application/xml',
  UNKNOWN = 'unknown'
}

export interface OfflineOperation {
  id: string;
  endpoint: string;
  method: string;
  data?: unknown;
  headers?: Record<string, string>;
  timestamp: Date;
  priority: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ThresholdAlert {
  type: 'ERROR_RATE' | 'CRITICAL_ERRORS' | 'FAILURE_RATE' | 'RESPONSE_TIME';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ErrorReport {
  timeRange: TimeRange;
  totalErrors: number;
  errorsByType: Record<string, number>;
  topErrors: Array<{
    error: string;
    count: number;
    lastOccurrence: Date;
  }>;
  recoveryRate: number;
  userImpact: {
    affectedUsers: number;
    affectedFeatures: string[];
  };
  recommendations: string[];
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  message: string;
  metadata?: Record<string, unknown>;
  component?: string;
  userId?: string;
}

export interface LogFilter {
  level?: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  component?: string;
  userId?: string;
  startTime?: Date;
  endTime?: Date;
  searchTerm?: string;
}

// Fallback Strategy Interface
export interface IFallbackStrategy {
  shouldUseFallback(error: ApiError): boolean;
  getFallbackType(error: ApiError): FallbackType;
  getFallbackData<T>(key: string, type: FallbackType): Promise<T | null>;
}

// Recovery Strategy Interface
export interface IRecoveryStrategy {
  canRecover(error: ApiError): boolean;
  recover(error: ApiError, context: ErrorContext): Promise<ErrorResponse>;
  getFallback(error: ApiError): Promise<unknown>;
  getRecoveryType(error: ApiError): string;
}

// Configuration Interfaces
export interface ErrorHandlingConfig {
  retryConfig: RetryConfig;
  monitoringThresholds: MonitoringThresholds;
  cacheConfig: CacheConfig;
  loggingConfig: LoggingConfig;
  fallbackConfig: FallbackConfig;
}

export interface CacheConfig {
  maxSize: number;
  defaultTtl: number;
  purgeInterval: number;
  compressionEnabled: boolean;
}

export interface LoggingConfig {
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  maxEntries: number;
  persistToDisk: boolean;
  remoteLogging: boolean;
}

export interface FallbackConfig {
  enableMockData: boolean;
  enableCaching: boolean;
  cacheStaleThreshold: number;
  mockDataSets: Record<string, unknown>;
}