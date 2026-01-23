/**
 * Invalid State Recovery System
 * Handles detection and recovery from invalid authentication states
 */

import type { User } from '../../../contexts/EnhancedAuthContext';
import type { TokenState } from '../../../types/error.types';
import { corruptedStateRecovery } from './CorruptedStateRecovery';
import { tokenManager } from '../TokenManager';

export interface InvalidStateDetectionResult {
  isValid: boolean;
  invalidReasons: string[];
  severity: 'minor' | 'major' | 'critical';
  canAutoRecover: boolean;
  recommendedAction: 'refresh' | 'reauth' | 'reset';
}

export interface StateRecoveryResult {
  success: boolean;
  action: 'refreshed' | 'cleared' | 'reset' | 'failed';
  message: string;
  requiresUserAction: boolean;
  preservedData?: Partial<User>;
}

export class InvalidStateRecovery {
  private recoveryAttempts: Map<string, number> = new Map();
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private readonly RECOVERY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  private lastRecoveryAttempt: Map<string, Date> = new Map();

  /**
   * Detects if the current authentication state is invalid
   */
  detectInvalidState(
    user: User | null,
    token: string | null,
    refreshToken: string | null,
    tokenState: TokenState
  ): InvalidStateDetectionResult {
    const invalidReasons: string[] = [];
    let severity: 'minor' | 'major' | 'critical' = 'minor';

    // Check for token-user consistency
    if (token && !user) {
      invalidReasons.push('Token exists but user data is missing');
      severity = 'major';
    }

    if (user && !token) {
      invalidReasons.push('User data exists but token is missing');
      severity = 'major';
    }

    // Check for expired tokens with valid user
    if (user && token && tokenState.expiresAt) {
      const now = new Date();
      if (now > tokenState.expiresAt) {
        invalidReasons.push('Token has expired');
        severity = 'minor'; // Can be recovered with refresh
      }
    }

    // Check for inconsistent token state
    if (tokenState.accessToken !== token) {
      invalidReasons.push('Token state inconsistency detected');
      severity = 'major';
    }

    if (tokenState.refreshToken !== refreshToken) {
      invalidReasons.push('Refresh token state inconsistency detected');
      severity = 'major';
    }

    // Check for invalid user data structure
    if (user) {
      if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
        invalidReasons.push('User ID is invalid or missing');
        severity = 'critical';
      }

      if (!user.email || typeof user.email !== 'string' || user.email.trim() === '') {
        invalidReasons.push('User email is invalid or missing');
        severity = 'critical';
      }

      if (!user.role || typeof user.role !== 'string' || user.role.trim() === '') {
        invalidReasons.push('User role is invalid or missing');
        severity = 'major';
      }
    }

    // Check for stuck refresh state
    if (tokenState.isRefreshing) {
      const refreshTime = tokenState.lastRefresh;
      if (refreshTime) {
        const timeSinceRefresh = Date.now() - refreshTime.getTime();
        if (timeSinceRefresh > 60000) { // 1 minute
          invalidReasons.push('Token refresh appears to be stuck');
          severity = 'major';
        }
      }
    }

    // Check for localStorage inconsistencies - handle gracefully
    try {
      const storedUser = localStorage.getItem('auth_user');
      const storedToken = localStorage.getItem('auth_token');
      
      if (storedUser && user) {
        try {
          const parsedStoredUser = JSON.parse(storedUser);
          if (parsedStoredUser.id !== user.id) {
            invalidReasons.push('Stored user data does not match current user');
            severity = 'major';
          }
        } catch (parseError) {
          invalidReasons.push('Stored user data is corrupted');
          severity = 'major';
        }
      }

      if (storedToken !== token) {
        invalidReasons.push('Stored token does not match current token');
        severity = 'major';
      }
    } catch (error) {
      // localStorage is not available or throwing errors - this is not critical
      console.warn('localStorage validation failed:', error);
      // Don't add this as an invalid reason since localStorage might be disabled
    }

    const isValid = invalidReasons.length === 0;
    const canAutoRecover = severity !== 'critical' && invalidReasons.length <= 2;
    
    let recommendedAction: 'refresh' | 'reauth' | 'reset';
    if (severity === 'critical') {
      recommendedAction = 'reset';
    } else if (severity === 'major') {
      recommendedAction = 'reauth';
    } else {
      recommendedAction = 'refresh';
    }

