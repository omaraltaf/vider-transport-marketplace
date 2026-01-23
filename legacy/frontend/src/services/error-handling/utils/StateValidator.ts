/**
 * State Validator
 * Validates and detects corruption in authentication state
 */

import type { User } from '../../../contexts/EnhancedAuthContext';
import type { TokenState } from '../../../types/error.types';

export interface StateValidationResult {
  isValid: boolean;
  errors: string[];
  corruptedFields: string[];
  canRecover: boolean;
  recoveryStrategy: 'cleanup' | 'session_only' | 'full_reset';
}

export interface AuthStateSnapshot {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tokenState: TokenState;
  localStorage: Record<string, string | null>;
  timestamp: Date;
}

export class StateValidator {
  private readonly REQUIRED_USER_FIELDS = ['id', 'email', 'role'];
  private readonly REQUIRED_TOKEN_FIELDS = ['accessToken'];
  private readonly MAX_TOKEN_AGE_HOURS = 24;
  private readonly MAX_USER_DATA_SIZE = 50000; // 50KB limit for user data

  /**
   * Validates the complete authentication state
   */
  validateAuthState(snapshot: AuthStateSnapshot): StateValidationResult {
    const errors: string[] = [];
    const corruptedFields: string[] = [];

    // Validate user data
    const userValidation = this.validateUserData(snapshot.user);
    errors.push(...userValidation.errors);
    corruptedFields.push(...userValidation.corruptedFields);

    // Validate token data
    const tokenValidation = this.validateTokenData(snapshot.token, snapshot.refreshToken);
    errors.push(...tokenValidation.errors);
    corruptedFields.push(...tokenValidation.corruptedFields);

    // Validate token state consistency
    const tokenStateValidation = this.validateTokenState(snapshot.tokenState);
    errors.push(...tokenStateValidation.errors);
    corruptedFields.push(...tokenStateValidation.corruptedFields);

    // Validate localStorage consistency
    const storageValidation = this.validateLocalStorage(snapshot.localStorage);
    errors.push(...storageValidation.errors);
    corruptedFields.push(...storageValidation.corruptedFields);

    // Cross-validate consistency between different state sources
    const consistencyValidation = this.validateStateConsistency(snapshot);
    errors.push(...consistencyValidation.errors);
    corruptedFields.push(...consistencyValidation.corruptedFields);

    const isValid = errors.length === 0;
    const recoveryStrategy = this.determineRecoveryStrategy(errors, corruptedFields);

    return {
      isValid,
      errors,
      corruptedFields,
      canRecover: recoveryStrategy !== 'full_reset',
      recoveryStrategy
    };
  }

  /**
   * Validates user data structure and content
   */
  private validateUserData(user: User | null): { errors: string[]; corruptedFields: string[] } {
    const errors: string[] = [];
    const corruptedFields: string[] = [];

    if (!user) {
      return { errors, corruptedFields }; // Null user is valid (not logged in)
    }

    // Check if user is an object
    if (typeof user !== 'object') {
      errors.push('User data is not an object');
      corruptedFields.push('user');
      return { errors, corruptedFields };
    }

    // Check required fields
    for (const field of this.REQUIRED_USER_FIELDS) {
      if (!(field in user) || !user[field as keyof User]) {
        errors.push(`Missing required user field: ${field}`);
        corruptedFields.push(`user.${field}`);
      }
    }

    // Validate field types and formats
    if (user.id && typeof user.id !== 'string') {
      errors.push('User ID must be a string');
      corruptedFields.push('user.id');
    }

    if (user.email && (typeof user.email !== 'string' || !this.isValidEmail(user.email))) {
      errors.push('User email is invalid');
      corruptedFields.push('user.email');
    }

    if (user.role && typeof user.role !== 'string') {
      errors.push('User role must be a string');
      corruptedFields.push('user.role');
    }

    if (user.companyId && typeof user.companyId !== 'string') {
      errors.push('Company ID must be a string');
      corruptedFields.push('user.companyId');
    }

    // Check data size to prevent memory issues
    const userDataSize = JSON.stringify(user).length;
    if (userDataSize > this.MAX_USER_DATA_SIZE) {
      errors.push(`User data too large: ${userDataSize} bytes`);
      corruptedFields.push('user');
    }

    // Validate profile structure if present
    if (user.profile && typeof user.profile !== 'object') {
      errors.push('User profile must be an object');
      corruptedFields.push('user.profile');
    }

    // Validate permissions array if present
    if (user.permissions && !Array.isArray(user.permissions)) {
      errors.push('User permissions must be an array');
      corruptedFields.push('user.permissions');
    }

    return { errors, corruptedFields };
  }

