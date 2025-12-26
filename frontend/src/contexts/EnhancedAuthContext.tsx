/**
 * Enhanced Authentication Context
 * Provides robust user state management with loading states, error handling, and graceful fallbacks
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/authService';
import { tokenManager } from '../services/error-handling/TokenManager';
import { corruptedStateRecovery } from '../services/error-handling/utils/CorruptedStateRecovery';
import { invalidStateRecovery } from '../services/error-handling/utils/InvalidStateRecovery';
import { productionErrorTracker } from '../services/error-handling/ProductionErrorTracker';
import type { ApiError } from '../types/error.types';
import { ApiErrorType, ErrorSeverity } from '../types/error.types';

export interface User {
  id: string;
  email: string;
  role: string;
  companyId: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  permissions?: string[];
}

export interface AuthError {
  type: 'NETWORK' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'TOKEN_EXPIRED' | 'UNKNOWN';
  message: string;
  code?: string;
  retryable: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  lastUpdated: number;
}

export interface AuthContextValue extends AuthState {
  // Token management
  token: string | null;
  refreshToken: string | null;
  requiresPasswordChange: boolean;
  
  // Authentication methods
  login: (accessToken: string, refreshToken: string, user: User, requiresPasswordChange?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  
  // Legacy methods for backward compatibility
  refreshAccessToken: () => Promise<void>;
  clearPasswordChangeRequirement: () => void;
  
  // Enhanced methods
  getValidToken: () => Promise<string>;
  handleTokenError: (error: ApiError) => Promise<void>;
  isTokenValid: (token?: string) => boolean;
  
  // Corrupted state recovery methods
  isSessionOnlyMode: () => boolean;
  getRecoveryStats: () => {
    recoveryAttempts: number;
    isSessionOnly: boolean;
    lastRecoveryTime: Date | null;
  };
  
  // Invalid state recovery methods
  validateCurrentState: () => boolean;
  recoverFromInvalidState: () => Promise<boolean>;
}

const EnhancedAuthContext = createContext<AuthContextValue | undefined>(undefined);

export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update last updated timestamp
  const updateTimestamp = useCallback(() => {
    setLastUpdated(Date.now());
  }, []);

  // Sync with TokenManager state
  const syncWithTokenManager = useCallback(() => {
    const tokenState = tokenManager.getTokenState();
    setToken(tokenState.accessToken);
    setRefreshToken(tokenState.refreshToken);
    updateTimestamp();
  }, [updateTimestamp]);

  // Initialize authentication state with corrupted state detection
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load auth state from localStorage
        const storedToken = localStorage.getItem('auth_token');
        const storedRefreshToken = localStorage.getItem('auth_refresh_token');
        const storedUser = localStorage.getItem('auth_user');
        const storedPasswordChange = localStorage.getItem('auth_requires_password_change');

        if (storedToken && storedRefreshToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            
            // Get current token state for validation
            const tokenState = tokenManager.getTokenState();
            
            // Detect and recover from corrupted state
            const recoveryResult = await corruptedStateRecovery.detectAndRecover(
              parsedUser,
              storedToken,
              storedRefreshToken,
              tokenState
            );

            if (recoveryResult.success) {
              if (recoveryResult.strategy === 'full_reset') {
                // Full reset performed, clear everything
                setToken(null);
                setRefreshToken(null);
                setUser(null);
                setRequiresPasswordChange(false);
                setError({
                  type: 'UNKNOWN',
                  message: recoveryResult.message,
                  retryable: false
                });
              } else if (recoveryResult.strategy === 'session_only') {
                // Session-only mode, use preserved data if available
                if (recoveryResult.preservedData) {
                  setUser(recoveryResult.preservedData as User);
                  setToken(null); // No persistent token in session-only mode
                  setRefreshToken(null);
                  setRequiresPasswordChange(false);
                } else {
                  // No preserved data, require re-authentication
                  setError({
                    type: 'UNKNOWN',
                    message: recoveryResult.message,
                    retryable: false
                  });
                }
              } else {
                // Cleanup successful, proceed with normal initialization
                setToken(storedToken);
                setRefreshToken(storedRefreshToken);
                setUser(parsedUser);
                setRequiresPasswordChange(storedPasswordChange === 'true');
                
                // Initialize TokenManager with existing tokens
                const expiresAt = localStorage.getItem('auth_expires_at');
                const expiresIn = expiresAt ? Math.max(0, (new Date(expiresAt).getTime() - Date.now()) / 1000) : undefined;
                tokenManager.setTokens(storedToken, storedRefreshToken, expiresIn);
                
                // After successful recovery, check for invalid state
                const currentTokenState = tokenManager.getTokenState();
                if (invalidStateRecovery.requiresRecovery(parsedUser, storedToken, storedRefreshToken, currentTokenState)) {
                  console.info('Invalid state detected after corruption recovery, attempting additional recovery');
                  try {
                    const invalidStateResult = await invalidStateRecovery.recoverFromInvalidState(
                      parsedUser,
                      storedToken,
                      storedRefreshToken,
                      currentTokenState
                    );
                    
                    if (invalidStateResult.success && invalidStateResult.action === 'refreshed') {
                      // Sync with updated token state
                      syncWithTokenManager();
                    }
                  } catch (invalidStateError) {
                    console.warn('Invalid state recovery failed during initialization:', invalidStateError);
                  }
                }
              }
            } else {
              // Recovery failed, clear everything
              setToken(null);
              setRefreshToken(null);
              setUser(null);
              setRequiresPasswordChange(false);
              setError({
                type: 'UNKNOWN',
                message: recoveryResult.message,
                retryable: false
              });
            }
            
            updateTimestamp();
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
            
            // Attempt recovery from parse error
            const tokenState = tokenManager.getTokenState();
            const recoveryResult = await corruptedStateRecovery.detectAndRecover(
              null, // User data is corrupted
              storedToken,
              storedRefreshToken,
              tokenState
            );

            setError({
              type: 'UNKNOWN',
              message: recoveryResult.message,
              retryable: false
            });
          }
        } else {
          // Check if we're in session-only mode
          const sessionOnlyState = corruptedStateRecovery.getSessionOnlyState();
          if (sessionOnlyState && sessionOnlyState.user) {
            setUser(sessionOnlyState.user);
            setToken(null);
            setRefreshToken(null);
            setRequiresPasswordChange(false);
            updateTimestamp();
          }
        }
      } catch (initError) {
        console.error('Failed to initialize authentication:', initError);
        setError({
          type: 'UNKNOWN',
          message: 'Failed to initialize authentication',
          retryable: true
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up periodic sync with TokenManager
    const syncInterval = setInterval(syncWithTokenManager, 1000);
    return () => clearInterval(syncInterval);
  }, [syncWithTokenManager, updateTimestamp]);

  const login = useCallback(async (accessToken: string, newRefreshToken: string, newUser: User, requiresPasswordChangeFlag = false) => {
    const startTime = Date.now();
    try {
      setIsLoading(true);
      setError(null);
      
      // If we were in session-only mode, attempt to restore
      if (corruptedStateRecovery.isSessionOnlyMode()) {
        const restored = await corruptedStateRecovery.restoreFromSessionOnly(
          accessToken,
          newRefreshToken,
          newUser
        );
        
        if (restored) {
          console.info('Successfully restored from session-only mode');
        }
      }
      
      setToken(accessToken);
      setRefreshToken(newRefreshToken);
      setUser(newUser);
      setRequiresPasswordChange(requiresPasswordChangeFlag);
      
      // Store in localStorage
      localStorage.setItem('auth_token', accessToken);
      localStorage.setItem('auth_refresh_token', newRefreshToken);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      localStorage.setItem('auth_requires_password_change', requiresPasswordChangeFlag.toString());
      
      // Update TokenManager
      tokenManager.setTokens(accessToken, newRefreshToken);
      
      // Reset recovery attempts on successful login
      corruptedStateRecovery.resetRecoveryAttempts();
      
      updateTimestamp();
      
      // Track successful login performance
      productionErrorTracker.trackAuthPerformance('login', startTime, true, {
        userId: newUser.id,
        userRole: newUser.role
      });
    } catch (loginError) {
      console.error('Login error:', loginError);
      
      const authError: ApiError = {
        type: ApiErrorType.AUTH,
        severity: ErrorSeverity.HIGH,
        message: loginError instanceof Error ? loginError.message : 'Failed to complete login',
        stack: loginError instanceof Error ? loginError.stack : undefined,
        context: {
          timestamp: new Date(),
          component: 'EnhancedAuthContext',
          operation: 'login'
        }
      };
      
      // Track login error
      productionErrorTracker.trackAuthError(authError, {
        timestamp: new Date(),
        component: 'EnhancedAuthContext',
        operation: 'login'
      });
      
      // Track failed login performance
      productionErrorTracker.trackAuthPerformance('login', startTime, false, {
        error: authError.message
      });
      
      setError({
        type: 'UNKNOWN',
        message: 'Failed to complete login',
        retryable: true
      });
    } finally {
      setIsLoading(false);
    }
  }, [updateTimestamp]);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Pass the current token to the logout service
      if (token) {
        await authService.logout(token);
      }
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
      // Don't set error state during logout - we're clearing everything anyway
    } finally {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setRequiresPasswordChange(false);
      setError(null);
      setIsLoading(false);
      
      // Clear from localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_requires_password_change');
      localStorage.removeItem('auth_expires_at');
      
      // Clear TokenManager
      tokenManager.clearTokens();
      updateTimestamp();
    }
  }, [token, updateTimestamp]);

  const clearPasswordChangeRequirement = useCallback(() => {
    setRequiresPasswordChange(false);
    localStorage.removeItem('auth_requires_password_change');
    updateTimestamp();
  }, [updateTimestamp]);

  const refreshUser = useCallback(async () => {
    if (!user?.id) {
      throw new Error('No user to refresh');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch fresh user data
      const validToken = await getValidToken();
      const response = await fetch(`/api/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${validToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh user data');
      }

      const freshUser = await response.json();
      setUser(freshUser);
      localStorage.setItem('auth_user', JSON.stringify(freshUser));
      updateTimestamp();
    } catch (refreshError) {
      console.error('Failed to refresh user:', refreshError);
      setError({
        type: 'NETWORK',
        message: 'Failed to refresh user data',
        retryable: true
      });
      throw refreshError;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, updateTimestamp]);

  const refreshAccessToken = useCallback(async () => {
    const startTime = Date.now();
    try {
      setIsLoading(true);
      setError(null);
      
      const newToken = await tokenManager.refreshToken();
      setToken(newToken);
      
      // Update refresh token if it changed
      const tokenState = tokenManager.getTokenState();
      if (tokenState.refreshToken !== refreshToken) {
        setRefreshToken(tokenState.refreshToken);
      }
      
      updateTimestamp();
      
      // Track successful token refresh
      productionErrorTracker.trackAuthPerformance('token_refresh', startTime, true, {
        userId: user?.id
      });
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      
      const authError: ApiError = {
        type: ApiErrorType.AUTH,
        severity: ErrorSeverity.HIGH,
        message: refreshError instanceof Error ? refreshError.message : 'Token refresh failed',
        stack: refreshError instanceof Error ? refreshError.stack : undefined,
        context: {
          timestamp: new Date(),
          component: 'EnhancedAuthContext',
          operation: 'token_refresh'
        }
      };
      
      // Track token refresh error
      productionErrorTracker.trackAuthError(authError, {
        timestamp: new Date(),
        component: 'EnhancedAuthContext',
        operation: 'token_refresh'
      });
      
      // Track failed token refresh performance
      productionErrorTracker.trackAuthPerformance('token_refresh', startTime, false, {
        error: authError.message,
        userId: user?.id
      });
      
      setError({
        type: 'TOKEN_EXPIRED',
        message: 'Session expired. Please log in again.',
        retryable: false
      });
      
      // If refresh fails, logout the user
      await logout();
      throw refreshError;
    } finally {
      setIsLoading(false);
    }
  }, [refreshToken, logout, updateTimestamp]);

  // Enhanced methods using TokenManager
  const getValidToken = useCallback(async (): Promise<string> => {
    try {
      setError(null);
      const validToken = await tokenManager.getValidToken();
      
      // Update local state if token changed
      if (validToken !== token) {
        setToken(validToken);
        updateTimestamp();
      }
      
      return validToken;
    } catch (tokenError) {
      console.error('Failed to get valid token:', tokenError);
      setError({
        type: 'TOKEN_EXPIRED',
        message: 'Authentication required. Please log in.',
        retryable: false
      });
      
      // No valid token available, logout
      await logout();
      throw tokenError;
    }
  }, [token, logout, updateTimestamp]);

  const handleTokenError = useCallback(async (error: ApiError): Promise<void> => {
    if (error.type === ApiErrorType.AUTH) {
      try {
        setError(null);
        await tokenManager.handleTokenError(error);
        // Sync state after handling
        syncWithTokenManager();
      } catch (handlingError) {
        console.error('Token error handling failed:', handlingError);
        setError({
          type: 'TOKEN_EXPIRED',
          message: 'Authentication error. Please log in again.',
          retryable: false
        });
        
        // Token handling failed, logout
        await logout();
        throw handlingError;
      }
    }
  }, [syncWithTokenManager, logout]);

  const isTokenValid = useCallback((tokenToCheck?: string): boolean => {
    const checkToken = tokenToCheck || token;
    return tokenManager.isTokenValid(checkToken);
  }, [token]);

  // Corrupted state recovery methods
  const isSessionOnlyMode = useCallback(() => {
    return corruptedStateRecovery.isSessionOnlyMode();
  }, []);

  const getRecoveryStats = useCallback(() => {
    return corruptedStateRecovery.getRecoveryStats();
  }, []);

  // Invalid state recovery methods
  const validateCurrentState = useCallback(() => {
    const tokenState = tokenManager.getTokenState();
    const detection = invalidStateRecovery.detectInvalidState(
      user,
      token,
      refreshToken,
      tokenState
    );
    return detection.isValid;
  }, [user, token, refreshToken]);

  const recoverFromInvalidState = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const tokenState = tokenManager.getTokenState();
      const result = await invalidStateRecovery.recoverFromInvalidState(
        user,
        token,
        refreshToken,
        tokenState
      );

      if (result.success) {
        // Update state based on recovery result
        if (result.action === 'refreshed') {
          // Token was refreshed, sync with token manager
          syncWithTokenManager();
        } else if (result.action === 'cleared' || result.action === 'reset') {
          // State was cleared or reset
          if (result.preservedData) {
            setUser(result.preservedData as User);
            setToken(null);
            setRefreshToken(null);
          } else {
            setUser(null);
            setToken(null);
            setRefreshToken(null);
          }
          setRequiresPasswordChange(false);
        }

        updateTimestamp();
        return true;
      } else {
        // Recovery failed, set error
        setError({
          type: 'UNKNOWN',
          message: result.message,
          retryable: !result.requiresUserAction
        });
        return false;
      }
    } catch (recoveryError) {
      console.error('Invalid state recovery failed:', recoveryError);
      setError({
        type: 'UNKNOWN',
        message: 'Failed to recover from invalid authentication state',
        retryable: true
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, token, refreshToken, syncWithTokenManager, updateTimestamp]);

  const value: AuthContextValue = {
    // State
    user,
    isLoading,
    isAuthenticated: !!token && !!user && !isLoading,
    error,
    lastUpdated,
    
    // Token management
    token,
    refreshToken,
    requiresPasswordChange,
    
    // Authentication methods
    login,
    logout,
    refreshUser,
    clearError,
    
    // Legacy methods for backward compatibility
    refreshAccessToken,
    clearPasswordChangeRequirement,
    
    // Enhanced methods
    getValidToken,
    handleTokenError,
    isTokenValid,
    
    // Corrupted state recovery methods
    isSessionOnlyMode,
    getRecoveryStats,
    
    // Invalid state recovery methods
    validateCurrentState,
    recoverFromInvalidState,
  };

  return <EnhancedAuthContext.Provider value={value}>{children}</EnhancedAuthContext.Provider>;
}

export function useEnhancedAuth() {
  const context = useContext(EnhancedAuthContext);
  if (context === undefined) {
    throw new Error('useEnhancedAuth must be used within an EnhancedAuthProvider');
  }
  return context;
}

// Backward compatibility hook
export function useAuth() {
  return useEnhancedAuth();
}