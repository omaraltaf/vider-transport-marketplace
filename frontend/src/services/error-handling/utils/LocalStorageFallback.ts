/**
 * LocalStorage Fallback System
 * Provides graceful degradation when localStorage is unavailable or corrupted
 * Implements session-only authentication mode as fallback
 */

import type { TokenState } from '../../../types/error.types';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  isAvailable(): boolean;
  getStorageType(): 'localStorage' | 'sessionStorage' | 'memory';
}

export interface LocalStorageFallbackConfig {
  enableSessionFallback: boolean;
  enableMemoryFallback: boolean;
  maxMemoryItems: number;
  storageTestKey: string;
  fallbackWarningCallback?: (storageType: string, error?: Error) => void;
}

/**
 * Memory-based storage adapter for when both localStorage and sessionStorage fail
 */
class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();
  private maxItems: number;

  constructor(maxItems: number = 100) {
    this.maxItems = maxItems;
  }

  getItem(key: string): string | null {
    const value = this.storage.get(key);
    return value !== undefined ? value : null;
  }

  setItem(key: string, value: string): void {
    // Implement LRU eviction if we exceed max items
    if (this.storage.size >= this.maxItems && !this.storage.has(key)) {
      const firstKey = this.storage.keys().next().value;
      if (firstKey) {
        this.storage.delete(firstKey);
      }
    }
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }

  isAvailable(): boolean {
    return true; // Memory storage is always available
  }

  getStorageType(): 'memory' {
    return 'memory';
  }
}

/**
 * Wrapper for localStorage with fallback detection
 */
class LocalStorageAdapter implements StorageAdapter {
  private available: boolean | null = null;

  getItem(key: string): string | null {
    if (!this.isAvailable()) return null;
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage.getItem failed:', error);
      this.available = false;
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage.setItem failed:', error);
      this.available = false;
      throw error;
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage.removeItem failed:', error);
      this.available = false;
    }
  }

  clear(): void {
    if (!this.isAvailable()) return;
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('localStorage.clear failed:', error);
      this.available = false;
    }
  }

  isAvailable(): boolean {
    if (this.available !== null) {
      return this.available;
    }

    try {
      if (typeof localStorage === 'undefined') {
        this.available = false;
        return false;
      }

      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.available = true;
      return true;
    } catch (error) {
      console.warn('localStorage availability test failed:', error);
      this.available = false;
      return false;
    }
  }

  getStorageType(): 'localStorage' {
    return 'localStorage';
  }
}

/**
 * Wrapper for sessionStorage with fallback detection
 */
class SessionStorageAdapter implements StorageAdapter {
  private available: boolean | null = null;

  getItem(key: string): string | null {
    if (!this.isAvailable()) return null;
    try {
      return sessionStorage.getItem(key);
    } catch (error) {
      console.warn('sessionStorage.getItem failed:', error);
      this.available = false;
      return null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isAvailable()) return;
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      console.warn('sessionStorage.setItem failed:', error);
      this.available = false;
      throw error;
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable()) return;
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('sessionStorage.removeItem failed:', error);
      this.available = false;
    }
  }

  clear(): void {
    if (!this.isAvailable()) return;
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('sessionStorage.clear failed:', error);
      this.available = false;
    }
  }

  isAvailable(): boolean {
    if (this.available !== null) {
      return this.available;
    }

    try {
      if (typeof sessionStorage === 'undefined') {
        this.available = false;
        return false;
      }

      const testKey = '__sessionStorage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      this.available = true;
      return true;
    } catch (error) {
      console.warn('sessionStorage availability test failed:', error);
      this.available = false;
      return false;
    }
  }

  getStorageType(): 'sessionStorage' {
    return 'sessionStorage';
  }
}

/**
 * LocalStorage Fallback Manager
 * Automatically detects localStorage availability and provides fallback storage
 */
export class LocalStorageFallback {
  private currentAdapter: StorageAdapter;
  private config: LocalStorageFallbackConfig;
  private localStorageAdapter: LocalStorageAdapter;
  private sessionStorageAdapter: SessionStorageAdapter;
  private memoryStorageAdapter: MemoryStorageAdapter;

