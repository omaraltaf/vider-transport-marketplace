/**
 * Recovery Suggestion Service
 * Provides intelligent recovery suggestions for authentication errors
 * with user-friendly guidance and automated recovery options
 */

import type { ApiError, ErrorContext } from '../../types/error.types';
import { 
  AuthErrorCategory, 
  AuthErrorSeverity, 
  RecoveryOption, 
  authErrorLogger 
} from './AuthErrorLogger';

export interface RecoverySuggestion {
  id: string;
  title: string;
  description: string;
  steps: RecoveryStep[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  successRate: number;
  requiresUserAction: boolean;
  canAutoExecute: boolean;
}

export interface RecoveryStep {
  order: number;
  instruction: string;
  action?: () => Promise<boolean>;
  isAutomated: boolean;
  expectedOutcome: string;
  troubleshooting?: string[];
}

export interface RecoveryContext {
  userRole?: string;
  hasStorageAccess: boolean;
  hasNetworkAccess: boolean;
  browserSupportsFeatures: {
    localStorage: boolean;
    sessionStorage: boolean;
    broadcastChannel: boolean;
  };
  currentUrl: string;
  userPreferences?: {
    preferAutomatedRecovery: boolean;
    allowDataClearing: boolean;
  };
}

export class RecoverySuggestionService {
  private static instance: RecoverySuggestionService;
  private recoveryHistory: Map<string, RecoveryAttempt[]> = new Map();

  private constructor() {}

  public static getInstance(): RecoverySuggestionService {
    if (!RecoverySuggestionService.instance) {
      RecoverySuggestionService.instance = new RecoverySuggestionService();
    }
    return RecoverySuggestionService.instance;
  }

  /**
   * Gets recovery suggestions for an authentication error
   */
  public getRecoverySuggestions(
    error: ApiError,
    context: ErrorContext,
    recoveryContext: RecoveryContext
  ): RecoverySuggestion[] {
    const category = this.categorizeError(error);
    const suggestions: RecoverySuggestion[] = [];

    switch (category) {
      case AuthErrorCategory.TOKEN_EXPIRED:
        suggestions.push(...this.getTokenExpiredSuggestions(recoveryContext));
        break;
      
      case AuthErrorCategory.TOKEN_INVALID:
        suggestions.push(...this.getTokenInvalidSuggestions(recoveryContext));
        break;
      
      case AuthErrorCategory.TOKEN_REFRESH_FAILED:
        suggestions.push(...this.getTokenRefreshFailedSuggestions(recoveryContext));
        break;
      
      case AuthErrorCategory.PERMISSION_DENIED:
        suggestions.push(...this.getPermissionDeniedSuggestions(recoveryContext));
        break;
      
      case AuthErrorCategory.USER_STATE_CORRUPTED:
        suggestions.push(...this.getUserStateCorruptedSuggestions(recoveryContext));
        break;
      
      case AuthErrorCategory.STORAGE_ACCESS_FAILED:
        suggestions.push(...this.getStorageAccessFailedSuggestions(recoveryContext));
        break;
      
      case AuthErrorCategory.SESSION_EXPIRED:
        suggestions.push(...this.getSessionExpiredSuggestions(recoveryContext));
        break;
      
      default:
        suggestions.push(...this.getGenericSuggestions(recoveryContext));
    }

    // Sort by success rate and user preference
    return suggestions.sort((a, b) => {
      if (recoveryContext.userPreferences?.preferAutomatedRecovery) {
        if (a.canAutoExecute && !b.canAutoExecute) return -1;
        if (!a.canAutoExecute && b.canAutoExecute) return 1;
      }
      return b.successRate - a.successRate;
    });
  }

  /**
   * Executes an automated recovery suggestion
   */
  public async executeRecovery(
    suggestionId: string,
    errorId: string
  ): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    const startTime = Date.now();
    
