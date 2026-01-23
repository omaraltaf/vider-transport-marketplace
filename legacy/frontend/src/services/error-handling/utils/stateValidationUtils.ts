/**
 * State Validation Utilities
 * Provides utility functions for validating authentication state
 */

import type { User } from '../../../contexts/EnhancedAuthContext';
import { invalidStateRecovery } from './InvalidStateRecovery';
import { tokenManager } from '../TokenManager';

/**
 * Validates if the current authentication state is consistent and valid
 */
export function validateAuthenticationState(
  user: User | null,
  token: string | null,
  refreshToken: string | null
): boolean {
  const tokenState = tokenManager.getTokenState();
  const detection = invalidStateRecovery.detectInvalidState(user, token, refreshToken, tokenState);
  return detection.isValid;
}

/**
 * Checks if the authentication state requires immediate attention
 */
export function requiresImmediateRecovery(
  user: User | null,
  token: string | null,
  refreshToken: string | null
): boolean {
  const tokenState = tokenManager.getTokenState();
  const detection = invalidStateRecovery.detectInvalidState(user, token, refreshToken, tokenState);
  return !detection.isValid && detection.severity === 'critical';
}

/**
 * Gets a human-readable description of authentication state issues
 */
export function getStateValidationSummary(
  user: User | null,
  token: string | null,
  refreshToken: string | null
): {
  isValid: boolean;
  issues: string[];
  severity: 'minor' | 'major' | 'critical';
  canAutoRecover: boolean;
} {
  const tokenState = tokenManager.getTokenState();
  const detection = invalidStateRecovery.detectInvalidState(user, token, refreshToken, tokenState);
  
  return {
    isValid: detection.isValid,
    issues: detection.invalidReasons,
    severity: detection.severity,
    canAutoRecover: detection.canAutoRecover
  };
}

/**
 * Performs a comprehensive health check of the authentication system
 */
export function performAuthHealthCheck(): {
  overall: 'healthy' | 'degraded' | 'critical';
  checks: {
    tokenManager: boolean;
    localStorage: boolean;
    stateConsistency: boolean;
    recoverySystem: boolean;
  };
  recommendations: string[];
} {
  const checks = {
    tokenManager: false,
    localStorage: false,
    stateConsistency: false,
    recoverySystem: false
  };
  
  const recommendations: string[] = [];

  // Check token manager
  try {
    const tokenState = tokenManager.getTokenState();
    checks.tokenManager = typeof tokenState === 'object' && tokenState !== null;
  } catch (error) {
    recommendations.push('Token manager is not functioning properly');
  }

  // Check localStorage access
  try {
    localStorage.setItem('auth_health_check', 'test');
    const testValue = localStorage.getItem('auth_health_check');
    localStorage.removeItem('auth_health_check');
    checks.localStorage = testValue === 'test';
  } catch (error) {
    recommendations.push('localStorage is not accessible');
  }

  // Check state consistency
  try {
    const storedToken = localStorage.getItem('auth_token');
    const tokenState = tokenManager.getTokenState();
    
    if (storedToken && tokenState.accessToken) {
      checks.stateConsistency = storedToken === tokenState.accessToken;
    } else if (!storedToken && !tokenState.accessToken) {
      checks.stateConsistency = true; // Both are null, which is consistent
    } else {
      checks.stateConsistency = false;
      recommendations.push('Authentication state is inconsistent between storage and memory');
    }
  } catch (error) {
    recommendations.push('Unable to verify state consistency');
  }

  // Check recovery system
  try {
    const recoveryStats = invalidStateRecovery.getRecoveryStats();
    checks.recoverySystem = typeof recoveryStats === 'object';
    
    if (recoveryStats.cooldownStates > 0) {
      recommendations.push(`${recoveryStats.cooldownStates} authentication states are in recovery cooldown`);
    }
  } catch (error) {
    recommendations.push('Recovery system is not functioning properly');
  }

  // Determine overall health
  const healthyChecks = Object.values(checks).filter(Boolean).length;
  let overall: 'healthy' | 'degraded' | 'critical';
  
  if (healthyChecks === 4) {
    overall = 'healthy';
  } else if (healthyChecks >= 2) {
    overall = 'degraded';
  } else {
    overall = 'critical';
  }

  return {
    overall,
    checks,
    recommendations
  };
}

/**
 * Validates user data structure and completeness
 */