  constructor(config: Partial<LocalStorageFallbackConfig> = {}) {
    this.config = {
      enableSessionFallback: true,
      enableMemoryFallback: true,
      maxMemoryItems: 100,
      storageTestKey: '__storage_test__',
      ...config
    };

    this.localStorageAdapter = new LocalStorageAdapter();
    this.sessionStorageAdapter = new SessionStorageAdapter();
    this.memoryStorageAdapter = new MemoryStorageAdapter(this.config.maxMemoryItems);

    this.currentAdapter = this.selectBestAdapter();
    this.logStorageStatus();
  }

  /**
   * Gets an item from storage using the best available adapter
   */
  getItem(key: string): string | null {
    try {
      return this.currentAdapter.getItem(key);
    } catch (error) {
      console.warn(`Storage getItem failed with ${this.currentAdapter.getStorageType()}:`, error);
      this.handleStorageError(error as Error);
      return null;
    }
  }

  /**
   * Sets an item in storage using the best available adapter
   */
  setItem(key: string, value: string): void {
    try {
      this.currentAdapter.setItem(key, value);
    } catch (error) {
      console.warn(`Storage setItem failed with ${this.currentAdapter.getStorageType()}:`, error);
      this.handleStorageError(error as Error);
    }
  }

  /**
   * Removes an item from storage using the best available adapter
   */
  removeItem(key: string): void {
    try {
      this.currentAdapter.removeItem(key);
    } catch (error) {
      console.warn(`Storage removeItem failed with ${this.currentAdapter.getStorageType()}:`, error);
      this.handleStorageError(error as Error);
    }
  }

  /**
   * Clears all items from storage using the best available adapter
   */
  clear(): void {
    try {
      this.currentAdapter.clear();
    } catch (error) {
      console.warn(`Storage clear failed with ${this.currentAdapter.getStorageType()}:`, error);
      this.handleStorageError(error as Error);
    }
  }

  /**
   * Gets the current storage type being used
   */
  getCurrentStorageType(): 'localStorage' | 'sessionStorage' | 'memory' {
    return this.currentAdapter.getStorageType();
  }

  /**
   * Checks if localStorage is available
   */
  isLocalStorageAvailable(): boolean {
    return this.localStorageAdapter.isAvailable();
  }

  /**
   * Checks if sessionStorage is available
   */
  isSessionStorageAvailable(): boolean {
    return this.sessionStorageAdapter.isAvailable();
  }

  /**
   * Checks if we're running in degraded mode (not using localStorage)
   */
  isDegraded(): boolean {
    return this.currentAdapter.getStorageType() !== 'localStorage';
  }

  /**
   * Gets storage capabilities and status
   */
  getStorageStatus(): {
    current: 'localStorage' | 'sessionStorage' | 'memory';
    localStorage: boolean;
    sessionStorage: boolean;
    isDegraded: boolean;
  } {
    return {
      current: this.getCurrentStorageType(),
      localStorage: this.isLocalStorageAvailable(),
      sessionStorage: this.isSessionStorageAvailable(),
      isDegraded: this.isDegraded()
    };
  }

  /**
   * Attempts to migrate data from one storage to another
   */
  migrateData(fromAdapter: StorageAdapter, toAdapter: StorageAdapter, keys: string[]): void {
    console.log(`Migrating data from ${fromAdapter.getStorageType()} to ${toAdapter.getStorageType()}`);
    
    for (const key of keys) {
      try {
        const value = fromAdapter.getItem(key);
        if (value !== null) {
          toAdapter.setItem(key, value);
        }
      } catch (error) {
        console.warn(`Failed to migrate key ${key}:`, error);
      }
    }
  }

  /**
   * Selects the best available storage adapter
   */
  private selectBestAdapter(): StorageAdapter {
    // Try localStorage first
    if (this.localStorageAdapter.isAvailable()) {
      return this.localStorageAdapter;
    }

    // Fallback to sessionStorage if enabled
    if (this.config.enableSessionFallback && this.sessionStorageAdapter.isAvailable()) {
      this.notifyFallback('sessionStorage');
      return this.sessionStorageAdapter;
    }

    // Final fallback to memory storage if enabled
    if (this.config.enableMemoryFallback) {
      this.notifyFallback('memory');
      return this.memoryStorageAdapter;
    }

    // If all fallbacks are disabled, still return memory storage as last resort
    console.error('All storage options failed or disabled, using memory storage as last resort');
    this.notifyFallback('memory', new Error('All storage options failed'));
    return this.memoryStorageAdapter;
  }