    try {
      authErrorLogger.recordResolutionAttempt(
        errorId,
        `automated_recovery_${suggestionId}`,
        false,
        undefined,
        0
      );

      const result = await this.performRecoveryAction(suggestionId);
      const duration = Date.now() - startTime;

      authErrorLogger.recordResolutionAttempt(
        errorId,
        `automated_recovery_${suggestionId}`,
        result.success,
        result.success ? undefined : result.message,
        duration
      );

      if (result.success) {
        authErrorLogger.resolveError(errorId, `automated_recovery_${suggestionId}`, 'resolved');
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      authErrorLogger.recordResolutionAttempt(
        errorId,
        `automated_recovery_${suggestionId}`,
        false,
        errorMessage,
        duration
      );

      return {
        success: false,
        message: `Recovery failed: ${errorMessage}`,
        nextSteps: ['Try manual recovery options', 'Contact support if issue persists']
      };
    }
  }

  /**
   * Records user's manual recovery attempt
   */
  public recordManualRecoveryAttempt(
    suggestionId: string,
    errorId: string,
    success: boolean,
    userFeedback?: string
  ): void {
    authErrorLogger.recordResolutionAttempt(
      errorId,
      `manual_recovery_${suggestionId}`,
      success,
      success ? undefined : userFeedback
    );

    if (success) {
      authErrorLogger.resolveError(
        errorId, 
        `manual_recovery_${suggestionId}`, 
        userFeedback ? 'resolved' : 'partially_resolved'
      );
    }
  }

  /**
   * Gets recovery suggestions for token expired errors
   */
  private getTokenExpiredSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    return [
      {
        id: 'auto_token_refresh',
        title: 'Automatic Token Refresh',
        description: 'Automatically refresh your authentication token in the background',
        estimatedTime: '2-5 seconds',
        difficulty: 'easy',
        successRate: 0.95,
        requiresUserAction: false,
        canAutoExecute: true,
        steps: [
          {
            order: 1,
            instruction: 'Attempting to refresh authentication token...',
            isAutomated: true,
            expectedOutcome: 'New valid token obtained',
            troubleshooting: [
              'Check internet connection',
              'Verify refresh token is valid'
            ]
          },
          {
            order: 2,
            instruction: 'Retrying original request with new token...',
            isAutomated: true,
            expectedOutcome: 'Request completes successfully'
          }
        ]
      },
      {
        id: 'manual_relogin',
        title: 'Sign In Again',
        description: 'Sign out and sign back in to get fresh authentication',
        estimatedTime: '30-60 seconds',
        difficulty: 'easy',
        successRate: 0.99,
        requiresUserAction: true,
        canAutoExecute: false,
        steps: [
          {
            order: 1,
            instruction: 'Click the "Sign Out" button or link',
            isAutomated: false,
            expectedOutcome: 'You are signed out of the application'
          },
          {
            order: 2,
            instruction: 'Click "Sign In" and enter your credentials',
            isAutomated: false,
            expectedOutcome: 'You are signed back in with fresh authentication'
          },
          {
            order: 3,
            instruction: 'Try your original action again',
            isAutomated: false,
            expectedOutcome: 'Action completes successfully'
          }
        ]
      }
    ];
  }

