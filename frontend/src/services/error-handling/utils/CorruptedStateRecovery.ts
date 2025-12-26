/**
 * Corrupted State Recovery Service
 * Handles detection, cleanup, and recovery from corrupted authentication state
 */

import type { User } from '../../../contexts/EnhancedAuthContext';
import type { TokenState } from '../../../types/error.types';
import { stateValidator, type StateValidationResult, type AuthStateSnapshot } from './StateValidator';
import { tokenManager } from '../TokenManager';

export interface RecoveryResult {
  success: boolean;
  strategy: 'cleanup' | 'session_only' | 'full_reset';
  message: string;
  requiresReauth: boolean;
  preservedData?: Partial<User>;
}

export interface SessionOnlyState {
  user: User | null;
  sessionToken: string | null;
  isSessionOnly: boolean;
  originalCorruption: string[];
}

export class CorruptedStateRecovery {
  private sessionOnlyState: SessionOnlyState | null = null;
  private recoveryAttempts: number = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly SESSION_STORAGE_PREFIX = 'session_auth_';

  /**
   * Detects and recovers from corrupted authentication state
   */
  async detectAndRecover(
    user: User | null,
    token: string | null,
    refreshToken: string | null,
    tokenState: TokenState
  ): Promise<RecoveryResult> {
    try {
      // Prevent infinite recovery loops
      if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
        return {
          success: false,
          strategy: 'full_reset',
          message: 'Maximum recovery attempts exceeded. Full reset required.',
          requiresReauth: true
        };
      }

      this.recoveryAttempts++;

      // Create state snapshot for validation
      const snapshot = stateValidator.createStateSnapshot(user, token, refreshToken, tokenState);
      
      // Validate the current state
      const validation = stateValidator.validateAuthState(snapshot);

      if (validation.isValid) {
        // State is valid, reset recovery attempts
        this.recoveryAttempts = 0;
        return {
          success: true,
          strategy: 'cleanup',
          message: 'Authentication state is valid',
          requiresReauth: false
        };
      }

      console.warn('Corrupted authentication state detected:', {
        errors: validation.errors,
        corruptedFields: validation.corruptedFields,
        strategy: validation.recoveryStrategy
      });

      // Attempt recovery based on the determined strategy
      switch (validation.recoveryStrategy) {
        case 'cleanup':
          return await this.performCleanupRecovery(snapshot, validation);
        
        case 'session_only':
          return await this.performSessionOnlyRecovery(snapshot, validation);
        
        case 'full_reset':
          return await this.performFullReset(validation);
        
        default:
          return await this.performFullReset(validation);
      }
    } catch (error) {
      console.error('Error during state recovery:', error);
      return {
        success: false,
        strategy: 'full_reset',
        message: 'Recovery process failed. Full reset required.',
        requiresReauth: true
      };
    }
  }

  /**
   * Performs cleanup recovery for minor corruption issues
   */
  private async performCleanupRecovery(
    snapshot: AuthStateSnapshot,
    validation: StateValidationResult
  ): Promise<RecoveryResult> {
    try {
      let preservedData: Partial<User> | undefined;

      // Clean up corrupted localStorage entries
      await this.cleanupLocalStorage(validation.corruptedFields);

      // Attempt to preserve valid user data
      if (snapshot.user && !validation.corruptedFields.some(field => field.startsWith('user'))) {
        preservedData = { ...snapshot.user };
        
        // Re-store clean user data
        localStorage.setItem('auth_user', JSON.stringify(preservedData));
      }

      // Clean up token state if needed
      if (validation.corruptedFields.some(field => field.includes('token'))) {
        // Clear corrupted tokens but preserve user data if valid
        tokenManager.clearTokens();
        
        // Remove corrupted token storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_expires_at');
      }

      // Reset recovery attempts on successful cleanup
      this.recoveryAttempts = 0;

      return {
        success: true,
        strategy: 'cleanup',
        message: 'Corrupted data cleaned up successfully',
        requiresReauth: validation.corruptedFields.some(field => field.includes('token')),
        preservedData
      };
    } catch (error) {
      console.error('Cleanup recovery failed:', error);
      return await this.performFullReset(validation);
    }
  }

  /**
   * Performs session-only recovery when localStorage is corrupted but user data is recoverable
   */
  private async performSessionOnlyRecovery(
    snapshot: AuthStateSnapshot,
    validation: StateValidationResult
  ): Promise<RecoveryResult> {
    try {
      // Extract any valid user data
      let validUser: User | null = null;
      
      if (snapshot.user && !validation.corruptedFields.some(field => field.startsWith('user.'))) {
        validUser = { ...snapshot.user };
      } else if (snapshot.localStorage['auth_user']) {
        try {
          const storedUser = JSON.parse(snapshot.localStorage['auth_user']);
          if (typeof storedUser === 'object' && storedUser.id && storedUser.email) {
            validUser = storedUser;
          }
        } catch (parseError) {
          console.warn('Could not parse stored user data for session recovery');
        }
      }

      // Clear corrupted localStorage
      await this.cleanupLocalStorage(validation.corruptedFields);
      tokenManager.clearTokens();

      // Set up session-only state
      this.sessionOnlyState = {
        user: validUser,
        sessionToken: this.generateSessionToken(),
        isSessionOnly: true,
        originalCorruption: validation.corruptedFields
      };

      // Store session data in sessionStorage (not localStorage)
      if (validUser) {
        sessionStorage.setItem(
          `${this.SESSION_STORAGE_PREFIX}user`,
          JSON.stringify(validUser)
        );
      }
      
      sessionStorage.setItem(
        `${this.SESSION_STORAGE_PREFIX}token`,
        this.sessionOnlyState.sessionToken
      );
      
      sessionStorage.setItem(
        `${this.SESSION_STORAGE_PREFIX}corruption`,
        JSON.stringify(validation.corruptedFields)
      );

      console.info('Switched to session-only authentication mode');

      return {
        success: true,
        strategy: 'session_only',
        message: 'Switched to session-only mode due to storage corruption',
        requiresReauth: !validUser,
        preservedData: validUser || undefined
      };
    } catch (error) {
      console.error('Session-only recovery failed:', error);
      return await this.performFullReset(validation);
    }
  }

  /**
   * Performs full reset when corruption is too severe
   */
  private async performFullReset(validation: StateValidationResult): Promise<RecoveryResult> {
    try {
      // Clear all authentication data
      await this.clearAllAuthData();
      
      // Clear session-only state
      this.sessionOnlyState = null;
      
      // Reset recovery attempts
      this.recoveryAttempts = 0;

      console.warn('Performed full authentication reset due to severe corruption');

      return {
        success: true,
        strategy: 'full_reset',
        message: 'Authentication state reset due to corruption. Please log in again.',
        requiresReauth: true
      };
    } catch (error) {
      console.error('Full reset failed:', error);
      return {
        success: false,
        strategy: 'full_reset',
        message: 'Failed to reset authentication state. Manual intervention may be required.',
        requiresReauth: true
      };
    }
  }

  /**
   * Cleans up corrupted localStorage entries
   */
  private async cleanupLocalStorage(corruptedFields: string[]): Promise<void> {
    const storageKeysToClean = new Set<string>();

    corruptedFields.forEach(field => {
      if (field.includes('localStorage.auth_user')) {
        storageKeysToClean.add('auth_user');
      }
      if (field.includes('localStorage.auth_token')) {
        storageKeysToClean.add('auth_token');
        storageKeysToClean.add('token'); // Legacy key
        storageKeysToClean.add('adminToken'); // Legacy key
      }
      if (field.includes('localStorage.auth_refresh_token')) {
        storageKeysToClean.add('auth_refresh_token');
      }
      if (field.includes('localStorage.auth_expires_at')) {
        storageKeysToClean.add('auth_expires_at');
      }
    });

    // Remove corrupted entries
    storageKeysToClean.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove corrupted localStorage key: ${key}`, error);
      }
    });
  }

  /**
   * Clears all authentication data from all storage mechanisms
   */
  private async clearAllAuthData(): Promise<void> {
    // Clear localStorage
    const authKeys = [
      'auth_token',
      'auth_refresh_token',
      'auth_user',
      'auth_expires_at',
      'auth_requires_password_change',
      'token',
      'adminToken'
    ];

    authKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to clear localStorage key: ${key}`, error);
      }
    });

    // Clear sessionStorage
    const sessionKeys = Object.keys(sessionStorage).filter(key => 
      key.startsWith(this.SESSION_STORAGE_PREFIX)
    );

    sessionKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to clear sessionStorage key: ${key}`, error);
      }
    });

    // Clear token manager
    tokenManager.clearTokens();
  }

  /**
   * Generates a temporary session token for session-only mode
   */
  private generateSessionToken(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Checks if currently in session-only mode
   */
  isSessionOnlyMode(): boolean {
    return this.sessionOnlyState !== null;
  }

  /**
   * Gets session-only state information
   */
  getSessionOnlyState(): SessionOnlyState | null {
    return this.sessionOnlyState;
  }

  /**
   * Attempts to restore from session-only mode (e.g., after successful re-authentication)
   */
  async restoreFromSessionOnly(newToken: string, newRefreshToken: string, user: User): Promise<boolean> {
    try {
      if (!this.sessionOnlyState) {
        return false; // Not in session-only mode
      }

      // Clear session-only state
      this.sessionOnlyState = null;
      
      // Clear session storage
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.startsWith(this.SESSION_STORAGE_PREFIX)
      );
      sessionKeys.forEach(key => sessionStorage.removeItem(key));

      // Set up normal authentication state
      tokenManager.setTokens(newToken, newRefreshToken);
      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_refresh_token', newRefreshToken);
      localStorage.setItem('auth_user', JSON.stringify(user));

      console.info('Successfully restored from session-only mode');
      return true;
    } catch (error) {
      console.error('Failed to restore from session-only mode:', error);
      return false;
    }
  }

  /**
   * Gets recovery statistics for monitoring
   */
  getRecoveryStats(): {
    recoveryAttempts: number;
    isSessionOnly: boolean;
    lastRecoveryTime: Date | null;
  } {
    return {
      recoveryAttempts: this.recoveryAttempts,
      isSessionOnly: this.isSessionOnlyMode(),
      lastRecoveryTime: null // Could be enhanced to track this
    };
  }

  /**
   * Resets recovery attempt counter (call after successful authentication)
   */
  resetRecoveryAttempts(): void {
    this.recoveryAttempts = 0;
  }
}

// Singleton instance
export const corruptedStateRecovery = new CorruptedStateRecovery();