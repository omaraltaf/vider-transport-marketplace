/**
 * Property-Based Tests for LocalStorage Fallback System
 * **Feature: user-state-authentication-fix, Property 14: LocalStorage fallback**
 * **Validates: Requirements 4.4**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { LocalStorageFallback, TokenStorageManager, type StorageAdapter } from '../utils/LocalStorageFallback';
import { createPropertyTestConfig } from '../utils/testGenerators';

// Storage test data generators
const storageKeyArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => !s.includes('\0') && s !== '__proto__' && s !== 'constructor' && s !== 'prototype');
const storageValueArb = fc.string({ minLength: 0, maxLength: 1000 });
const storageDataArb = fc.dictionary(storageKeyArb, storageValueArb);

// Mock storage implementations for testing
class MockStorage implements Storage {
  private store = new Map<string, string>();
  private shouldFail = false;
  private failureType: 'quota' | 'security' | 'generic' = 'generic';

  get length() {
    return this.store.size;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  getItem(key: string): string | null {
    if (this.shouldFail) {
      throw new Error(`Mock storage failure: ${this.failureType}`);
    }
    const value = this.store.get(key);
    return value !== undefined ? value : null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldFail) {
      if (this.failureType === 'quota') {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      } else if (this.failureType === 'security') {
        throw new DOMException('SecurityError', 'SecurityError');
      } else {
        throw new Error(`Mock storage failure: ${this.failureType}`);
      }
    }
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    if (this.shouldFail) {
      throw new Error(`Mock storage failure: ${this.failureType}`);
    }
    this.store.delete(key);
  }

  clear(): void {
    if (this.shouldFail) {
      throw new Error(`Mock storage failure: ${this.failureType}`);
    }
    this.store.clear();
  }

  // Test utilities
  setFailure(shouldFail: boolean, type: 'quota' | 'security' | 'generic' = 'generic') {
    this.shouldFail = shouldFail;
    this.failureType = type;
  }

  reset() {
    this.store.clear();
    this.shouldFail = false;
    this.failureType = 'generic';
  }
}

describe('LocalStorage Fallback Properties', () => {
  let mockLocalStorage: MockStorage;
  let mockSessionStorage: MockStorage;
  let originalLocalStorage: Storage;
  let originalSessionStorage: Storage;
  let fallbackManager: LocalStorageFallback;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Store original storage implementations
    originalLocalStorage = window.localStorage;
    originalSessionStorage = window.sessionStorage;

    // Create mock storage instances
    mockLocalStorage = new MockStorage();
    mockSessionStorage = new MockStorage();

    // Replace global storage objects
    Object.defineProperty(window, 'localStorage', { 
      value: mockLocalStorage,
      writable: true 
    });
    Object.defineProperty(window, 'sessionStorage', { 
      value: mockSessionStorage,
      writable: true 
    });

    // Spy on console.warn to verify fallback notifications
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset mocks
    mockLocalStorage.reset();
    mockSessionStorage.reset();
  });

  afterEach(() => {
    // Restore original storage implementations
    Object.defineProperty(window, 'localStorage', { 
      value: originalLocalStorage,
      writable: true 
    });
    Object.defineProperty(window, 'sessionStorage', { 
      value: originalSessionStorage,
      writable: true 
    });

    consoleWarnSpy.mockRestore();
  });

  it('Property 14a: For any storage operation, the system should function when localStorage is available', () => {
    fc.assert(
      fc.property(storageDataArb, (data) => {
        // Ensure localStorage is available
        mockLocalStorage.reset();
        mockSessionStorage.reset();
        
        fallbackManager = new LocalStorageFallback();
        
        // Should use localStorage when available
        expect(fallbackManager.getCurrentStorageType()).toBe('localStorage');
        expect(fallbackManager.isLocalStorageAvailable()).toBe(true);
        expect(fallbackManager.isDegraded()).toBe(false);
        
        // Test all storage operations
        Object.entries(data).forEach(([key, value]) => {
          // Set item should work
          expect(() => fallbackManager.setItem(key, value)).not.toThrow();
          
          // Get item should return the same value (empty string should be preserved)
          const retrieved = fallbackManager.getItem(key);
          if (value === '') {
            // Empty strings should be preserved, not returned as null
            expect(retrieved).toBe('');
          } else {
            expect(retrieved).toBe(value);
          }
          
          // Remove item should work
          expect(() => fallbackManager.removeItem(key)).not.toThrow();
          expect(fallbackManager.getItem(key)).toBeNull();
        });
        
        // Clear should work
        Object.entries(data).forEach(([key, value]) => {
          fallbackManager.setItem(key, value);
        });
        expect(() => fallbackManager.clear()).not.toThrow();
        
        // All items should be cleared
        Object.keys(data).forEach(key => {
          expect(fallbackManager.getItem(key)).toBeNull();
        });
      }),
      createPropertyTestConfig(100)
    );
  });

  it('Property 14b: For any storage operation, the system should fallback to sessionStorage when localStorage fails', () => {
    fc.assert(
      fc.property(storageDataArb, (data) => {
        // Make localStorage fail but sessionStorage work
        mockLocalStorage.setFailure(true, 'quota');
        mockSessionStorage.reset();
        
        fallbackManager = new LocalStorageFallback();
        
        // Should fallback to sessionStorage
        expect(fallbackManager.getCurrentStorageType()).toBe('sessionStorage');
        expect(fallbackManager.isLocalStorageAvailable()).toBe(false);
        expect(fallbackManager.isSessionStorageAvailable()).toBe(true);
        expect(fallbackManager.isDegraded()).toBe(true);
        
        // Should have warned about fallback (check that some warning was issued)
        expect(consoleWarnSpy).toHaveBeenCalled();
        
        // Test storage operations work with sessionStorage
        Object.entries(data).forEach(([key, value]) => {
          expect(() => fallbackManager.setItem(key, value)).not.toThrow();
          expect(fallbackManager.getItem(key)).toBe(value);
        });
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 14c: For any storage operation, the system should fallback to memory storage when both localStorage and sessionStorage fail', () => {
    fc.assert(
      fc.property(storageDataArb, (data) => {
        // Make both localStorage and sessionStorage fail
        mockLocalStorage.setFailure(true, 'security');
        mockSessionStorage.setFailure(true, 'security');
        
        fallbackManager = new LocalStorageFallback();
        
        // Should fallback to memory storage
        expect(fallbackManager.getCurrentStorageType()).toBe('memory');
        expect(fallbackManager.isLocalStorageAvailable()).toBe(false);
        expect(fallbackManager.isSessionStorageAvailable()).toBe(false);
        expect(fallbackManager.isDegraded()).toBe(true);
        
        // Should have warned about fallback (check that some warning was issued)
        expect(consoleWarnSpy).toHaveBeenCalled();
        
        // Test storage operations work with memory storage
        Object.entries(data).forEach(([key, value]) => {
          expect(() => fallbackManager.setItem(key, value)).not.toThrow();
          expect(fallbackManager.getItem(key)).toBe(value);
        });
        
        // Memory storage should be limited by maxMemoryItems
        const status = fallbackManager.getStorageStatus();
        expect(status.current).toBe('memory');
        expect(status.isDegraded).toBe(true);
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 14d: For any storage failure during operation, the system should gracefully switch to fallback storage', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(storageKeyArb, storageValueArb), { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (operations, failurePoint) => {
          // Start with working localStorage
          mockLocalStorage.reset();
          mockSessionStorage.reset();
          
          fallbackManager = new LocalStorageFallback();
          expect(fallbackManager.getCurrentStorageType()).toBe('localStorage');
          
          // Perform operations until failure point
          const preFailureItems = new Map<string, string>();
          for (let i = 0; i < Math.min(failurePoint, operations.length); i++) {
            const [key, value] = operations[i];
            fallbackManager.setItem(key, value);
            preFailureItems.set(key, value);
            
            const retrieved = fallbackManager.getItem(key);
            if (value === '') {
              expect(retrieved).toBe('');
            } else {
              expect(retrieved).toBe(value);
            }
          }
          
          // Simulate localStorage failure
          mockLocalStorage.setFailure(true, 'quota');
          
          // Continue operations - should switch to sessionStorage
          if (failurePoint < operations.length) {
            const [key, value] = operations[failurePoint];
            
            // This operation should trigger fallback but the operation itself may fail
            fallbackManager.setItem(key, value);
            
            // Should have switched to sessionStorage
            expect(fallbackManager.getCurrentStorageType()).toBe('sessionStorage');
            expect(fallbackManager.isDegraded()).toBe(true);
            
            // The failed operation may not have been stored, but subsequent operations should work
            // Try storing the same item again - this should work with the new adapter
            fallbackManager.setItem(key, value);
            
            const retrieved = fallbackManager.getItem(key);
            if (value === '') {
              expect(retrieved).toBe('');
            } else {
              expect(retrieved).toBe(value);
            }
            
            // Continue with remaining operations to verify sessionStorage works
            for (let i = failurePoint + 1; i < operations.length; i++) {
              const [nextKey, nextValue] = operations[i];
              fallbackManager.setItem(nextKey, nextValue);
              
              const nextRetrieved = fallbackManager.getItem(nextKey);
              if (nextValue === '') {
                expect(nextRetrieved).toBe('');
              } else {
                expect(nextRetrieved).toBe(nextValue);
              }
            }
          }
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 14e: For any token storage operation, TokenStorageManager should maintain functionality across storage types', () => {
    const tokenStateArb = fc.record({
      accessToken: fc.string({ minLength: 20, maxLength: 100 }),
      refreshToken: fc.string({ minLength: 20, maxLength: 100 }),
      expiresAt: fc.date({ min: new Date(), max: new Date(Date.now() + 86400000) }),
      isRefreshing: fc.boolean(),
      lastRefresh: fc.option(fc.date())
    });

    fc.assert(
      fc.property(
        tokenStateArb,
        fc.constantFrom('localStorage', 'sessionStorage', 'memory'),
        (tokenState, storageType) => {
          // Configure storage to use specific type
          switch (storageType) {
            case 'localStorage':
              mockLocalStorage.reset();
              mockSessionStorage.reset();
              break;
            case 'sessionStorage':
              mockLocalStorage.setFailure(true);
              mockSessionStorage.reset();
              break;
            case 'memory':
              mockLocalStorage.setFailure(true);
              mockSessionStorage.setFailure(true);
              break;
          }
          
          const tokenManager = new TokenStorageManager();
          
          // Should use expected storage type
          expect(tokenManager.getStorageStatus().current).toBe(storageType);
          
          // Token operations should work regardless of storage type
          tokenManager.setTokenState(tokenState);
          
          const retrievedState = tokenManager.getTokenState();
          expect(retrievedState.accessToken).toBe(tokenState.accessToken);
          expect(retrievedState.refreshToken).toBe(tokenState.refreshToken);
          
          if (tokenState.expiresAt && !isNaN(tokenState.expiresAt.getTime())) {
            expect(retrievedState.expiresAt?.getTime()).toBe(tokenState.expiresAt.getTime());
          }
          
          // Clear tokens should work
          tokenManager.clearTokens();
          const clearedState = tokenManager.getTokenState();
          expect(clearedState.accessToken).toBeNull();
          expect(clearedState.refreshToken).toBeNull();
          
          // Degradation warning should be appropriate
          const warning = tokenManager.getDegradationWarning();
          if (storageType === 'localStorage') {
            expect(warning).toBeNull();
          } else {
            expect(warning).toBeTruthy();
            expect(typeof warning).toBe('string');
          }
        }
      ),
      createPropertyTestConfig(100)
    );
  });

  it('Property 14f: For any storage configuration, the system should report accurate storage status', () => {
    fc.assert(
      fc.property(
        fc.record({
          localStorageWorks: fc.boolean(),
          sessionStorageWorks: fc.boolean(),
          enableSessionFallback: fc.boolean(),
          enableMemoryFallback: fc.boolean()
        }),
        (config) => {
          // Configure mock storage based on test parameters
          if (!config.localStorageWorks) {
            mockLocalStorage.setFailure(true);
          } else {
            mockLocalStorage.reset();
          }
          
          if (!config.sessionStorageWorks) {
            mockSessionStorage.setFailure(true);
          } else {
            mockSessionStorage.reset();
          }
          
          fallbackManager = new LocalStorageFallback({
            enableSessionFallback: config.enableSessionFallback,
            enableMemoryFallback: config.enableMemoryFallback
          });
          
          const status = fallbackManager.getStorageStatus();
          
          // Verify status accuracy
          expect(status.localStorage).toBe(config.localStorageWorks);
          expect(status.sessionStorage).toBe(config.sessionStorageWorks);
          
          // Verify current storage selection logic
          if (config.localStorageWorks) {
            expect(status.current).toBe('localStorage');
            expect(status.isDegraded).toBe(false);
          } else if (config.sessionStorageWorks && config.enableSessionFallback) {
            expect(status.current).toBe('sessionStorage');
            expect(status.isDegraded).toBe(true);
          } else if (config.enableMemoryFallback) {
            expect(status.current).toBe('memory');
            expect(status.isDegraded).toBe(true);
          } else {
            // Should still use memory as last resort
            expect(status.current).toBe('memory');
            expect(status.isDegraded).toBe(true);
          }
        }
      ),
      createPropertyTestConfig(50)
    );
  });

  it('Property 14g: For any memory storage usage, LRU eviction should work correctly when maxMemoryItems is exceeded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.tuple(storageKeyArb, storageValueArb), { minLength: 1, maxLength: 20 }),
        (maxItems, operations) => {
          // Force memory storage usage
          mockLocalStorage.setFailure(true);
          mockSessionStorage.setFailure(true);
          
          fallbackManager = new LocalStorageFallback({
            maxMemoryItems: maxItems
          });
          
          expect(fallbackManager.getCurrentStorageType()).toBe('memory');
          
          // Add items up to and beyond the limit
          const addedItems = new Map<string, string>();
          
          operations.forEach(([key, value]) => {
            fallbackManager.setItem(key, value);
            addedItems.set(key, value);
            
            // Check that we don't exceed maxItems (accounting for unique keys)
            const uniqueKeys = Array.from(addedItems.keys());
            const expectedStoredCount = Math.min(uniqueKeys.length, maxItems);
            
            // Verify that recent items are still accessible
            // Only check if we haven't exceeded the limit yet
            if (addedItems.size <= maxItems) {
              const retrieved = fallbackManager.getItem(key);
              if (value === '') {
                expect(retrieved).toBe('');
              } else {
                expect(retrieved).toBe(value);
              }
            }
          });
          
          // If we added more items than the limit, some should have been evicted
          if (addedItems.size > maxItems) {
            let accessibleCount = 0;
            addedItems.forEach((value, key) => {
              if (fallbackManager.getItem(key) === value) {
                accessibleCount++;
              }
            });
            
            // Should not exceed maxItems
            expect(accessibleCount).toBeLessThanOrEqual(maxItems);
          }
        }
      ),
      createPropertyTestConfig(30)
    );
  });
});