  /**
   * Validates token data
   */
  private validateTokenData(token: string | null, refreshToken: string | null): { errors: string[]; corruptedFields: string[] } {
    const errors: string[] = [];
    const corruptedFields: string[] = [];

    // If we have a token, validate its format
    if (token) {
      if (typeof token !== 'string') {
        errors.push('Access token must be a string');
        corruptedFields.push('token');
      } else if (!this.isValidTokenFormat(token)) {
        errors.push('Access token has invalid format');
        corruptedFields.push('token');
      } else if (this.isTokenExpired(token)) {
        errors.push('Access token is expired');
        corruptedFields.push('token');
      }
    }

    // If we have a refresh token, validate it
    if (refreshToken) {
      if (typeof refreshToken !== 'string') {
        errors.push('Refresh token must be a string');
        corruptedFields.push('refreshToken');
      } else if (!this.isValidTokenFormat(refreshToken)) {
        errors.push('Refresh token has invalid format');
        corruptedFields.push('refreshToken');
      }
    }

    // If we have a user but no tokens, that's suspicious
    if (token && !refreshToken) {
      errors.push('Access token present but refresh token missing');
      corruptedFields.push('refreshToken');
    }

    return { errors, corruptedFields };
  }

  /**
   * Validates token state consistency
   */
  private validateTokenState(tokenState: TokenState): { errors: string[]; corruptedFields: string[] } {
    const errors: string[] = [];
    const corruptedFields: string[] = [];

    if (!tokenState) {
      errors.push('Token state is missing');
      corruptedFields.push('tokenState');
      return { errors, corruptedFields };
    }

    // Validate token state structure
    if (typeof tokenState !== 'object') {
      errors.push('Token state must be an object');
      corruptedFields.push('tokenState');
      return { errors, corruptedFields };
    }

    // Check for required properties
    const requiredProps = ['accessToken', 'refreshToken', 'expiresAt', 'isRefreshing', 'lastRefresh'];
    for (const prop of requiredProps) {
      if (!(prop in tokenState)) {
        errors.push(`Token state missing property: ${prop}`);
        corruptedFields.push(`tokenState.${prop}`);
      }
    }

    // Validate expiry date if present
    if (tokenState.expiresAt) {
      if (!(tokenState.expiresAt instanceof Date)) {
        errors.push('Token expiry must be a Date object');
        corruptedFields.push('tokenState.expiresAt');
      } else if (isNaN(tokenState.expiresAt.getTime())) {
        errors.push('Token expiry date is invalid');
        corruptedFields.push('tokenState.expiresAt');
      }
    }

    // Validate lastRefresh date if present
    if (tokenState.lastRefresh) {
      if (!(tokenState.lastRefresh instanceof Date)) {
        errors.push('Last refresh must be a Date object');
        corruptedFields.push('tokenState.lastRefresh');
      } else if (isNaN(tokenState.lastRefresh.getTime())) {
        errors.push('Last refresh date is invalid');
        corruptedFields.push('tokenState.lastRefresh');
      }
    }

    // Validate isRefreshing flag
    if (typeof tokenState.isRefreshing !== 'boolean') {
      errors.push('isRefreshing must be a boolean');
      corruptedFields.push('tokenState.isRefreshing');
    }

    return { errors, corruptedFields };
  }

