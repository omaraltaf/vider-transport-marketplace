/**
 * Enhanced Authentication Context
 * Integrates TokenManager for robust token handling while maintaining backward compatibility
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authService } from '../services/authService';
import { tokenManager } from '../services/error-handling/TokenManager';
import type { ApiError } from '../types/error.types';
import { ApiErrorType } from '../types/error.types';

interface User {
  id: string;
  email: string;
  role: string;
  companyId: string;
}

interface EnhancedAuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  requiresPasswordChange: boolean;
  login: (accessToken: string, refreshToken: string, user: User, requiresPasswordChange?: boolean) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  clearPasswordChangeRequirement: () => void;
  isAuthenticated: boolean;
  // Enhanced methods
  getValidToken: () => Promise<string>;
  handleTokenError: (error: ApiError) => Promise<void>;
  isTokenValid: (token?: string) => boolean;
}

const EnhancedAuthContext = createContext<EnhancedAuthContextType | undefined>(undefined);

export function EnhancedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);

  // Sync with TokenManager state
  const syncWithTokenManager = useCallback(() => {
    const tokenState = tokenManager.getTokenState();
    setToken(tokenState.accessToken);
    setRefreshToken(tokenState.refreshToken);
  }, []);

  useEffect(() => {
    // Load auth state from localStorage on mount
    const storedToken = localStorage.getItem('auth_token');
    const storedRefreshToken = localStorage.getItem('auth_refresh_token');
    const storedUser = localStorage.getItem('auth_user');
    const storedPasswordChange = localStorage.getItem('auth_requires_password_change');

    if (storedToken && storedRefreshToken && storedUser) {
      setToken(storedToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(storedUser));
      setRequiresPasswordChange(storedPasswordChange === 'true');
      
      // Initialize TokenManager with existing tokens
      const expiresAt = localStorage.getItem('auth_expires_at');
      const expiresIn = expiresAt ? Math.max(0, (new Date(expiresAt).getTime() - Date.now()) / 1000) : undefined;
      tokenManager.setTokens(storedToken, storedRefreshToken, expiresIn);
    }

    // Set up periodic sync with TokenManager
    const syncInterval = setInterval(syncWithTokenManager, 1000);
    return () => clearInterval(syncInterval);
  }, [syncWithTokenManager]);

  const login = (accessToken: string, newRefreshToken: string, newUser: User, requiresPasswordChangeFlag = false) => {
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
  };

  const logout = async () => {
    try {
      // Pass the current token to the logout service
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setRequiresPasswordChange(false);
      
      // Clear from localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_requires_password_change');
      localStorage.removeItem('auth_expires_at');
      
      // Clear TokenManager
      tokenManager.clearTokens();
    }
  };

  const clearPasswordChangeRequirement = () => {
    setRequiresPasswordChange(false);
    localStorage.removeItem('auth_requires_password_change');
  };

  const refreshAccessToken = async () => {
    try {
      const newToken = await tokenManager.refreshToken();
      setToken(newToken);
      
      // Update refresh token if it changed
      const tokenState = tokenManager.getTokenState();
      if (tokenState.refreshToken !== refreshToken) {
        setRefreshToken(tokenState.refreshToken);
      }
    } catch (error) {
      // If refresh fails, logout the user
      await logout();
      throw error;
    }
  };

  // Enhanced methods using TokenManager
  const getValidToken = async (): Promise<string> => {
    try {
      const validToken = await tokenManager.getValidToken();
      
      // Update local state if token changed
      if (validToken !== token) {
        setToken(validToken);
      }
      
      return validToken;
    } catch (error) {
      // No valid token available, redirect to login
      await logout();
      throw error;
    }
  };

  const handleTokenError = async (error: ApiError): Promise<void> => {
    if (error.type === ApiErrorType.AUTH) {
      try {
        await tokenManager.handleTokenError(error);
        // Sync state after handling
        syncWithTokenManager();
      } catch (handlingError) {
        // Token handling failed, logout
        await logout();
        throw handlingError;
      }
    }
  };

  const isTokenValid = (tokenToCheck?: string): boolean => {
    const checkToken = tokenToCheck || token;
    return tokenManager.isTokenValid(checkToken);
  };

  const value: EnhancedAuthContextType = {
    user,
    token,
    refreshToken,
    requiresPasswordChange,
    login,
    logout,
    refreshAccessToken,
    clearPasswordChangeRequirement,
    isAuthenticated: !!token && !!user,
    // Enhanced methods
    getValidToken,
    handleTokenError,
    isTokenValid,
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