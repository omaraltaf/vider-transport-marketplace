/**
 * Offline Manager Utility
 * Advanced offline operation management with sync strategies
 */

import type { OfflineOperation } from '../interfaces';

export interface OfflineManagerConfig {
  maxQueueSize: number;
  retryAttempts: number;
  syncInterval: number;
  priorityThreshold: number;
}

export interface SyncResult {
  successful: number;
  failed: number;
  errors: Array<{ operation: OfflineOperation; error: Error }>;
}

export class OfflineManager {
  private queue: OfflineOperation[] = [];
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private config: OfflineManagerConfig;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<OfflineManagerConfig> = {}) {
    this.config = {
      maxQueueSize: 100,
      retryAttempts: 3,
      syncInterval: 30000, // 30 seconds
      priorityThreshold: 5,
      ...config
    };

    this.setupOnlineListener();
    this.startPeriodicSync();
  }

  /**
   * Queues an operation for offline execution
   */
  queueOperation(operation: OfflineOperation): void {
    // Remove duplicates based on endpoint, method, and data hash
    const operationHash = this.hashOperation(operation);
    this.queue = this.queue.filter(op => this.hashOperation(op) !== operationHash);
    
    // Add to queue
    this.queue.push({
      ...operation,
      timestamp: new Date() // Update timestamp
    });
    
    // Sort by priority and timestamp
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp.getTime() - b.timestamp.getTime(); // Older first for same priority
    });
    
    // Limit queue size
    if (this.queue.length > this.config.maxQueueSize) {
      // Remove lowest priority operations
      this.queue = this.queue.slice(0, this.config.maxQueueSize);
    }
    
    // Try immediate sync if online
    if (this.isOnline && !this.syncInProgress) {
      this.syncOperations().catch(console.warn);
    }
  }

  /**
   * Syncs all queued operations
   */
  async syncOperations(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return { successful: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;
    const result: SyncResult = { successful: 0, failed: 0, errors: [] };
    const operationsToSync = [...this.queue];
    
    try {
      for (const operation of operationsToSync) {
        try {
          await this.executeOperation(operation);
          result.successful++;
          
          // Remove from queue on success
          this.removeOperation(operation.id);
        } catch (error) {
          result.failed++;
          result.errors.push({ operation, error: error as Error });
          
          // Handle retry logic
          await this.handleOperationFailure(operation, error as Error);
        }
      }
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Gets current queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      operations: this.queue.map(op => ({
        id: op.id,
        endpoint: op.endpoint,
        method: op.method,
        priority: op.priority,
        timestamp: op.timestamp,
        retryCount: (op as any).retryCount || 0
      }))
    };
  }

  /**
   * Clears the operation queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Removes a specific operation from the queue
   */
  removeOperation(operationId: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(op => op.id !== operationId);
    return this.queue.length < initialLength;
  }

  /**
   * Gets operations by priority
   */
  getOperationsByPriority(minPriority: number): OfflineOperation[] {
    return this.queue.filter(op => op.priority >= minPriority);
  }

  /**
   * Executes a single operation
   */
  private async executeOperation(operation: OfflineOperation): Promise<void> {
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
  }

  /**
   * Handles operation failure with retry logic
   */
  private async handleOperationFailure(operation: OfflineOperation, error: Error): Promise<void> {
    const retryCount = ((operation as any).retryCount || 0) + 1;
    
    if (retryCount < this.config.retryAttempts) {
      // Update retry count and keep in queue
      (operation as any).retryCount = retryCount;
      
      // Lower priority slightly for failed operations
      operation.priority = Math.max(1, operation.priority - 1);
    } else {
      // Max retries reached, remove from queue
      this.removeOperation(operation.id);
      console.warn(`Operation ${operation.id} failed after ${retryCount} attempts:`, error);
    }
  }

  /**
   * Creates a hash for operation deduplication
   */
  private hashOperation(operation: OfflineOperation): string {
    const key = `${operation.endpoint}:${operation.method}:${JSON.stringify(operation.data || {})}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Sets up online/offline event listeners
   */
  private setupOnlineListener(): void {
    const handleOnline = () => {
      this.isOnline = true;
      console.log('Connection restored, syncing offline operations...');
      this.syncOperations().catch(console.warn);
    };

    const handleOffline = () => {
      this.isOnline = false;
      console.log('Connection lost, queuing operations for later sync');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Starts periodic sync when online
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.syncInProgress) {
        this.syncOperations().catch(console.warn);
      }
    }, this.config.syncInterval);
  }

  /**
   * Stops periodic sync
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Creates a wrapper for API calls that automatically queues when offline
   */
  createOfflineWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationFactory: (...args: Parameters<T>) => Omit<OfflineOperation, 'id' | 'timestamp'>
  ): T {
    return ((...args: Parameters<T>) => {
      if (this.isOnline) {
        // Execute immediately when online
        return fn(...args);
      } else {
        // Queue for later when offline
        const operation: OfflineOperation = {
          id: Math.random().toString(36).substring(2, 15),
          timestamp: new Date(),
          ...operationFactory(...args)
        };
        
        this.queueOperation(operation);
        
        // Return a resolved promise for offline operations
        return Promise.resolve(null);
      }
    }) as T;
  }
}

// Global offline manager instance
export const offlineManager = new OfflineManager();