  /**
   * Validates localStorage consistency
   */
  private validateLocalStorage(localStorage: Record<string, string | null>): { errors: string[]; corruptedFields: string[] } {
    const errors: string[] = [];
    const corruptedFields: string[] = [];

    // Check for corrupted JSON in user data
    const userDataStr = localStorage['auth_user'];
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        if (typeof userData !== 'object' || userData === null) {
          errors.push('Stored user data is not a valid object');
          corruptedFields.push('localStorage.auth_user');
        }
      } catch (parseError) {
        errors.push('Stored user data is not valid JSON');
        corruptedFields.push('localStorage.auth_user');
      }
    }

    // Check for corrupted expiry date
    const expiresAtStr = localStorage['auth_expires_at'];
    if (expiresAtStr) {
      const expiresAt = new Date(expiresAtStr);
      if (isNaN(expiresAt.getTime())) {
        errors.push('Stored expiry date is invalid');
        corruptedFields.push('localStorage.auth_expires_at');
      }
    }

    // Check for suspicious token patterns
    const token = localStorage['auth_token'];
    if (token && !this.isValidTokenFormat(token)) {
      errors.push('Stored access token has invalid format');
      corruptedFields.push('localStorage.auth_token');
    }

    const refreshToken = localStorage['auth_refresh_token'];
    if (refreshToken && !this.isValidTokenFormat(refreshToken)) {
      errors.push('Stored refresh token has invalid format');
      corruptedFields.push('localStorage.auth_refresh_token');
    }

    return { errors, corruptedFields };
  }

  /**
   * Validates consistency between different state sources
   */
  private validateStateConsistency(snapshot: AuthStateSnapshot): { errors: string[]; corruptedFields: string[] } {
    const errors: string[] = [];
    const corruptedFields: string[] = [];

    // Check token consistency between context and token state
    if (snapshot.token !== snapshot.tokenState.accessToken) {
      errors.push('Token mismatch between context and token state');
      corruptedFields.push('token_consistency');
    }

    if (snapshot.refreshToken !== snapshot.tokenState.refreshToken) {
      errors.push('Refresh token mismatch between context and token state');
      corruptedFields.push('refresh_token_consistency');
    }

    // Check localStorage consistency
    const storedToken = snapshot.localStorage['auth_token'];
    if (snapshot.token && storedToken && snapshot.token !== storedToken) {
      errors.push('Token mismatch between context and localStorage');
      corruptedFields.push('storage_token_consistency');
    }

    const storedUser = snapshot.localStorage['auth_user'];
    if (snapshot.user && storedUser) {
      try {
        const parsedStoredUser = JSON.parse(storedUser);
        if (JSON.stringify(snapshot.user) !== JSON.stringify(parsedStoredUser)) {
          errors.push('User data mismatch between context and localStorage');
          corruptedFields.push('storage_user_consistency');
        }
      } catch (parseError) {
        // Already caught in localStorage validation
      }
    }

    return { errors, corruptedFields };
  }

  /**
   * Determines the appropriate recovery strategy based on validation results
   */
  private determineRecoveryStrategy(errors: string[], corruptedFields: string[]): 'cleanup' | 'session_only' | 'full_reset' {
    const criticalErrors = errors.filter(error => 
      error.includes('not an object') ||
      error.includes('too large') ||
      error.includes('not valid JSON')
    );

    const tokenErrors = corruptedFields.filter(field => 
      field.includes('token') || field.includes('Token')
    );

    const userErrors = corruptedFields.filter(field => 
      field.includes('user')
    );

    // If we have critical structural errors, full reset is needed
    if (criticalErrors.length > 0) {
      return 'full_reset';
    }

    // If only token-related issues, we can fall back to session-only
    if (tokenErrors.length > 0 && userErrors.length === 0) {
      return 'session_only';
    }

    // If we have minor issues that can be cleaned up
    if (errors.length > 0) {
      return 'cleanup';
    }

    return 'cleanup'; // Default to cleanup for any remaining cases
  }

  /**
   * Validates email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates token format (basic JWT structure check)
   */
  private isValidTokenFormat(token: string): boolean {
    // Basic JWT format check: should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64-encoded (allowing URL-safe base64)
    const base64Regex = /^[A-Za-z0-9_-]+$/;
    return parts.every(part => base64Regex.test(part) && part.length > 0);
  }

  /**
   * Checks if a token is expired based on its payload
   */
  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      if (!payload.exp) return false; // No expiry claim

      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch (error) {
      // If we can't decode the token, consider it expired
      return true;
    }
  }

  /**
   * Creates a snapshot of the current authentication state
   */
  createStateSnapshot(
    user: User | null,
    token: string | null,
    refreshToken: string | null,
    tokenState: TokenState
  ): AuthStateSnapshot {
    // Capture relevant localStorage items
    const localStorage: Record<string, string | null> = {};
    const keys = [
      'auth_token',
      'auth_refresh_token',
      'auth_user',
      'auth_expires_at',
      'auth_requires_password_change'
    ];

    keys.forEach(key => {
      localStorage[key] = window.localStorage.getItem(key);
    });

    return {
      user,
      token,
      refreshToken,
      tokenState,
      localStorage,
      timestamp: new Date()
    };
  }
}

// Singleton instance
export const stateValidator = new StateValidator();