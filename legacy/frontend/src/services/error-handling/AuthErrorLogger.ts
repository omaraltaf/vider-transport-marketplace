/**
 * Authentication Error Logger
 * Specialized logging system for authentication flows with categorization,
 * severity levels, and recovery option suggestions
 */

import type { ApiError, ErrorContext, ErrorSeverity, ApiErrorType } from '../../types/error.types';
import type { LogEntry } from './interfaces';
import { loggingService } from './LoggingService';

export enum AuthErrorCategory {
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  USER_STATE_CORRUPTED = 'USER_STATE_CORRUPTED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  CROSS_TAB_SYNC_FAILED = 'CROSS_TAB_SYNC_FAILED',
  STORAGE_ACCESS_FAILED = 'STORAGE_ACCESS_FAILED',
  NETWORK_AUTH_ERROR = 'NETWORK_AUTH_ERROR'
}

export enum AuthErrorSeverity {
  LOW = 'LOW',           // Minor issues, user can continue
  MEDIUM = 'MEDIUM',     // Affects some functionality
  HIGH = 'HIGH',         // Blocks major functionality
  CRITICAL = 'CRITICAL'  // Complete authentication failure
}

export interface AuthErrorMetadata {
  category: AuthErrorCategory;
  severity: AuthErrorSeverity;
  userRole?: string;
  component: string;
  endpoint?: string;
  tokenState?: {
    hasAccessToken: boolean;
    hasRefreshToken: boolean;
    isExpired: boolean;
    lastRefresh?: Date;
  };
  userState?: {
    isAuthenticated: boolean;
    userId?: string;
    sessionId?: string;
  };
  recoveryOptions: RecoveryOption[];
  userImpact: UserImpact;
  technicalDetails?: Record<string, unknown>;
}

export interface RecoveryOption {
  type: 'automatic' | 'user_action' | 'system_action';
  action: string;
  description: string;
  priority: number;
  estimatedTime?: string;
  requiresUserInput: boolean;
}

export interface UserImpact {
  blockedFeatures: string[];
  dataAccessLimited: boolean;
  requiresReauthentication: boolean;
  userExperienceRating: 'minimal' | 'moderate' | 'severe' | 'critical';
}

export interface AuthErrorLogEntry extends LogEntry {
  authMetadata: AuthErrorMetadata;
  resolutionAttempts: ResolutionAttempt[];
  finalResolution?: {
    successful: boolean;
    method: string;
    timeToResolve: number;
    userSatisfaction?: 'resolved' | 'partially_resolved' | 'unresolved';
  };
}

export interface ResolutionAttempt {
  timestamp: Date;
  method: string;
  successful: boolean;
  error?: string;
  duration: number;
}

export class AuthErrorLogger {
  private static instance: AuthErrorLogger;
  private activeErrors: Map<string, AuthErrorLogEntry> = new Map();

  private constructor() {}

  public static getInstance(): AuthErrorLogger {
    if (!AuthErrorLogger.instance) {
      AuthErrorLogger.instance = new AuthErrorLogger();
    }
    return AuthErrorLogger.instance;
  }

  /**
   * Logs an authentication error with full context and recovery suggestions
   */
  public logAuthError(
    error: ApiError,
    context: ErrorContext,
    additionalMetadata?: Partial<AuthErrorMetadata>
  ): string {
    const errorId = this.generateErrorId();
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);
    const recoveryOptions = this.generateRecoveryOptions(error, category);
    const userImpact = this.assessUserImpact(error, category);

    const authMetadata: AuthErrorMetadata = {
      category,
      severity,
      component: context.component,
      endpoint: context.endpoint,
      recoveryOptions,
      userImpact,
      technicalDetails: {
        originalErrorType: error.type,
        statusCode: error.statusCode,
        retryCount: context.retryCount,
        timestamp: context.timestamp,
        ...error.metadata
      },
      ...additionalMetadata
    };

    const logEntry: AuthErrorLogEntry = {
      id: errorId,
      timestamp: new Date(),
      level: this.mapSeverityToLogLevel(severity),
      message: this.formatErrorMessage(error, category),
      metadata: {
        errorId,
        category,
        severity,
        component: context.component,
        endpoint: context.endpoint,
        userId: context.userId
      },
      component: context.component,
      userId: context.userId,
      authMetadata,
      resolutionAttempts: []
    };

    // Store active error for tracking resolution
    this.activeErrors.set(errorId, logEntry);

    // Log to main logging service
    loggingService.logError(error, context);