  /**
   * Handles storage errors by attempting to switch to fallback
   */
  private handleStorageError(error: Error): void {
    const currentType = this.currentAdapter.getStorageType();
    console.warn(`Storage error with ${currentType}, attempting fallback:`, error);

    // Try to switch to next best adapter
    const newAdapter = this.selectBestAdapter();
    
    if (newAdapter !== this.currentAdapter) {
      console.log(`Switching from ${currentType} to ${newAdapter.getStorageType()}`);
      this.currentAdapter = newAdapter;
      this.notifyFallback(newAdapter.getStorageType(), error);
    }
  }

  /**
   * Notifies about fallback usage
   */
  private notifyFallback(storageType: string, error?: Error): void {
    if (this.config.fallbackWarningCallback) {
      this.config.fallbackWarningCallback(storageType, error);
    } else {
      console.warn(`Using ${storageType} as fallback for localStorage`, error);
    }
  }

  /**
   * Logs current storage status
   */
  private logStorageStatus(): void {
    const status = this.getStorageStatus();
    console.log('Storage status:', status);
    
    if (status.isDegraded) {
      console.warn(`Running in degraded mode with ${status.current}. Some features may not persist across browser sessions.`);
    }
  }
}

/**
 * Enhanced Token Storage with localStorage fallback
 */
export class TokenStorageManager {
  private storage: LocalStorageFallback;
  private readonly TOKEN_KEYS = [
    'auth_token',
    'auth_refresh_token',
    'auth_user',
    'auth_expires_at',
    'token',
    'adminToken'
  ];

  constructor(config?: Partial<LocalStorageFallbackConfig>) {
    this.storage = new LocalStorageFallback({
      ...config,
      fallbackWarningCallback: (storageType, error) => {
        console.warn(`Token storage degraded to ${storageType}`, error);
        if (storageType !== 'localStorage') {
          console.warn('Tokens will not persist across browser sessions');
        }
      }
    });
  }

  /**
   * Gets token state from storage
   */
  getTokenState(): TokenState {
    try {
      const accessToken = this.storage.getItem('auth_token') || 
                         this.storage.getItem('token') || 
                         this.storage.getItem('adminToken');
      
      const refreshToken = this.storage.getItem('auth_refresh_token') || accessToken;
      const expiresAtStr = this.storage.getItem('auth_expires_at');
      
      return {
        accessToken,
        refreshToken,
        expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
        isRefreshing: false,
        lastRefresh: null
      };
    } catch (error) {
      console.warn('Failed to get token state from storage:', error);
      return {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        isRefreshing: false,
        lastRefresh: null
      };
    }
  }

  /**
   * Sets token state in storage
   */
  setTokenState(tokenState: TokenState): void {
    try {
      if (tokenState.accessToken && tokenState.refreshToken) {
        this.storage.setItem('auth_token', tokenState.accessToken);
        this.storage.setItem('auth_refresh_token', tokenState.refreshToken);
        
        if (tokenState.expiresAt) {
          this.storage.setItem('auth_expires_at', tokenState.expiresAt.toISOString());
        }

        // Maintain compatibility
        this.storage.setItem('token', tokenState.accessToken);
        this.storage.setItem('adminToken', tokenState.accessToken);
      }
    } catch (error) {
      console.warn('Failed to set token state in storage:', error);
    }
  }

  /**
   * Clears all token data from storage
   */
  clearTokens(): void {
    try {
      this.TOKEN_KEYS.forEach(key => {
        this.storage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to clear tokens from storage:', error);
    }
  }

  /**
   * Gets storage status information
   */
  getStorageStatus() {
    return this.storage.getStorageStatus();
  }

  /**
   * Checks if we're running in degraded mode
   */
  isDegraded(): boolean {
    return this.storage.isDegraded();
  }

  /**
   * Gets a warning message if storage is degraded
   */
  getDegradationWarning(): string | null {
    if (!this.isDegraded()) {
      return null;
    }

    const storageType = this.storage.getCurrentStorageType();
    
    switch (storageType) {
      case 'sessionStorage':
        return 'Authentication will not persist across browser sessions. You will need to log in again if you close your browser.';
      case 'memory':
        return 'Authentication will not persist across page reloads or browser sessions. You may need to log in again frequently.';
      default:
        return 'Storage is operating in degraded mode. Some features may not work as expected.';
    }
  }
}

// Create singleton instance
export const tokenStorageManager = new TokenStorageManager();