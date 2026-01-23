/**
 * Fallback Manager Service
 * Provides fallback data and graceful degradation strategies
 */

import type { IFallbackManager, OfflineOperation } from './interfaces';
import type { CacheEntry, CacheMetadata, FallbackType } from '../../types/error.types';
import { defaultFallbackConfig } from './config/defaultConfig';

export class FallbackManager implements IFallbackManager {
  private cache = new Map<string, CacheEntry<unknown>>();
  private offlineQueue: OfflineOperation[] = [];
  private config = defaultFallbackConfig;
  private lastPurge = new Date();

  constructor(config?: Partial<typeof defaultFallbackConfig>) {
    this.config = { ...defaultFallbackConfig, ...config };
    this.startPeriodicCleanup();
  }

  /**
   * Gets fallback data for a given key and type
   */
  async getFallbackData<T>(key: string, type: FallbackType): Promise<T | null> {
    switch (type) {
      case 'cached':
        return this.getCachedData<T>(key);
      
      case 'mock':
        return this.getMockData<T>(key);
      
      case 'empty_state':
        return this.getEmptyState<T>(key);
      
      case 'default':
        return this.getDefaultData<T>(key);
      
      default:
        return null;
    }
  }

  /**
   * Caches fresh data
   */
  async cacheFreshData<T>(key: string, data: T): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.cacheStaleThreshold);
    
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: now,
      expiresAt,
      source: 'api',
      metadata: {
        size: this.estimateSize(data),
        accessCount: 0
      }
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    
    // Check if we need to purge old entries
    await this.checkCacheSize();
  }

  /**
   * Clears stale cache entries
   */
  async clearStaleCache(): Promise<void> {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.lastPurge = now;
  }

  /**
   * Gets cache metadata
   */
  getCacheMetadata(): CacheMetadata {
    const now = new Date();
    let totalSize = 0;
    let oldestEntry = now;
    let hitCount = 0;
    let totalAccess = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.metadata?.size || 0;
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      const accessCount = entry.metadata?.accessCount || 0;
      hitCount += accessCount > 0 ? 1 : 0;
      totalAccess += accessCount;
    }

    return {
      totalSize,
      entryCount: this.cache.size,
      oldestEntry,
      hitRate: this.cache.size > 0 ? hitCount / this.cache.size : 0,
      lastPurge: this.lastPurge
    };
  }

  /**
   * Queues an operation for offline execution
   */
  queueOfflineOperation(operation: OfflineOperation): void {
    // Remove duplicates based on endpoint and method
    this.offlineQueue = this.offlineQueue.filter(
      op => !(op.endpoint === operation.endpoint && op.method === operation.method)
    );
    
    this.offlineQueue.push(operation);
    
    // Sort by priority (higher priority first)
    this.offlineQueue.sort((a, b) => b.priority - a.priority);
    
    // Limit queue size
    const maxQueueSize = 100;
    if (this.offlineQueue.length > maxQueueSize) {
      this.offlineQueue = this.offlineQueue.slice(0, maxQueueSize);
    }
  }

  /**
   * Processes the offline operation queue
   */
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    const operations = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const operation of operations) {
      try {
        await this.executeOfflineOperation(operation);
      } catch (error) {
        console.warn(`Failed to execute offline operation ${operation.id}:`, error);
        
        // Re-queue if it's a high priority operation and recent
        const isRecent = Date.now() - operation.timestamp.getTime() < 300000; // 5 minutes
        if (operation.priority >= 8 && isRecent) {
          this.offlineQueue.push(operation);
        }
      }
    }
  }

  /**
   * Gets cached data
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    const now = new Date();
    if (entry.expiresAt && now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access count
    if (entry.metadata) {
      entry.metadata.accessCount = (entry.metadata.accessCount || 0) + 1;
    }

    return entry.data as T;
  }

  /**
   * Gets mock data
   */
  private getMockData<T>(key: string): T | null {
    if (!this.config.enableMockData) return null;
    
    const mockData = this.config.mockDataSets[key];
    return mockData as T || null;
  }

  /**
   * Gets empty state data
   */
  private getEmptyState<T>(key: string): T | null {
    const emptyStates: Record<string, unknown> = {
      moderationStats: {
        content: { totalFlags: 0, pendingReview: 0, resolvedToday: 0, approvalRate: 0 },
        fraud: { totalAlerts: 0, openAlerts: 0, confirmedFraudRate: 0, preventedLosses: 0 },
        blacklist: { totalEntries: 0, activeEntries: 0, violationsToday: 0, hitRate: 0 }
      },
      userStats: {
        totalUsers: 0,
        activeUsers: 0,
        newUsersToday: 0,
        verifiedUsers: 0
      },
      systemHealth: {
        status: 'unknown',
        uptime: '0%',
        lastCheck: new Date().toISOString(),
        services: {}
      },
      list: [],
      object: {},
      string: '',
      number: 0,
      boolean: false
    };

    return emptyStates[key] as T || null;
  }

  /**
   * Gets default data
   */
  private getDefaultData<T>(key: string): T | null {
    // Try cached first, then mock, then empty state
    return this.getCachedData<T>(key) || 
           this.getMockData<T>(key) || 
           this.getEmptyState<T>(key);
  }

  /**
   * Executes an offline operation
   */
  private async executeOfflineOperation(operation: OfflineOperation): Promise<void> {
    const options: RequestInit = {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        ...operation.headers
      }
    };

    if (operation.data && ['POST', 'PUT', 'PATCH'].includes(operation.method)) {
      options.body = JSON.stringify(operation.data);
    }

    const response = await fetch(operation.endpoint, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Cache successful response if it's a GET request
    if (operation.method === 'GET') {
      const data = await response.json();
      await this.cacheFreshData(operation.endpoint, data);
    }
  }

  /**
   * Estimates the size of data for cache management
   */
  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate in bytes
    } catch {
      return 1000; // Default estimate
    }
  }

  /**
   * Checks cache size and purges if necessary
   */
  private async checkCacheSize(): Promise<void> {
    const metadata = this.getCacheMetadata();
    
    if (metadata.totalSize > this.config.maxSize) {
      await this.purgeOldestEntries();
    }
  }

  /**
   * Purges oldest cache entries
   */
  private async purgeOldestEntries(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by timestamp (oldest first)
    entries.sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Remove oldest 25% of entries
    const removeCount = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < removeCount; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Starts periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.clearStaleCache().catch(console.warn);
    }, 60000); // Every minute
  }

  /**
   * Creates a fallback strategy for a specific data type
   */
  createFallbackStrategy<T>(
    key: string,
    priorities: FallbackType[] = ['cached', 'mock', 'empty_state']
  ) {
    return {
      get: async (): Promise<T | null> => {
        for (const type of priorities) {
          const data = await this.getFallbackData<T>(key, type);
          if (data !== null) {
            return data;
          }
        }
        return null;
      },
      
      set: async (data: T): Promise<void> => {
        await this.cacheFreshData(key, data);
      },
      
      clear: (): void => {
        this.cache.delete(key);
      }
    };
  }

  /**
   * Gets offline queue status
   */
  getOfflineQueueStatus() {
    return {
      queueLength: this.offlineQueue.length,
      operations: this.offlineQueue.map(op => ({
        id: op.id,
        endpoint: op.endpoint,
        method: op.method,
        priority: op.priority,
        timestamp: op.timestamp
      }))
    };
  }

  /**
   * Clears the offline queue
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
  }
}

// Singleton instance
export const fallbackManager = new FallbackManager();