    return {
      isValid,
      invalidReasons,
      severity,
      canAutoRecover,
      recommendedAction
    };
  }

  /**
   * Attempts to recover from invalid authentication state
   */
  async recoverFromInvalidState(
    user: User | null,
    token: string | null,
    refreshToken: string | null,
    tokenState: TokenState
  ): Promise<StateRecoveryResult> {
    const stateKey = this.generateStateKey(user, token);
    
    // Check if we're in cooldown period
    if (this.isInCooldown(stateKey)) {
      return {
        success: false,
        action: 'failed',
        message: 'Recovery is in cooldown period. Please wait before trying again.',
        requiresUserAction: true
      };
    }

    // Check recovery attempt limits
    const attempts = this.recoveryAttempts.get(stateKey) || 0;
    if (attempts >= this.MAX_RECOVERY_ATTEMPTS) {
      return {
        success: false,
        action: 'failed',
        message: 'Maximum recovery attempts exceeded. Please log in again.',
        requiresUserAction: true
      };
    }

    // Increment recovery attempts
    this.recoveryAttempts.set(stateKey, attempts + 1);
    this.lastRecoveryAttempt.set(stateKey, new Date());

    // Detect the type of invalid state
    const detection = this.detectInvalidState(user, token, refreshToken, tokenState);

    if (detection.isValid) {
      // State is actually valid, reset counters
      this.resetRecoveryAttempts(stateKey);
      return {
        success: true,
        action: 'refreshed',
        message: 'Authentication state is valid',
        requiresUserAction: false
      };
    }

    // Attempt recovery based on severity and recommended action
    try {
      switch (detection.recommendedAction) {
        case 'refresh':
          return await this.attemptTokenRefresh(user, detection);
        
        case 'reauth':
          return await this.attemptStateCleanup(user, detection);
        
        case 'reset':
          return await this.attemptFullReset(detection);
        
        default:
          return await this.attemptStateCleanup(user, detection);
      }
    } catch (error) {
      console.error('Recovery attempt failed:', error);
      return {
        success: false,
        action: 'failed',
        message: 'Recovery attempt failed due to an error',
        requiresUserAction: true
      };
    }
  }

  /**
   * Attempts to recover by refreshing tokens
   */
  private async attemptTokenRefresh(
    user: User | null,
    detection: InvalidStateDetectionResult
  ): Promise<StateRecoveryResult> {
    try {
      // Only attempt refresh if we have a refresh token
      const tokenState = tokenManager.getTokenState();
      if (!tokenState.refreshToken) {
        return {
          success: false,
          action: 'failed',
          message: 'Cannot refresh token: no refresh token available',
          requiresUserAction: true
        };
      }

      // Attempt token refresh
      await tokenManager.refreshToken();
      
      return {
        success: true,
        action: 'refreshed',
        message: 'Authentication tokens refreshed successfully',
        requiresUserAction: false,
        preservedData: user || undefined
      };
    } catch (error) {
      console.error('Token refresh failed during recovery:', error);
      
      // If refresh fails, fall back to cleanup
      return await this.attemptStateCleanup(user, detection);
    }
  }

  /**
   * Attempts to recover by cleaning up inconsistent state
   */
  private async attemptStateCleanup(
    user: User | null,
    detection: InvalidStateDetectionResult
  ): Promise<StateRecoveryResult> {
    // Preserve user data if it's valid
    let preservedData: Partial<User> | undefined;
    if (user && !detection.invalidReasons.some(reason => 
      reason.includes('User ID') || 
      reason.includes('User email') || 
      reason.includes('User role')
    )) {
      preservedData = { ...user };
    }

    // Clear inconsistent tokens - this should always work
    try {
      tokenManager.clearTokens();
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
    
    // Clean up localStorage inconsistencies - handle errors gracefully
    const keysToClean = ['auth_token', 'auth_refresh_token', 'auth_expires_at'];
    let localStorageErrors = 0;
    
    keysToClean.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to clean localStorage key: ${key}`, error);
        localStorageErrors++;
      }
    });

    // If user data is valid, try to preserve it
    if (preservedData) {
      try {
        localStorage.setItem('auth_user', JSON.stringify(preservedData));
      } catch (error) {
        console.warn('Failed to preserve user data:', error);
        preservedData = undefined;
        localStorageErrors++;
      }
    } else {
      // Clear user data if it's invalid
      try {
        localStorage.removeItem('auth_user');
      } catch (error) {
        console.warn('Failed to clear user data:', error);
        localStorageErrors++;
      }
    }

    // Even if localStorage operations fail, we can still succeed with token cleanup
    const message = localStorageErrors > 0 
      ? `Cleaned up authentication state with ${localStorageErrors} localStorage errors. ${preservedData ? 'User data preserved.' : 'Re-authentication required.'}`
      : preservedData 
        ? 'Cleaned up inconsistent authentication state. User data preserved.'
        : 'Cleaned up invalid authentication state. Re-authentication required.';

    return {
      success: true,
      action: 'cleared',
      message,
      requiresUserAction: !preservedData,
      preservedData
    };
  }

  /**
   * Attempts to recover by performing a full reset
   */
  private async attemptFullReset(
    detection: InvalidStateDetectionResult
  ): Promise<StateRecoveryResult> {
    try {
      // Use the corrupted state recovery system for full reset
      const result = await corruptedStateRecovery.detectAndRecover(
        null, // No user data to preserve in full reset
        null,
        null,
        {
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          isRefreshing: false,
          lastRefresh: null
        }
      );

      return {
        success: result.success,
        action: 'reset',
        message: result.message,
        requiresUserAction: result.requiresReauth
      };
    } catch (error) {
      console.error('Full reset failed:', error);
      
      // Even if full reset fails, we can still provide a basic recovery
      try {
        tokenManager.clearTokens();
      } catch (tokenError) {
        console.warn('Failed to clear tokens during fallback reset:', tokenError);
      }
      
      return {
        success: true,
        action: 'reset',
        message: 'Performed basic reset after full reset failed. Please log in again.',
        requiresUserAction: true
      };
    }
  }

  /**
   * Checks if recovery is in cooldown period
   */
  private isInCooldown(stateKey: string): boolean {
    const lastAttempt = this.lastRecoveryAttempt.get(stateKey);
    if (!lastAttempt) return false;

    const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
    return timeSinceLastAttempt < this.RECOVERY_COOLDOWN_MS;
  }

  /**
   * Generates a unique key for tracking recovery attempts
   */
  private generateStateKey(user: User | null, token: string | null): string {
    const userId = user?.id || 'anonymous';
    const tokenHash = token ? token.substring(0, 8) : 'no-token';
    return `${userId}_${tokenHash}`;
  }

  /**
   * Resets recovery attempts for a given state
   */
  resetRecoveryAttempts(stateKey?: string): void {
    if (stateKey) {
      this.recoveryAttempts.delete(stateKey);
      this.lastRecoveryAttempt.delete(stateKey);
    } else {
      // Clear all recovery attempts
      this.recoveryAttempts.clear();
      this.lastRecoveryAttempt.clear();
    }
  }

  /**
   * Gets recovery statistics for monitoring
   */
  getRecoveryStats(): {
    activeRecoveries: number;
    totalAttempts: number;
    cooldownStates: number;
  } {
    const now = Date.now();
    let cooldownStates = 0;
    let totalAttempts = 0;

    for (const [stateKey, attempts] of this.recoveryAttempts.entries()) {
      totalAttempts += attempts;
      
      const lastAttempt = this.lastRecoveryAttempt.get(stateKey);
      if (lastAttempt && (now - lastAttempt.getTime()) < this.RECOVERY_COOLDOWN_MS) {
        cooldownStates++;
      }
    }

    return {
      activeRecoveries: this.recoveryAttempts.size,
      totalAttempts,
      cooldownStates
    };
  }

  /**
   * Validates if the current state requires recovery
   */
  requiresRecovery(
    user: User | null,
    token: string | null,
    refreshToken: string | null,
    tokenState: TokenState
  ): boolean {
    const detection = this.detectInvalidState(user, token, refreshToken, tokenState);
    return !detection.isValid && detection.canAutoRecover;
  }
}

// Singleton instance
export const invalidStateRecovery = new InvalidStateRecovery();