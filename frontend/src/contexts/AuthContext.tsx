/**
 * Authentication Context
 * Manages user authentication state and tokens using TokenManager
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/authService';
import { tokenManager } from '../services/error-handling/TokenManager';

interface User {
  id: string;
  email: string;
  role: string;
  companyId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  requiresPasswordChange: boolean;
  login: (accessToken: string, refreshToken: string, user: User, requiresPasswordChange?: boolean) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  clearPasswordChangeRequirement: () => void;
  isAuthenticated: boolean;
  getEnhancedToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(false);

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
      
      // Also store in keys that platform admin components expect
      localStorage.setItem('token', storedToken);
      localStorage.setItem('adminToken', storedToken);
    }
  }, []);

  const login = (accessToken: string, newRefreshToken: string, newUser: User, requiresPasswordChangeFlag = false) => {
    setToken(accessToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    setRequiresPasswordChange(requiresPasswordChangeFlag);
    localStorage.setItem('auth_token', accessToken);
    localStorage.setItem('auth_refresh_token', newRefreshToken);
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    localStorage.setItem('auth_requires_password_change', requiresPasswordChangeFlag.toString());
    
    // Also store in keys that platform admin components expect
    localStorage.setItem('token', accessToken);
    localStorage.setItem('adminToken', accessToken);
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
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_refresh_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_requires_password_change');
      
      // Also remove the additional token keys
      localStorage.removeItem('token');
      localStorage.removeItem('adminToken');
    }
  };

  const clearPasswordChangeRequirement = () => {
    setRequiresPasswordChange(false);
    localStorage.removeItem('auth_requires_password_change');
  };

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await authService.refreshToken(refreshToken);
      setToken(response.accessToken);
      localStorage.setItem('auth_token', response.accessToken);
      
      // Also update the additional token keys
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('adminToken', response.accessToken);
    } catch (error) {
      // If refresh fails, logout the user
      await logout();
      throw error;
    }
  };

  // Enhanced token getter that uses TokenManager as fallback
  const getEnhancedToken = async () => {
    if (token) {
      return token;
    }
    
    try {
      const validToken = await tokenManager.getValidToken();
      if (validToken) {
        setToken(validToken);
        localStorage.setItem('token', validToken);
        localStorage.setItem('adminToken', validToken);
        return validToken;
      }
    } catch (error) {
      console.warn('TokenManager fallback failed:', error);
    }
    
    return token;
  };

  const value = {
    user,
    token,
    refreshToken,
    requiresPasswordChange,
    login,
    logout,
    refreshAccessToken,
    clearPasswordChangeRequirement,
    isAuthenticated: !!token && !!user,
    getEnhancedToken, // Add this for components that need guaranteed token access
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