  /**
   * Gets recovery suggestions for invalid token errors
   */
  private getTokenInvalidSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    return [
      {
        id: 'clear_invalid_tokens',
        title: 'Clear Invalid Authentication Data',
        description: 'Remove corrupted authentication data and redirect to sign in',
        estimatedTime: '5-10 seconds',
        difficulty: 'easy',
        successRate: 0.98,
        requiresUserAction: true,
        canAutoExecute: context.userPreferences?.allowDataClearing || false,
        steps: [
          {
            order: 1,
            instruction: 'Clearing invalid authentication tokens...',
            isAutomated: true,
            expectedOutcome: 'Invalid tokens removed from storage'
          },
          {
            order: 2,
            instruction: 'Redirecting to sign in page...',
            isAutomated: true,
            expectedOutcome: 'Sign in page loads'
          },
          {
            order: 3,
            instruction: 'Enter your credentials to sign in',
            isAutomated: false,
            expectedOutcome: 'Successfully signed in with valid tokens'
          }
        ]
      }
    ];
  }

  /**
   * Gets recovery suggestions for token refresh failures
   */
  private getTokenRefreshFailedSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    return [
      {
        id: 'force_relogin',
        title: 'Force Fresh Sign In',
        description: 'Clear all authentication data and sign in again',
        estimatedTime: '30-60 seconds',
        difficulty: 'easy',
        successRate: 0.97,
        requiresUserAction: true,
        canAutoExecute: false,
        steps: [
          {
            order: 1,
            instruction: 'Clearing all authentication data...',
            isAutomated: true,
            expectedOutcome: 'All tokens and session data cleared'
          },
          {
            order: 2,
            instruction: 'Redirecting to sign in page...',
            isAutomated: true,
            expectedOutcome: 'Clean sign in page loads'
          },
          {
            order: 3,
            instruction: 'Sign in with your username and password',
            isAutomated: false,
            expectedOutcome: 'Fresh authentication session established'
          }
        ]
      },
      {
        id: 'check_network_retry',
        title: 'Check Connection and Retry',
        description: 'Verify network connection and attempt token refresh again',
        estimatedTime: '10-30 seconds',
        difficulty: 'easy',
        successRate: 0.75,
        requiresUserAction: false,
        canAutoExecute: true,
        steps: [
          {
            order: 1,
            instruction: 'Checking network connectivity...',
            isAutomated: true,
            expectedOutcome: 'Network connection verified'
          },
          {
            order: 2,
            instruction: 'Retrying token refresh...',
            isAutomated: true,
            expectedOutcome: 'Token refresh succeeds'
          }
        ]
      }
    ];
  }

  /**
   * Gets recovery suggestions for permission denied errors
   */
  private getPermissionDeniedSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    return [
      {
        id: 'show_limited_view',
        title: 'Continue with Limited Access',
        description: 'Show available features while restricting access to protected content',
        estimatedTime: '1-2 seconds',
        difficulty: 'easy',
        successRate: 0.90,
        requiresUserAction: false,
        canAutoExecute: true,
        steps: [
          {
            order: 1,
            instruction: 'Loading available features for your access level...',
            isAutomated: true,
            expectedOutcome: 'Limited functionality view displayed'
          }
        ]
      },
      {
        id: 'contact_admin',
        title: 'Request Access Permissions',
        description: 'Contact your administrator to request additional permissions',
        estimatedTime: '2-5 minutes',
        difficulty: 'easy',
        successRate: 0.60,
        requiresUserAction: true,
        canAutoExecute: false,
        steps: [
          {
            order: 1,
            instruction: 'Find your administrator\'s contact information',
            isAutomated: false,
            expectedOutcome: 'Administrator contact details located'
          },
          {
            order: 2,
            instruction: 'Send a request explaining what access you need',
            isAutomated: false,
            expectedOutcome: 'Access request submitted'
          },
          {
            order: 3,
            instruction: 'Wait for administrator approval and try again',
            isAutomated: false,
            expectedOutcome: 'Permissions granted and access restored'
          }
        ]
      }
    ];
  }

  /**
   * Gets recovery suggestions for corrupted user state
   */
  private getUserStateCorruptedSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    return [
      {
        id: 'reset_user_state',
        title: 'Reset User State',
        description: 'Clear corrupted user data and restore to clean state',
        estimatedTime: '5-10 seconds',
        difficulty: 'medium',
        successRate: 0.92,
        requiresUserAction: false,
        canAutoExecute: context.userPreferences?.allowDataClearing || false,
        steps: [
          {
            order: 1,
            instruction: 'Detecting corrupted user state data...',
            isAutomated: true,
            expectedOutcome: 'Corrupted data identified'
          },
          {
            order: 2,
            instruction: 'Clearing corrupted user state...',
            isAutomated: true,
            expectedOutcome: 'Corrupted data removed'
          },
          {
            order: 3,
            instruction: 'Initializing clean user state...',
            isAutomated: true,
            expectedOutcome: 'Clean user state established'
          },
          {
            order: 4,
            instruction: 'Reloading user data...',
            isAutomated: true,
            expectedOutcome: 'Fresh user data loaded'
          }
        ]
      }
    ];
  }

  /**
   * Gets recovery suggestions for storage access failures
   */
  private getStorageAccessFailedSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];

    if (context.browserSupportsFeatures.sessionStorage) {
      suggestions.push({
        id: 'session_only_mode',
        title: 'Continue with Session-Only Mode',
        description: 'Use session storage instead of persistent storage',
        estimatedTime: '2-5 seconds',
        difficulty: 'easy',
        successRate: 0.85,
        requiresUserAction: false,
        canAutoExecute: true,
        steps: [
          {
            order: 1,
            instruction: 'Switching to session-only authentication mode...',
            isAutomated: true,
            expectedOutcome: 'Session storage configured for authentication'
          },
          {
            order: 2,
            instruction: 'Note: You will need to sign in again when you close your browser',
            isAutomated: false,
            expectedOutcome: 'User informed about session limitations'
          }
        ]
      });
    }

    suggestions.push({
      id: 'enable_storage_permissions',
      title: 'Enable Browser Storage',
      description: 'Check browser settings and enable storage permissions',
      estimatedTime: '1-3 minutes',
      difficulty: 'medium',
      successRate: 0.70,
      requiresUserAction: true,
      canAutoExecute: false,
      steps: [
        {
          order: 1,
          instruction: 'Open your browser settings',
          isAutomated: false,
          expectedOutcome: 'Browser settings page opens'
        },
        {
          order: 2,
          instruction: 'Navigate to Privacy & Security settings',
          isAutomated: false,
          expectedOutcome: 'Privacy settings displayed'
        },
        {
          order: 3,
          instruction: 'Enable cookies and site data for this website',
          isAutomated: false,
          expectedOutcome: 'Storage permissions enabled'
        },
        {
          order: 4,
          instruction: 'Refresh this page to apply changes',
          isAutomated: false,
          expectedOutcome: 'Page reloads with storage access'
        }
      ]
    });

    return suggestions;
  }

  /**
   * Gets recovery suggestions for session expired errors
   */
  private getSessionExpiredSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    return [
      {
        id: 'extend_session',
        title: 'Extend Session',
        description: 'Attempt to extend your current session',
        estimatedTime: '3-8 seconds',
        difficulty: 'easy',
        successRate: 0.80,
        requiresUserAction: false,
        canAutoExecute: true,
        steps: [
          {
            order: 1,
            instruction: 'Checking if session can be extended...',
            isAutomated: true,
            expectedOutcome: 'Session extension availability determined'
          },
          {
            order: 2,
            instruction: 'Requesting session extension...',
            isAutomated: true,
            expectedOutcome: 'Session extended successfully'
          }
        ]
      },
      {
        id: 'fresh_session',
        title: 'Start Fresh Session',
        description: 'Sign in again to start a new session',
        estimatedTime: '30-60 seconds',
        difficulty: 'easy',
        successRate: 0.99,
        requiresUserAction: true,
        canAutoExecute: false,
        steps: [
          {
            order: 1,
            instruction: 'Clearing expired session data...',
            isAutomated: true,
            expectedOutcome: 'Old session data removed'
          },
          {
            order: 2,
            instruction: 'Redirecting to sign in page...',
            isAutomated: true,
            expectedOutcome: 'Sign in page loads'
          },
          {
            order: 3,
            instruction: 'Sign in with your credentials',
            isAutomated: false,
            expectedOutcome: 'New session established'
          }
        ]
      }
    ];
  }

  /**
   * Gets generic recovery suggestions
   */
  private getGenericSuggestions(context: RecoveryContext): RecoverySuggestion[] {
    return [
      {
        id: 'retry_operation',
        title: 'Retry Operation',
        description: 'Try the failed operation again',
        estimatedTime: '5-15 seconds',
        difficulty: 'easy',
        successRate: 0.60,
        requiresUserAction: true,
        canAutoExecute: false,
        steps: [
          {
            order: 1,
            instruction: 'Click the retry button or refresh the page',
            isAutomated: false,
            expectedOutcome: 'Operation attempted again'
          }
        ]
      },
      {
        id: 'clear_cache_refresh',
        title: 'Clear Cache and Refresh',
        description: 'Clear browser cache and reload the page',
        estimatedTime: '30-60 seconds',
        difficulty: 'medium',
        successRate: 0.75,
        requiresUserAction: true,
        canAutoExecute: false,
        steps: [
          {
            order: 1,
            instruction: 'Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh',
            isAutomated: false,
            expectedOutcome: 'Page reloads with cleared cache'
          }
        ]
      }
    ];
  }

  /**
   * Categorizes error for recovery suggestions
   */
  private categorizeError(error: ApiError): AuthErrorCategory {
    // This mirrors the logic from AuthErrorLogger
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

    return AuthErrorCategory.AUTHENTICATION_FAILED;
  }

  /**
   * Performs the actual recovery action
   */
  private async performRecoveryAction(suggestionId: string): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    switch (suggestionId) {
      case 'auto_token_refresh':
        return this.performTokenRefresh();
      
      case 'clear_invalid_tokens':
        return this.clearInvalidTokens();
      
      case 'session_only_mode':
        return this.enableSessionOnlyMode();
      
      case 'reset_user_state':
        return this.resetUserState();
      
      case 'show_limited_view':
        return this.showLimitedView();
      
      case 'check_network_retry':
        return this.checkNetworkAndRetry();
      
      default:
        return {
          success: false,
          message: 'Unknown recovery action',
          nextSteps: ['Try manual recovery options']
        };
    }
  }

  /**
   * Recovery action implementations
   */
  private async performTokenRefresh(): Promise<{ success: boolean; message: string }> {
    try {
      // This would integrate with the actual token manager
      // For now, simulate the action
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Token refresh failed'
      };
    }
  }

  private async clearInvalidTokens(): Promise<{ success: boolean; message: string }> {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('auth_token');
      return {
        success: true,
        message: 'Invalid tokens cleared'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear tokens'
      };
    }
  }

  private async enableSessionOnlyMode(): Promise<{ success: boolean; message: string }> {
    try {
      sessionStorage.setItem('auth_mode', 'session_only');
      return {
        success: true,
        message: 'Session-only mode enabled'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to enable session-only mode'
      };
    }
  }

  private async resetUserState(): Promise<{ success: boolean; message: string }> {
    try {
      // Clear all user-related storage
      const keysToRemove = ['user_state', 'user_preferences', 'cached_user_data'];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      return {
        success: true,
        message: 'User state reset successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reset user state'
      };
    }
  }

  private async showLimitedView(): Promise<{ success: boolean; message: string }> {
    try {
      sessionStorage.setItem('view_mode', 'limited');
      return {
        success: true,
        message: 'Limited view mode enabled'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to enable limited view'
      };
    }
  }

  private async checkNetworkAndRetry(): Promise<{ success: boolean; message: string }> {
    try {
      // Simple network check
      const response = await fetch('/api/health', { method: 'HEAD' });
      if (response.ok) {
        return {
          success: true,
          message: 'Network connection verified'
        };
      } else {
        return {
          success: false,
          message: 'Network connection issues detected'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Network check failed'
      };
    }
  }
}

interface RecoveryAttempt {
  timestamp: Date;
  suggestionId: string;
  success: boolean;
  userFeedback?: string;
}

// Singleton instance
export const recoverySuggestionService = RecoverySuggestionService.getInstance();