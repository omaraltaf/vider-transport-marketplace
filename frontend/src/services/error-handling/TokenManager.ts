/**
 * Token Manager Service
 * Handles authentication token lifecycle, automatic refresh, and cross-tab synchronization
 */

import type { ITokenManager } from './interfaces';
import type { ApiError, TokenState } from '../../types/error.types';
import { ApiErrorType } from '../../types/error.types';
import { authService } from '../authService';

export class TokenManager implements ITokenManager {
  private tokenState: TokenState = {
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    isRefreshing: false,
    lastRefresh: null
  };

  private refreshPromise: Promise<string> | null = null;
  private storageEventListener: ((event: StorageEvent) => void) | null = null;
  private refreshTimeoutId: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeFromStorage();
    this.setupStorageListener();
    this.scheduleTokenRefresh();
  }

  /**
   * Gets a valid token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.isTokenValid(this.tokenState.accessToken)) {
      return this.tokenState.accessToken!;
    }

    // If we're already refreshing, wait for that to complete
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // If we have a refresh token, try to refresh
    if (this.tokenState.refreshToken) {
      return this.refreshToken();
    }

    // No valid token and no refresh token - throw error
    throw new Error('No valid authentication token available');
  }

  /**
   * Refreshes the access token using the refresh token
   */
  async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokenState.refreshToken) {
      throw new Error('No refresh token available');
    }

    this.tokenState.isRefreshing = true;
    this.updateStorage();

    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      this.tokenState.isRefreshing = false;
      this.tokenState.lastRefresh = new Date();
      this.updateStorage();
      this.scheduleTokenRefresh();
      return newToken;
    } catch (error) {
      this.tokenState.isRefreshing = false;
      this.updateStorage();
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Checks if a token is valid (exists and not expired)
   */
  isTokenValid(token: string | null): boolean {
    if (!token) return false;
    
    if (!this.tokenState.expiresAt) return true; // No expiry info, assume valid
    
    // Add 5 minute buffer before expiry
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const now = new Date();
    const expiryWithBuffer = new Date(this.tokenState.expiresAt.getTime() - bufferTime);
    
    return now < expiryWithBuffer;
  }

  /**
   * Handles token-related errors
   */
  async handleTokenError(error: ApiError): Promise<void> {
    if (error.type !== ApiErrorType.AUTH) {
      return; // Not a token error
    }

    // If it's a 401 and we have a refresh token, try refreshing
    if (error.statusCode === 401 && this.tokenState.refreshToken) {
      try {
        await this.refreshToken();
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        this.clearTokens();
        this.redirectToLogin('Token refresh failed');
      }
    } else {
      // 403 or no refresh token available
      this.clearTokens();
      this.redirectToLogin('Authentication required');
    }
  }

  /**
   * Synchronizes token state across browser tabs
   */
  syncTokenAcrossTabs(): void {
    // This is handled automatically by the storage event listener
    // Manual sync can be triggered by updating storage
    this.updateStorage();
  }

  /**
   * Gets the current token state
   */
  getTokenState(): TokenState {
    return { ...this.tokenState };
  }

  /**
   * Clears all tokens
   */
  clearTokens(): void {
    this.tokenState = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      isRefreshing: false,
      lastRefresh: null
    };
    
    this.clearStorage();
    this.clearRefreshTimeout();
  }

  /**
   * Sets new tokens (called after login)
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    const now = new Date();
    const expiresAt = expiresIn ? new Date(now.getTime() + expiresIn * 1000) : null;

    this.tokenState = {
      accessToken,
      refreshToken,
      expiresAt,
      isRefreshing: false,
      lastRefresh: now
    };

    this.updateStorage();
    this.scheduleTokenRefresh();
  }

  /**
   * Initializes token state from localStorage
   */
  private initializeFromStorage(): void {
    try {
      const storedToken = localStorage.getItem('auth_token');
      const storedRefreshToken = localStorage.getItem('auth_refresh_token');
      const storedUser = localStorage.getItem('auth_user');
      const storedExpiresAt = localStorage.getItem('auth_expires_at');

      if (storedToken && storedRefreshToken) {
        this.tokenState = {
          accessToken: storedToken,
          refreshToken: storedRefreshToken,
          expiresAt: storedExpiresAt ? new Date(storedExpiresAt) : null,
          isRefreshing: false,
          lastRefresh: null
        };

        // Also maintain compatibility with existing keys
        localStorage.setItem('token', storedToken);
        localStorage.setItem('adminToken', storedToken);
      }
    } catch (error) {
      console.warn('Failed to initialize tokens from storage:', error);
    }
  }

  /**
   * Updates localStorage with current token state
   */
  private updateStorage(): void {
    try {
      if (this.tokenState.accessToken && this.tokenState.refreshToken) {
        localStorage.setItem('auth_token', this.tokenState.accessToken);
        localStorage.setItem('auth_refresh_token', this.tokenState.refreshToken);
        
        if (this.tokenState.expiresAt) {
          localStorage.setItem('auth_expires_at', this.tokenState.expiresAt.toISOString());
        }

        // Maintain compatibility
        localStorage.setItem('token', this.tokenState.accessToken);
        localStorage.setItem('adminToken', this.tokenState.accessToken);
      }

      // Broadcast change to other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'auth_token',
        newValue: this.tokenState.accessToken,
        storageArea: localStorage
      }));
    } catch (error) {
      console.warn('Failed to update token storage:', error);
    }
  }

  /**
   * Clears all token data from storage
   */
  private clearStorage(): void {
    const keysToRemove = [
      'auth_token',
      'auth_refresh_token',
      'auth_user',
      'auth_expires_at',
      'auth_requires_password_change',
      'token',
      'adminToken'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Sets up listener for storage events (cross-tab synchronization)
   */
  private setupStorageListener(): void {
    this.storageEventListener = (event: StorageEvent) => {
      if (event.key === 'auth_token' && event.storageArea === localStorage) {
        // Token changed in another tab, update our state
        this.initializeFromStorage();
      }
    };

    window.addEventListener('storage', this.storageEventListener);
  }

  /**
   * Performs the actual token refresh API call
   */
  private async performTokenRefresh(): Promise<string> {
    try {
      const response = await authService.refreshToken(this.tokenState.refreshToken!);
      
      this.tokenState.accessToken = response.accessToken;
      
      // Update refresh token if provided
      if (response.refreshToken) {
        this.tokenState.refreshToken = response.refreshToken;
      }

      // Update expiry if provided
      if (response.expiresIn) {
        const now = new Date();
        this.tokenState.expiresAt = new Date(now.getTime() + response.expiresIn * 1000);
      }

      this.updateStorage();
      return response.accessToken;
    } catch (error) {
      // Refresh failed, clear tokens
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
  }

  /**
   * Schedules automatic token refresh before expiry
   */
  private scheduleTokenRefresh(): void {
    this.clearRefreshTimeout();

    if (!this.tokenState.expiresAt) return;

    const now = new Date();
    const expiresAt = this.tokenState.expiresAt;
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    // Schedule refresh 10 minutes before expiry, but at least 1 minute from now
    const refreshTime = Math.max(timeUntilExpiry - (10 * 60 * 1000), 60 * 1000);

    if (refreshTime > 0) {
      this.refreshTimeoutId = setTimeout(() => {
        this.refreshToken().catch(error => {
          console.warn('Scheduled token refresh failed:', error);
        });
      }, refreshTime);
    }
  }

  /**
   * Clears the refresh timeout
   */
  private clearRefreshTimeout(): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
  }

  /**
   * Redirects to login page
   */
  private redirectToLogin(reason: string): void {
    console.log('Redirecting to login:', reason);
    
    // In a real app, you'd use your router here
    // For now, we'll just reload to trigger the auth flow
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.clearRefreshTimeout();
    
    if (this.storageEventListener) {
      window.removeEventListener('storage', this.storageEventListener);
      this.storageEventListener = null;
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();