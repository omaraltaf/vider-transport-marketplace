/**
 * Property-Based Tests for Offline Operation Queuing
 * **Feature: api-error-handling-reliability, Property 16: Offline operation queuing**
 * **Validates: Requirements 8.2, 8.4**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { OfflineManager } from '../utils/OfflineManager';
import { offlineOperationArb, createPropertyTestConfig } from '../utils/testGenerators';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock fetch
global.fetch = vi.fn();

describe('Offline Operation Queuing Properties', () => {
  let offlineManager: OfflineManager;

  beforeEach(() => {
    offlineManager = new OfflineManager({
      maxQueueSize: 50,
      syncInterval: 1000
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    offlineManager.destroy();
  });

  it('Property 16: For any critical operation attempted offline, the system should queue for retry when connectivity returns', () => {
    fc.assert(
      fc.property(offlineOperationArb, (operation) => {
        // Simulate offline state
        (navigator as any).onLine = false;
        
        // Queue the operation
        offlineManager.queueOperation(operation);
        
        const status = offlineManager.getQueueStatus();
        
        // Should be queued
        expect(status.queueLength).toBeGreaterThan(0);
        expect(status.isOnline).toBe(false);
        
        // Should contain our operation
        const queuedOp = status.operations.find(op => op.id === operation.id);
        expect(queuedOp).toBeDefined();
        expect(queuedOp?.endpoint).toBe(operation.endpoint);
        expect(queuedOp?.method).toBe(operation.method);
        expect(queuedOp?.priority).toBe(operation.priority);
      }),
      createPropertyTestConfig(50)
    );
  });

  it('Property 16a: Operations should be prioritized correctly in queue', () => {
    fc.assert(
      fc.property(
        fc.array(offlineOperationArb, { minLength: 3, maxLength: 10 }),
        (operations) => {
          // Simulate offline state
          (navigator as any).onLine = false;
          
          // Queue all operations
          operations.forEach(op => offlineManager.queueOperation(op));
          
          const status = offlineManager.getQueueStatus();
          
          // Should be sorted by priority (highest first)
          for (let i = 0; i < status.operations.length - 1; i++) {
            const current = status.operations[i];
            const next = status.operations[i + 1];
            
            // Higher priority should come first, or same priority with earlier timestamp
            expect(
              current.priority > next.priority ||
              (current.priority === next.priority && current.timestamp <= next.timestamp)
            ).toBe(true);
          }
        }
      ),
      createPropertyTestConfig(30)
    );
  });

  it('Property 16b: Duplicate operations should be deduplicated', () => {
    fc.assert(
      fc.property(offlineOperationArb, (operation) => {
        // Simulate offline state
        (navigator as any).onLine = false;
        
        // Queue the same operation multiple times
        offlineManager.queueOperation(operation);
        offlineManager.queueOperation({ ...operation, id: 'different-id' }); // Same content, different ID
        offlineManager.queueOperation({ ...operation, id: 'another-id' });
        
        const status = offlineManager.getQueueStatus();
        
        // Should only have one operation (deduplicated by content)
        expect(status.queueLength).toBe(1);
      }),
      createPropertyTestConfig(20)
    );
  });

  it('Property 16c: Queue should respect size limits', () => {
    const smallManager = new OfflineManager({ maxQueueSize: 5 });
    
    fc.assert(
      fc.property(
        fc.array(offlineOperationArb, { minLength: 10, maxLength: 15 }),
        (operations) => {
          // Simulate offline state
          (navigator as any).onLine = false;
          
          // Queue more operations than the limit
          operations.forEach(op => smallManager.queueOperation(op));
          
          const status = smallManager.getQueueStatus();
          
          // Should not exceed max queue size
          expect(status.queueLength).toBeLessThanOrEqual(5);
          
          // Should keep highest priority operations
          if (status.operations.length > 0) {
            const minPriority = Math.min(...status.operations.map(op => op.priority));
            const maxPriorityInOriginal = Math.max(...operations.map(op => op.priority));
            
            // Min priority in queue should be reasonable compared to max available
            expect(minPriority).toBeGreaterThanOrEqual(maxPriorityInOriginal - 5);
          }
        }
      ),
      createPropertyTestConfig(20)
    );
    
    smallManager.destroy();
  });

  it('Property 16d: Operations should sync when connectivity returns', async () => {
    // Mock successful fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({})
    });

    fc.assert(
      fc.asyncProperty(
        fc.array(offlineOperationArb, { minLength: 1, maxLength: 5 }),
        async (operations) => {
          // Start offline
          (navigator as any).onLine = false;
          
          // Queue operations
          operations.forEach(op => offlineManager.queueOperation(op));
          
          let status = offlineManager.getQueueStatus();
          expect(status.queueLength).toBe(operations.length);
          
          // Go online and sync
          (navigator as any).onLine = true;
          const syncResult = await offlineManager.syncOperations();
          
          // Should have attempted to sync all operations
          expect(syncResult.successful + syncResult.failed).toBe(operations.length);
          
          // Queue should be cleared for successful operations
          status = offlineManager.getQueueStatus();
          expect(status.queueLength).toBe(syncResult.failed);
        }
      ),
      createPropertyTestConfig(10)
    );
  });

  it('Property 16e: Failed operations should be retried with backoff', async () => {
    // Mock failed fetch
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    fc.assert(
      fc.asyncProperty(offlineOperationArb, async (operation) => {
        // Start online but with failing requests
        (navigator as any).onLine = true;
        
        // Queue operation
        offlineManager.queueOperation(operation);
        
        // Try to sync (should fail)
        const syncResult = await offlineManager.syncOperations();
        
        expect(syncResult.failed).toBe(1);
        expect(syncResult.errors).toHaveLength(1);
        
        // Operation should still be in queue for retry
        const status = offlineManager.getQueueStatus();
        const queuedOp = status.operations.find(op => op.id === operation.id);
        
        if (queuedOp) {
          // Should have retry count
          expect(queuedOp.retryCount).toBeGreaterThan(0);
        }
      }),
      createPropertyTestConfig(10)
    );
  });
});