import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { PlatformAdminCacheService } from './platform-admin-cache.service';

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  mget: vi.fn(),
  pipeline: vi.fn(() => ({
    setex: vi.fn(),
    exec: vi.fn(),
  })),
  ping: vi.fn(),
};

describe('Platform Admin Cache Consistency - Property Tests', () => {
  let cacheService: PlatformAdminCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset cache service
    cacheService = PlatformAdminCacheService.getInstance();
    cacheService.resetMetrics();
    
    // Setup default mocks
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.del.mockResolvedValue(0);
  });

  /**
   * Property 3: Cache-Database Consistency
   * **Feature: mock-data-replacement, Property 3: Cache-database consistency**
   * **Validates: Requirements 8.5**
   * 
   * Validates that cached data remains consistent with database data
   * and cache invalidation works correctly
   */
  it('should maintain cache-database consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          service: fc.string({ minLength: 1, max: 20 }),
          method: fc.string({ minLength: 1, max: 20 }),
          initialData: fc.record({
            id: fc.string(),
            value: fc.integer(),
            timestamp: fc.date(),
          }),
          updatedData: fc.record({
            id: fc.string(),
            value: fc.integer(),
            timestamp: fc.date(),
          }),
          ttl: fc.integer({ min: 60, max: 3600 }),
        }),
        async ({ service, method, initialData, updatedData, ttl }) => {
          // Test cache set and get consistency
          await cacheService.set(service, method, initialData, ttl);
          
          // Mock Redis to return the cached data
          mockRedis.get.mockResolvedValueOnce(JSON.stringify(initialData));
          
          const cachedData = await cacheService.get(service, method);
          
          // Validate that cached data matches what was set
          expect(cachedData).toEqual(initialData);
          
          // Test cache invalidation
          mockRedis.keys.mockResolvedValueOnce([`platform_admin:${service}:${method}`]);
          mockRedis.del.mockResolvedValueOnce(1);
          
          await cacheService.invalidate(service, method);
          
          // After invalidation, cache should return null
          mockRedis.get.mockResolvedValueOnce(null);
          const invalidatedData = await cacheService.get(service, method);
          
          expect(invalidatedData).toBeNull();
          
          // Test cache update after invalidation
          await cacheService.set(service, method, updatedData, ttl);
          mockRedis.get.mockResolvedValueOnce(JSON.stringify(updatedData));
          
          const newCachedData = await cacheService.get(service, method);
          expect(newCachedData).toEqual(updatedData);
          expect(newCachedData).not.toEqual(initialData);
          
          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 4: Cache Key Generation Consistency
   * Validates that cache keys are generated consistently for the same inputs
   * and uniquely for different inputs
   */
  it('should maintain cache key generation consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          service1: fc.string({ minLength: 1, max: 15 }),
          method1: fc.string({ minLength: 1, max: 15 }),
          params1: fc.option(fc.record({
            id: fc.option(fc.string()),
            filter: fc.option(fc.string()),
            limit: fc.option(fc.integer({ min: 1, max: 100 })),
          })),
          service2: fc.string({ minLength: 1, max: 15 }),
          method2: fc.string({ minLength: 1, max: 15 }),
          params2: fc.option(fc.record({
            id: fc.option(fc.string()),
            filter: fc.option(fc.string()),
            limit: fc.option(fc.integer({ min: 1, max: 100 })),
          })),
        }),
        async ({ service1, method1, params1, service2, method2, params2 }) => {
          const testData1 = { data: 'test1' };
          const testData2 = { data: 'test2' };
          
          // Track the keys that would be generated
          const capturedKeys: string[] = [];
          
          mockRedis.get.mockImplementation(async (key: string) => {
            capturedKeys.push(key);
            return null;
          });
          
          // Make cache requests
          await cacheService.get(service1, method1, params1 || undefined);
          await cacheService.get(service2, method2, params2 || undefined);
          
          expect(capturedKeys).toHaveLength(2);
          
          // Same inputs should generate same keys
          if (service1 === service2 && method1 === method2 && 
              JSON.stringify(params1) === JSON.stringify(params2)) {
            expect(capturedKeys[0]).toBe(capturedKeys[1]);
          } else {
            // Different inputs should generate different keys
            expect(capturedKeys[0]).not.toBe(capturedKeys[1]);
          }
          
          // Keys should follow expected format
          capturedKeys.forEach(key => {
            expect(key).toMatch(/^platform_admin:[^:]+:[^:]+/);
            expect(typeof key).toBe('string');
            expect(key.length).toBeGreaterThan(0);
          });
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 5: Cache TTL Consistency
   * Validates that cache TTL (Time To Live) is handled consistently
   * and expired entries are properly managed
   */
  it('should maintain cache TTL consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          service: fc.string({ minLength: 1, max: 15 }),
          method: fc.string({ minLength: 1, max: 15 }),
          data: fc.record({
            value: fc.integer(),
            message: fc.string(),
          }),
          ttl: fc.integer({ min: 1, max: 3600 }),
        }),
        async ({ service, method, data, ttl }) => {
          // Test cache set with TTL
          await cacheService.set(service, method, data, ttl);
          
          // Verify that setex was called with correct TTL
          expect(mockRedis.setex).toHaveBeenCalledWith(
            expect.stringMatching(/^platform_admin:/),
            ttl,
            JSON.stringify(data)
          );
          
          // Test immediate retrieval (should work)
          mockRedis.get.mockResolvedValueOnce(JSON.stringify(data));
          const immediateResult = await cacheService.get(service, method);
          expect(immediateResult).toEqual(data);
          
          // Test retrieval after expiration (should return null)
          mockRedis.get.mockResolvedValueOnce(null);
          const expiredResult = await cacheService.get(service, method);
          expect(expiredResult).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 6: Cache Batch Operations Consistency
   * Validates that batch cache operations maintain consistency
   * and handle partial failures gracefully
   */
  it('should maintain cache batch operations consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          entries: fc.array(
            fc.record({
              service: fc.string({ minLength: 1, max: 10 }),
              method: fc.string({ minLength: 1, max: 10 }),
              data: fc.record({
                id: fc.string(),
                value: fc.integer(),
              }),
              ttl: fc.option(fc.integer({ min: 60, max: 1800 })),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ entries }) => {
          // Test batch set operations
          const pipeline = {
            setex: vi.fn(),
            exec: vi.fn().mockResolvedValue([]),
          };
          mockRedis.pipeline.mockReturnValue(pipeline);
          
          await cacheService.setBatch(entries);
          
          // Verify that pipeline was used correctly
          expect(mockRedis.pipeline).toHaveBeenCalled();
          expect(pipeline.setex).toHaveBeenCalledTimes(entries.length);
          expect(pipeline.exec).toHaveBeenCalled();
          
          // Verify each entry was processed
          entries.forEach((entry, index) => {
            const expectedTtl = entry.ttl || 1800; // Default TTL
            expect(pipeline.setex).toHaveBeenCalledWith(
              expect.stringMatching(/^platform_admin:/),
              expectedTtl,
              JSON.stringify(entry.data)
            );
          });
          
          // Test batch get operations
          const requests = entries.map(entry => ({
            service: entry.service,
            method: entry.method,
          }));
          
          const mockResults = entries.map(entry => JSON.stringify(entry.data));
          mockRedis.mget.mockResolvedValueOnce(mockResults);
          
          const batchResults = await cacheService.getBatch(requests);
          
          // Verify batch results consistency
          expect(batchResults).toHaveLength(entries.length);
          batchResults.forEach((result, index) => {
            expect(result).toEqual(entries[index].data);
          });
          
          return true;
        }
      ),
      { numRuns: 12 }
    );
  });

  /**
   * Property 7: Cache Invalidation Pattern Consistency
   * Validates that cache invalidation patterns work correctly
   * and don't affect unrelated cache entries
   */
  it('should maintain cache invalidation pattern consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          targetService: fc.string({ minLength: 1, max: 15 }),
          targetMethod: fc.option(fc.string({ minLength: 1, max: 15 })),
          otherServices: fc.array(
            fc.record({
              service: fc.string({ minLength: 1, max: 15 }),
              method: fc.string({ minLength: 1, max: 15 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
        }),
        async ({ targetService, targetMethod, otherServices }) => {
          // Create cache keys for target and other services
          const targetKeys = targetMethod 
            ? [`platform_admin:${targetService}:${targetMethod}:data1`]
            : [
                `platform_admin:${targetService}:method1:data1`,
                `platform_admin:${targetService}:method2:data2`,
              ];
          
          const otherKeys = otherServices.map(other => 
            `platform_admin:${other.service}:${other.method}:data`
          );
          
          const allKeys = [...targetKeys, ...otherKeys];
          
          // Mock keys query to return all keys
          mockRedis.keys.mockImplementation(async (pattern: string) => {
            if (targetMethod) {
              // Specific method pattern
              const expectedPattern = `platform_admin:${targetService}:${targetMethod}*`;
              if (pattern === expectedPattern) {
                return targetKeys;
              }
            } else {
              // Service-wide pattern
              const expectedPattern = `platform_admin:${targetService}*`;
              if (pattern === expectedPattern) {
                return targetKeys;
              }
            }
            return [];
          });
          
          mockRedis.del.mockImplementation(async (...keys: string[]) => {
            return keys.length;
          });
          
          // Perform invalidation
          await cacheService.invalidate(targetService, targetMethod);
          
          // Verify correct pattern was used
          const expectedPattern = targetMethod 
            ? `platform_admin:${targetService}:${targetMethod}*`
            : `platform_admin:${targetService}*`;
          
          expect(mockRedis.keys).toHaveBeenCalledWith(expectedPattern);
          
          // Verify only target keys were deleted
          if (targetKeys.length > 0) {
            expect(mockRedis.del).toHaveBeenCalledWith(...targetKeys);
          }
          
          // Verify other service keys were not affected
          otherKeys.forEach(otherKey => {
            expect(mockRedis.del).not.toHaveBeenCalledWith(
              expect.stringContaining(otherKey)
            );
          });
          
          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 8: Cache Health and Metrics Consistency
   * Validates that cache health monitoring and metrics
   * accurately reflect cache operations and performance
   */
  it('should maintain cache health and metrics consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operations: fc.array(
            fc.record({
              type: fc.constantFrom('get', 'set', 'invalidate'),
              shouldSucceed: fc.boolean(),
              service: fc.string({ minLength: 1, max: 10 }),
              method: fc.string({ minLength: 1, max: 10 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
        }),
        async ({ operations }) => {
          // Reset metrics for clean test
          cacheService.resetMetrics();
          
          let expectedHits = 0;
          let expectedMisses = 0;
          let expectedErrors = 0;
          
          // Execute operations and track expected metrics
          for (const op of operations) {
            try {
              if (op.type === 'get') {
                if (op.shouldSucceed) {
                  mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: 'test' }));
                  expectedHits++;
                } else {
                  mockRedis.get.mockResolvedValueOnce(null);
                  expectedMisses++;
                }
                await cacheService.get(op.service, op.method);
              } else if (op.type === 'set') {
                if (op.shouldSucceed) {
                  mockRedis.setex.mockResolvedValueOnce('OK');
                } else {
                  mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));
                  expectedErrors++;
                }
                await cacheService.set(op.service, op.method, { data: 'test' });
              } else if (op.type === 'invalidate') {
                if (op.shouldSucceed) {
                  mockRedis.keys.mockResolvedValueOnce([`platform_admin:${op.service}:${op.method}`]);
                  mockRedis.del.mockResolvedValueOnce(1);
                } else {
                  mockRedis.keys.mockRejectedValueOnce(new Error('Redis error'));
                }
                await cacheService.invalidate(op.service, op.method);
              }
            } catch (error) {
              // Expected for operations that should fail
            }
          }
          
          // Validate metrics accuracy
          const metrics = cacheService.getMetrics();
          
          expect(metrics.hits).toBe(expectedHits);
          expect(metrics.misses).toBe(expectedMisses);
          expect(metrics.totalRequests).toBe(expectedHits + expectedMisses);
          
          // Validate hit rate calculation
          const expectedHitRate = metrics.totalRequests > 0 
            ? (expectedHits / metrics.totalRequests) * 100 
            : 0;
          expect(metrics.hitRate).toBeCloseTo(expectedHitRate, 2);
          
          // Test health check
          mockRedis.ping.mockResolvedValueOnce('PONG');
          const healthCheck = await cacheService.healthCheck();
          
          expect(healthCheck).toHaveProperty('redis');
          expect(healthCheck).toHaveProperty('latency');
          expect(healthCheck).toHaveProperty('metrics');
          
          expect(typeof healthCheck.redis).toBe('boolean');
          expect(typeof healthCheck.latency).toBe('number');
          expect(healthCheck.latency).toBeGreaterThanOrEqual(0);
          
          // Validate that health check metrics match current metrics
          expect(healthCheck.metrics).toEqual(metrics);
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});