export function validateUserData(user: User | null): {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
} {
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  if (!user) {
    return { isValid: true, missingFields, invalidFields }; // null user is valid (not logged in)
  }

  // Check required fields
  if (!user.id) {
    missingFields.push('id');
  } else if (typeof user.id !== 'string') {
    invalidFields.push('id (must be string)');
  }

  if (!user.email) {
    missingFields.push('email');
  } else if (typeof user.email !== 'string' || !user.email.includes('@')) {
    invalidFields.push('email (must be valid email)');
  }

  if (!user.role) {
    missingFields.push('role');
  } else if (typeof user.role !== 'string') {
    invalidFields.push('role (must be string)');
  }

  // Check optional fields
  if (user.companyId && typeof user.companyId !== 'string') {
    invalidFields.push('companyId (must be string)');
  }

  if (user.profile && typeof user.profile !== 'object') {
    invalidFields.push('profile (must be object)');
  }

  if (user.permissions && !Array.isArray(user.permissions)) {
    invalidFields.push('permissions (must be array)');
  }

  const isValid = missingFields.length === 0 && invalidFields.length === 0;

  return {
    isValid,
    missingFields,
    invalidFields
  };
}

/**
 * Validates token format and structure
 */
export function validateTokenFormat(token: string | null): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!token) {
    return { isValid: true, issues }; // null token is valid (not logged in)
  }

  if (typeof token !== 'string') {
    issues.push('Token must be a string');
    return { isValid: false, issues };
  }

  // Basic JWT format check
  const parts = token.split('.');
  if (parts.length !== 3) {
    issues.push('Token does not have valid JWT format (should have 3 parts)');
  }

  // Check if parts are base64 encoded
  const base64Regex = /^[A-Za-z0-9_-]+$/;
  parts.forEach((part, index) => {
    if (!base64Regex.test(part)) {
      issues.push(`Token part ${index + 1} is not valid base64`);
    }
  });

  // Try to decode payload
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Check for required JWT claims
      if (!payload.exp) {
        issues.push('Token is missing expiration claim');
      }
      
      if (!payload.iat) {
        issues.push('Token is missing issued at claim');
      }
    } catch (error) {
      issues.push('Token payload cannot be decoded');
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Creates a comprehensive state validation report
 */
export function createStateValidationReport(
  user: User | null,
  token: string | null,
  refreshToken: string | null
): {
  timestamp: Date;
  overall: 'valid' | 'invalid' | 'critical';
  userValidation: ReturnType<typeof validateUserData>;
  tokenValidation: ReturnType<typeof validateTokenFormat>;
  refreshTokenValidation: ReturnType<typeof validateTokenFormat>;
  stateValidation: ReturnType<typeof getStateValidationSummary>;
  healthCheck: ReturnType<typeof performAuthHealthCheck>;
  recommendations: string[];
} {
  const userValidation = validateUserData(user);
  const tokenValidation = validateTokenFormat(token);
  const refreshTokenValidation = validateTokenFormat(refreshToken);
  const stateValidation = getStateValidationSummary(user, token, refreshToken);
  const healthCheck = performAuthHealthCheck();

  const recommendations: string[] = [];

  // Add specific recommendations based on validation results
  if (!userValidation.isValid) {
    recommendations.push('User data validation failed - re-authentication may be required');
  }

  if (!tokenValidation.isValid) {
    recommendations.push('Access token validation failed - token refresh required');
  }

  if (!refreshTokenValidation.isValid && refreshToken) {
    recommendations.push('Refresh token validation failed - re-authentication required');
  }

  if (!stateValidation.isValid) {
    if (stateValidation.canAutoRecover) {
      recommendations.push('State issues detected but can be automatically recovered');
    } else {
      recommendations.push('Critical state issues detected - manual intervention required');
    }
  }

  // Add health check recommendations
  recommendations.push(...healthCheck.recommendations);

  // Determine overall status
  let overall: 'valid' | 'invalid' | 'critical';
  if (stateValidation.severity === 'critical' || healthCheck.overall === 'critical') {
    overall = 'critical';
  } else if (!stateValidation.isValid || healthCheck.overall === 'degraded') {
    overall = 'invalid';
  } else {
    overall = 'valid';
  }

  return {
    timestamp: new Date(),
    overall,
    userValidation,
    tokenValidation,
    refreshTokenValidation,
    stateValidation,
    healthCheck,
    recommendations: [...new Set(recommendations)] // Remove duplicates
  };
}