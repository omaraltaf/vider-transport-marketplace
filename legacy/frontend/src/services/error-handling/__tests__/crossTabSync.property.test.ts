/**
 * Property-Based Tests for Cross-Tab Token Synchronization
 * **Feature: api-error-handling-reliability, Property 11: Cross-tab token synchronization**
 * **Validates: Requirements 3.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { TokenManager } from '../TokenManager';
import { createPropertyTestConfig } from '../utils/testGenerators';

// Mock localStorage with event simulation
const mockLocalStorage = {
  store: new Map<string, string>(),
  getItem: vi.fn((key: string) => mockLocalStorage.store.get(key) || null),
  setItem: vi.fn((key: string, value: string) => {
    mockLocalStorage.store.set(key, value);
    // Simulate storage event
    const event = new StorageEvent('storage', {
      key,
      newValue: value,
      storageArea: localStorage
    });
    window.dispatchEvent(event);
  }),
  removeItem: vi.fn((key: string) => {
    mockLocalStorage.store.delete(key);
    const event = new StorageEvent('storage', {
      key,
      newValue: null,
      storageArea: localStorage
    });
    window.dispatchEvent(event);
  }),
  clear: vi.fn(() => mockLocalStorage.store.clear())
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Cross-Tab Token Synchronization Properties', () => {
  let tokenManager1: TokenManager;
  let tokenManager2: TokenManager;

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
    tokenManager1 = new TokenManager();
    tokenManager2 = new TokenManager();
  });

  afterEach(() => {
    tokenManager1.destroy();
    tokenManager2.destroy();
  });

  it('Property 11: For any token change in one tab, the change should sync to other tabs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.integer({ min: 3600, max: 86400 }),
        (accessToken, refreshToken, expiresIn) => {
          // Set tokens in first manager
          tokenManager1.setTokens(accessToken, refreshToken, expiresIn);
          
          // Give a moment for event propagation
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              // Second manager should have the same tokens
              const state1 = tokenManager1.getTokenState();
              const state2 = tokenManager2.getTokenState();
              
              expect(state2.accessToken).toBe(state1.accessToken);
              expect(state2.refreshToken).toBe(state1.refreshToken);
              resolve();
            }, 10);
          });
        }
      ),
      createPropertyTestConfig(20)
    );
  });

  it('Property 11a: Token clearing should sync across tabs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.string({ minLength: 20, maxLength: 100 }),
        (accessToken, refreshToken) => {
          // Set tokens in both managers
          tokenManager1.setTokens(accessToken, refreshToken);
          tokenManager2.setTokens(accessToken, refreshToken);
          
          // Clear tokens in first manager
          tokenManager1.clearTokens();
          
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              // Second manager should also have cleared tokens
              const state2 = tokenManager2.getTokenState();
              expect(state2.accessToken).toBeNull();
              expect(state2.refreshToken).toBeNull();
              resolve();
            }, 10);
          });
        }
      ),
      createPropertyTestConfig(15)
    );
  });
});