    // Log structured auth error
    loggingService.logError(
      {
        ...error,
        message: logEntry.message,
        metadata: {
          ...error.metadata,
          authErrorId: errorId,
          authCategory: category,
          authSeverity: severity,
          recoveryOptions: recoveryOptions.map(opt => opt.action),
          userImpact: userImpact.userExperienceRating
        }
      },
      context
    );

    return errorId;
  }

  /**
   * Records a resolution attempt for an active error
   */
  public recordResolutionAttempt(
    errorId: string,
    method: string,
    successful: boolean,
    error?: string,
    duration?: number
  ): void {
    const activeError = this.activeErrors.get(errorId);
    if (!activeError) return;

    const attempt: ResolutionAttempt = {
      timestamp: new Date(),
      method,
      successful,
      error,
      duration: duration || 0
    };

    activeError.resolutionAttempts.push(attempt);

    // Log the attempt
    loggingService.logInfo(
      `Resolution attempt for auth error ${errorId}: ${method}`,
      {
        errorId,
        method,
        successful,
        error,
        duration,
        totalAttempts: activeError.resolutionAttempts.length
      }
    );
  }

  /**
   * Marks an error as resolved
   */
  public resolveError(
    errorId: string,
    method: string,
    userSatisfaction?: 'resolved' | 'partially_resolved' | 'unresolved'
  ): void {
    const activeError = this.activeErrors.get(errorId);
    if (!activeError) return;

    const resolutionTime = Date.now() - activeError.timestamp.getTime();

    activeError.finalResolution = {
      successful: true,
      method,
      timeToResolve: resolutionTime,
      userSatisfaction
    };

    // Log successful resolution
    loggingService.logInfo(
      `Auth error ${errorId} resolved using ${method}`,
      {
        errorId,
        method,
        timeToResolve: resolutionTime,
        userSatisfaction,
        totalAttempts: activeError.resolutionAttempts.length,
        category: activeError.authMetadata.category,
        severity: activeError.authMetadata.severity
      }
    );

    // Remove from active errors
    this.activeErrors.delete(errorId);
  }

  /**
   * Gets recovery options for a specific error category
   */
  public getRecoveryOptions(category: AuthErrorCategory): RecoveryOption[] {
    return this.generateRecoveryOptions(
      { type: 'AUTH' as ApiErrorType } as ApiError,
      category
    );
  }

  /**
   * Gets statistics about authentication errors
   */
  public getAuthErrorStatistics(timeRange?: { start: Date; end: Date }) {
    const activeErrorsCount = this.activeErrors.size;
    const errorsByCategory: Record<AuthErrorCategory, number> = {} as Record<AuthErrorCategory, number>;
    const errorsBySeverity: Record<AuthErrorSeverity, number> = {} as Record<AuthErrorSeverity, number>;

    // Initialize counters
    Object.values(AuthErrorCategory).forEach(category => {
      errorsByCategory[category] = 0;
    });
    Object.values(AuthErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // Count active errors
    this.activeErrors.forEach(error => {
      errorsByCategory[error.authMetadata.category]++;
      errorsBySeverity[error.authMetadata.severity]++;
    });

    return {
      activeErrors: activeErrorsCount,
      errorsByCategory,
      errorsBySeverity,
      averageResolutionAttempts: this.calculateAverageResolutionAttempts(),
      mostCommonCategory: this.getMostCommonCategory(),
      criticalErrorsCount: errorsBySeverity[AuthErrorSeverity.CRITICAL]
    };
  }

  /**
   * Exports authentication error logs
   */
  public async exportAuthErrorLogs(
    timeRange?: { start: Date; end: Date }
  ): Promise<string> {
    const allLogs = await loggingService.getLogs({
      level: 'ERROR',
      component: 'auth',
      startTime: timeRange?.start,
      endTime: timeRange?.end
    });

    const authLogs = allLogs.filter(log => 
      log.metadata && 'authErrorId' in log.metadata
    );

    const exportData = {
      exportedAt: new Date().toISOString(),
      timeRange,
      totalAuthErrors: authLogs.length,
      activeErrors: Array.from(this.activeErrors.values()),
      resolvedErrors: authLogs.filter(log => 
        !this.activeErrors.has(log.metadata?.authErrorId as string)
      ),
      statistics: this.getAuthErrorStatistics(timeRange)
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Categorizes an error based on its properties
   */
  private categorizeError(error: ApiError): AuthErrorCategory {
    if (error.statusCode === 401) {
      if (error.message.toLowerCase().includes('token expired')) {
        return AuthErrorCategory.TOKEN_EXPIRED;
      }
      if (error.message.toLowerCase().includes('invalid token')) {
        return AuthErrorCategory.TOKEN_INVALID;
      }
      return AuthErrorCategory.AUTHENTICATION_FAILED;
    }

    if (error.statusCode === 403) {
      return AuthErrorCategory.PERMISSION_DENIED;
    }

    if (error.message.toLowerCase().includes('refresh')) {
      return AuthErrorCategory.TOKEN_REFRESH_FAILED;
    }

    if (error.message.toLowerCase().includes('storage')) {
      return AuthErrorCategory.STORAGE_ACCESS_FAILED;
    }

    if (error.message.toLowerCase().includes('session')) {
      return AuthErrorCategory.SESSION_EXPIRED;
    }

    if (error.message.toLowerCase().includes('corrupted') || 
        error.message.toLowerCase().includes('invalid state')) {
      return AuthErrorCategory.USER_STATE_CORRUPTED;
    }

    if (error.type === 'NETWORK' as ApiErrorType) {
      return AuthErrorCategory.NETWORK_AUTH_ERROR;
    }

    return AuthErrorCategory.AUTHENTICATION_FAILED;
  }

  /**
   * Determines error severity based on error and category
   */
  private determineSeverity(error: ApiError, category: AuthErrorCategory): AuthErrorSeverity {
    // Critical errors that completely block authentication
    if ([
      AuthErrorCategory.USER_STATE_CORRUPTED,
      AuthErrorCategory.STORAGE_ACCESS_FAILED
    ].includes(category)) {
      return AuthErrorSeverity.CRITICAL;
    }

    // High severity errors that block major functionality
    if ([
      AuthErrorCategory.AUTHENTICATION_FAILED,
      AuthErrorCategory.TOKEN_REFRESH_FAILED,
      AuthErrorCategory.SESSION_EXPIRED
    ].includes(category)) {
      return AuthErrorSeverity.HIGH;
    }

    // Medium severity errors that affect some functionality
    if ([
      AuthErrorCategory.TOKEN_EXPIRED,
      AuthErrorCategory.PERMISSION_DENIED,
      AuthErrorCategory.CROSS_TAB_SYNC_FAILED
    ].includes(category)) {
      return AuthErrorSeverity.MEDIUM;
    }

    // Low severity errors
    return AuthErrorSeverity.LOW;
  }

  /**
   * Generates recovery options based on error category
   */
  private generateRecoveryOptions(error: ApiError, category: AuthErrorCategory): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    switch (category) {
      case AuthErrorCategory.TOKEN_EXPIRED:
        options.push(
          {
            type: 'automatic',
            action: 'refresh_token',
            description: 'Automatically refresh the authentication token',
            priority: 1,
            estimatedTime: '2-5 seconds',
            requiresUserInput: false
          },
          {
            type: 'user_action',
            action: 'manual_login',
            description: 'Sign in again to restore access',
            priority: 2,
            estimatedTime: '30 seconds',
            requiresUserInput: true
          }
        );
        break;

      case AuthErrorCategory.TOKEN_INVALID:
        options.push(
          {
            type: 'system_action',
            action: 'clear_tokens',
            description: 'Clear invalid tokens and redirect to login',
            priority: 1,
            estimatedTime: '1-2 seconds',
            requiresUserInput: false
          }
        );
        break;

      case AuthErrorCategory.TOKEN_REFRESH_FAILED:
        options.push(
          {
            type: 'user_action',
            action: 'manual_login',
            description: 'Sign in again to restore access',
            priority: 1,
            estimatedTime: '30 seconds',
            requiresUserInput: true
          },
          {
            type: 'system_action',
            action: 'clear_storage',
            description: 'Clear authentication data and restart session',
            priority: 2,
            estimatedTime: '2-3 seconds',
            requiresUserInput: false
          }
        );
        break;

      case AuthErrorCategory.PERMISSION_DENIED:
        options.push(
          {
            type: 'user_action',
            action: 'contact_admin',
            description: 'Contact administrator for access permissions',
            priority: 1,
            requiresUserInput: true
          },
          {
            type: 'system_action',
            action: 'show_fallback',
            description: 'Show limited functionality view',
            priority: 2,
            estimatedTime: '1 second',
            requiresUserInput: false
          }
        );
        break;

      case AuthErrorCategory.USER_STATE_CORRUPTED:
        options.push(
          {
            type: 'system_action',
            action: 'reset_state',
            description: 'Reset user state and clear corrupted data',
            priority: 1,
            estimatedTime: '3-5 seconds',
            requiresUserInput: false
          },
          {
            type: 'user_action',
            action: 'fresh_login',
            description: 'Sign in again with fresh session',
            priority: 2,
            estimatedTime: '30 seconds',
            requiresUserInput: true
          }
        );
        break;

      case AuthErrorCategory.STORAGE_ACCESS_FAILED:
        options.push(
          {
            type: 'system_action',
            action: 'session_only_mode',
            description: 'Continue with session-only authentication',
            priority: 1,
            estimatedTime: '1-2 seconds',
            requiresUserInput: false
          },
          {
            type: 'user_action',
            action: 'enable_storage',
            description: 'Enable browser storage and refresh page',
            priority: 2,
            requiresUserInput: true
          }
        );
        break;

      default:
        options.push(
          {
            type: 'user_action',
            action: 'retry_operation',
            description: 'Try the operation again',
            priority: 1,
            estimatedTime: '5-10 seconds',
            requiresUserInput: true
          },
          {
            type: 'user_action',
            action: 'refresh_page',
            description: 'Refresh the page to reset state',
            priority: 2,
            estimatedTime: '5 seconds',
            requiresUserInput: true
          }
        );
    }

    return options.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Assesses user impact based on error category
   */
  private assessUserImpact(error: ApiError, category: AuthErrorCategory): UserImpact {
    const impact: UserImpact = {
      blockedFeatures: [],
      dataAccessLimited: false,
      requiresReauthentication: false,
      userExperienceRating: 'minimal'
    };

    switch (category) {
      case AuthErrorCategory.USER_STATE_CORRUPTED:
      case AuthErrorCategory.STORAGE_ACCESS_FAILED:
        impact.blockedFeatures = ['All authenticated features'];
        impact.dataAccessLimited = true;
        impact.requiresReauthentication = true;
        impact.userExperienceRating = 'critical';
        break;

      case AuthErrorCategory.AUTHENTICATION_FAILED:
      case AuthErrorCategory.SESSION_EXPIRED:
        impact.blockedFeatures = ['User dashboard', 'Profile management', 'Data access'];
        impact.dataAccessLimited = true;
        impact.requiresReauthentication = true;
        impact.userExperienceRating = 'severe';
        break;

      case AuthErrorCategory.TOKEN_REFRESH_FAILED:
        impact.blockedFeatures = ['API operations', 'Data updates'];
        impact.dataAccessLimited = true;
        impact.requiresReauthentication = true;
        impact.userExperienceRating = 'severe';
        break;

      case AuthErrorCategory.PERMISSION_DENIED:
        impact.blockedFeatures = ['Restricted features'];
        impact.dataAccessLimited = true;
        impact.requiresReauthentication = false;
        impact.userExperienceRating = 'moderate';
        break;

      case AuthErrorCategory.TOKEN_EXPIRED:
        impact.blockedFeatures = ['API operations'];
        impact.dataAccessLimited = false;
        impact.requiresReauthentication = false;
        impact.userExperienceRating = 'minimal';
        break;

      default:
        impact.userExperienceRating = 'minimal';
    }

    return impact;
  }

  /**
   * Maps severity to log level
   */
  private mapSeverityToLogLevel(severity: AuthErrorSeverity): 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' {
    switch (severity) {
      case AuthErrorSeverity.CRITICAL:
      case AuthErrorSeverity.HIGH:
        return 'ERROR';
      case AuthErrorSeverity.MEDIUM:
        return 'WARN';
      case AuthErrorSeverity.LOW:
        return 'INFO';
      default:
        return 'ERROR';
    }
  }

  /**
   * Formats error message with category context
   */
  private formatErrorMessage(error: ApiError, category: AuthErrorCategory): string {
    const categoryName = category.replace(/_/g, ' ').toLowerCase();
    return `Authentication Error (${categoryName}): ${error.message}`;
  }

  /**
   * Generates unique error ID
   */
  private generateErrorId(): string {
    return `auth_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculates average resolution attempts
   */
  private calculateAverageResolutionAttempts(): number {
    if (this.activeErrors.size === 0) return 0;
    
    const totalAttempts = Array.from(this.activeErrors.values())
      .reduce((sum, error) => sum + error.resolutionAttempts.length, 0);
    
    return totalAttempts / this.activeErrors.size;
  }

  /**
   * Gets most common error category
   */
  private getMostCommonCategory(): AuthErrorCategory | null {
    if (this.activeErrors.size === 0) return null;

    const categoryCounts: Record<string, number> = {};
    
    this.activeErrors.forEach(error => {
      const category = error.authMetadata.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .reduce((max, [category, count]) => 
        count > (categoryCounts[max] || 0) ? category : max, 
        Object.keys(categoryCounts)[0]
      ) as AuthErrorCategory;
  }
}

// Singleton instance
export const authErrorLogger = AuthErrorLogger.getInstance();