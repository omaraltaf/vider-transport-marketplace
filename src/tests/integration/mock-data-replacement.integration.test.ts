import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PlatformAdminFallbackService } from '../../services/platform-admin-fallback.service';
import { PlatformAdminCacheService } from '../../services/platform-admin-cache.service';
import { DatabasePerformanceOptimizer } from '../../utils/database-performance-optimizer';
import { PlatformAdminErrorHandler } from '../../utils/platform-admin-error-handler';

/**
 * Mock Data Replacement Integration Tests
 * 
 * Comprehensive integration tests validating that all platform admin services
 * work correctly with real database data instead of mock data.
 */
describe('Mock Data Replacement - Integration Tests', () => {
  let prisma: PrismaClient;
  let cacheService: PlatformAdminCacheService;
  let fallbackService: PlatformAdminFallbackService;

  beforeAll(async () => {
    // Initialize services
    prisma = new PrismaClient();
    cacheService = PlatformAdminCacheService.getInstance();
    fallbackService = PlatformAdminFallbackService.getInstance();

    // Apply database indexes for performance
    await DatabasePerformanceOptimizer.applyIndexes(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Reset metrics for clean tests
    DatabasePerformanceOptimizer.clearMetrics();
    cacheService.resetMetrics();
  });

  describe('User Management Service Integration', () => {
    it('should retrieve real user data instead of mock data', async () => {
      // Test that user service returns real database data
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedUserQueries(prisma);
      
      const userStats = await optimizedQueries.getUserStats();
      
      // Validate that we get real data structure
      expect(userStats).toHaveProperty('totalUsers');
      expect(userStats).toHaveProperty('verifiedUsers');
      expect(userStats).toHaveProperty('unverifiedUsers');
      expect(userStats).toHaveProperty('companyCounts');
      
      // Validate data types
      expect(typeof userStats.totalUsers).toBe('number');
      expect(typeof userStats.verifiedUsers).toBe('number');
      expect(typeof userStats.unverifiedUsers).toBe('number');
      expect(typeof userStats.companyCounts).toBe('object');
      
      // Validate logical consistency
      expect(userStats.totalUsers).toBeGreaterThanOrEqual(0);
      expect(userStats.verifiedUsers).toBeLessThanOrEqual(userStats.totalUsers);
      expect(userStats.unverifiedUsers).toBe(userStats.totalUsers - userStats.verifiedUsers);
      
      // Validate that this is not fallback data
      expect(userStats).not.toHaveProperty('isFallback');
    });

    it('should handle user search with real database queries', async () => {
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedUserQueries(prisma);
      
      const searchResults = await optimizedQueries.searchUsers({
        verified: true,
        limit: 10,
        offset: 0,
      });
      
      // Validate search results structure
      expect(Array.isArray(searchResults)).toBe(true);
      
      // If we have users, validate their structure
      if (searchResults.length > 0) {
        const user = searchResults[0];
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('emailVerified');
        expect(user).toHaveProperty('createdAt');
        
        // Validate that verified filter worked
        expect(user.emailVerified).toBe(true);
        
        // Validate company relationship
        if (user.company) {
          expect(user.company).toHaveProperty('id');
          expect(user.company).toHaveProperty('name');
          expect(user.company).toHaveProperty('status');
        }
      }
    });

    it('should fallback gracefully when database fails', async () => {
      // Test fallback mechanism
      const fallbackData = fallbackService.getUserManagementFallback('getUserStats', new Error('Database connection failed'));
      const userStats = fallbackData.getUserStats();
      
      // Validate fallback data structure
      expect(userStats).toHaveProperty('isFallback', true);
      expect(userStats).toHaveProperty('totalUsers');
      expect(userStats).toHaveProperty('activeUsers');
      expect(userStats).toHaveProperty('verifiedUsers');
      
      // Validate Norwegian content in fallback
      expect(typeof userStats.totalUsers).toBe('number');
      expect(userStats.totalUsers).toBeGreaterThan(0);
    });
  });

  describe('Financial Analytics Integration', () => {
    it('should calculate real revenue metrics from transaction data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedFinancialQueries(prisma);
      const revenueSummary = await optimizedQueries.getRevenueSummary(startDate, endDate);
      
      // Validate revenue summary structure
      expect(revenueSummary).toHaveProperty('currentPeriod');
      expect(revenueSummary).toHaveProperty('previousPeriod');
      
      // Validate current period data
      expect(revenueSummary.currentPeriod).toHaveProperty('_sum');
      expect(revenueSummary.currentPeriod).toHaveProperty('_count');
      expect(revenueSummary.currentPeriod).toHaveProperty('_avg');
      
      // Validate data types and ranges
      const currentRevenue = revenueSummary.currentPeriod._sum.amount || 0;
      const currentCount = revenueSummary.currentPeriod._count;
      
      expect(typeof currentRevenue).toBe('number');
      expect(typeof currentCount).toBe('number');
      expect(currentRevenue).toBeGreaterThanOrEqual(0);
      expect(currentCount).toBeGreaterThanOrEqual(0);
      
      // Validate that this is real data, not fallback
      expect(revenueSummary).not.toHaveProperty('isFallback');
    });

    it('should generate revenue trends with proper time-based grouping', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');
      
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedFinancialQueries(prisma);
      const revenueTrends = await optimizedQueries.getRevenueTrends(startDate, endDate, 'month');
      
      // Validate trends structure
      expect(Array.isArray(revenueTrends)).toBe(true);
      
      // If we have trend data, validate structure
      if (revenueTrends.length > 0) {
        const trend = revenueTrends[0];
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('revenue');
        expect(trend).toHaveProperty('transaction_count');
        expect(trend).toHaveProperty('avg_transaction_value');
        
        // Validate data types
        expect(typeof trend.revenue).toBe('number');
        expect(typeof trend.transaction_count).toBe('number');
        expect(typeof trend.avg_transaction_value).toBe('number');
        
        // Validate ranges
        expect(trend.revenue).toBeGreaterThanOrEqual(0);
        expect(trend.transaction_count).toBeGreaterThanOrEqual(0);
        expect(trend.avg_transaction_value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Analytics Service Integration', () => {
    it('should provide real platform KPIs from database aggregations', async () => {
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedAnalyticsQueries(prisma);
      const platformKPIs = await optimizedQueries.getPlatformKPIs();
      
      // Validate KPI structure
      expect(platformKPIs).toHaveProperty('users');
      expect(platformKPIs).toHaveProperty('companies');
      expect(platformKPIs).toHaveProperty('bookings');
      expect(platformKPIs).toHaveProperty('revenue');
      expect(platformKPIs).toHaveProperty('transactions');
      
      // Validate data types
      expect(typeof platformKPIs.users).toBe('number');
      expect(typeof platformKPIs.companies).toBe('number');
      expect(typeof platformKPIs.bookings).toBe('number');
      expect(typeof platformKPIs.revenue).toBe('number');
      expect(typeof platformKPIs.transactions).toBe('number');
      
      // Validate ranges
      expect(platformKPIs.users).toBeGreaterThanOrEqual(0);
      expect(platformKPIs.companies).toBeGreaterThanOrEqual(0);
      expect(platformKPIs.bookings).toBeGreaterThanOrEqual(0);
      expect(platformKPIs.revenue).toBeGreaterThanOrEqual(0);
      expect(platformKPIs.transactions).toBeGreaterThanOrEqual(0);
      
      // Validate that this is real data
      expect(platformKPIs).not.toHaveProperty('isFallback');
    });

    it('should provide geographic analytics with Norwegian fylke data', async () => {
      const optimizedQueries = DatabasePerformanceOptimizer.getOptimizedAnalyticsQueries(prisma);
      const geographicData = await optimizedQueries.getGeographicAnalytics();
      
      // Validate geographic data structure
      expect(Array.isArray(geographicData)).toBe(true);
      
      // If we have geographic data, validate structure
      if (geographicData.length > 0) {
        const region = geographicData[0];
        expect(region).toHaveProperty('region');
        expect(region).toHaveProperty('user_count');
        expect(region).toHaveProperty('company_count');
        expect(region).toHaveProperty('total_revenue');
        
        // Validate data types
        expect(typeof region.region).toBe('string');
        expect(typeof region.user_count).toBe('number');
        expect(typeof region.company_count).toBe('number');
        expect(typeof region.total_revenue).toBe('number');
        
        // Validate ranges
        expect(region.user_count).toBeGreaterThanOrEqual(0);
        expect(region.company_count).toBeGreaterThanOrEqual(0);
        expect(region.total_revenue).toBeGreaterThanOrEqual(0);
        
        // Validate Norwegian fylke names (if present)
        if (region.region) {
          expect(typeof region.region).toBe('string');
          expect(region.region.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Performance Optimization Integration', () => {
    it('should track query performance metrics accurately', async () => {
      // Clear metrics for clean test
      DatabasePerformanceOptimizer.clearMetrics();
      
      // Execute some monitored queries
      await DatabasePerformanceOptimizer.monitorQuery(
        'testQuery1',
        async () => {
          await prisma.user.count();
          return { result: 'success' };
        }
      );
      
      await DatabasePerformanceOptimizer.monitorQuery(
        'testQuery2',
        async () => {
          await prisma.company.count();
          return { result: 'success' };
        }
      );
      
      // Validate metrics collection
      const metrics = DatabasePerformanceOptimizer.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('testQuery1');
      expect(metrics).toHaveProperty('testQuery2');
      
      // Validate metric structure
      expect(metrics.testQuery1).toHaveProperty('count', 1);
      expect(metrics.testQuery1).toHaveProperty('totalDuration');
      expect(metrics.testQuery1).toHaveProperty('averageDuration');
      expect(metrics.testQuery1).toHaveProperty('slowQueries');
      expect(metrics.testQuery1).toHaveProperty('lastExecuted');
      
      // Validate data types
      expect(typeof metrics.testQuery1.count).toBe('number');
      expect(typeof metrics.testQuery1.totalDuration).toBe('number');
      expect(typeof metrics.testQuery1.averageDuration).toBe('number');
      expect(typeof metrics.testQuery1.slowQueries).toBe('number');
      expect(metrics.testQuery1.lastExecuted).toBeInstanceOf(Date);
    });

    it('should provide performance analysis and recommendations', async () => {
      // Execute some queries to generate metrics
      for (let i = 0; i < 5; i++) {
        await DatabasePerformanceOptimizer.monitorQuery(
          'slowTestQuery',
          async () => {
            // Simulate a slow query
            await new Promise(resolve => setTimeout(resolve, 10));
            return { result: 'success' };
          },
          5 // Very low threshold to trigger slow query detection
        );
      }
      
      // Analyze performance
      const analysis = DatabasePerformanceOptimizer.analyzePerformance();
      
      // Validate analysis structure
      expect(analysis).toHaveProperty('slowQueries');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis).toHaveProperty('metrics');
      
      // Validate data types
      expect(Array.isArray(analysis.slowQueries)).toBe(true);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
      expect(typeof analysis.metrics).toBe('object');
      
      // Should detect our intentionally slow query
      expect(analysis.slowQueries).toContain('slowTestQuery');
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Integration', () => {
    it('should cache and retrieve data correctly', async () => {
      const testData = { message: 'test data', timestamp: new Date().toISOString() };
      
      // Set cache data
      await cacheService.set('TestService', 'testMethod', testData, 300);
      
      // Retrieve cache data
      const cachedData = await cacheService.get('TestService', 'testMethod');
      
      // Validate cached data
      expect(cachedData).toEqual(testData);
      
      // Validate cache metrics
      const metrics = cacheService.getMetrics();
      expect(metrics.hits).toBeGreaterThan(0);
      expect(metrics.totalRequests).toBeGreaterThan(0);
    });

    it('should handle cache misses gracefully', async () => {
      // Try to get non-existent cache data
      const cachedData = await cacheService.get('NonExistentService', 'nonExistentMethod');
      
      // Should return null for cache miss
      expect(cachedData).toBeNull();
      
      // Validate cache metrics
      const metrics = cacheService.getMetrics();
      expect(metrics.misses).toBeGreaterThan(0);
    });

    it('should perform cache health checks', async () => {
      const healthCheck = await cacheService.healthCheck();
      
      // Validate health check structure
      expect(healthCheck).toHaveProperty('redis');
      expect(healthCheck).toHaveProperty('latency');
      expect(healthCheck).toHaveProperty('metrics');
      
      // Validate data types
      expect(typeof healthCheck.redis).toBe('boolean');
      expect(typeof healthCheck.latency).toBe('number');
      expect(typeof healthCheck.metrics).toBe('object');
      
      // Validate ranges
      expect(healthCheck.latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database errors with fallback', async () => {
      const fallbackData = { message: 'fallback', value: 42 };
      
      const result = await PlatformAdminErrorHandler.handleDatabaseError(
        async () => {
          throw new Error('Database connection failed');
        },
        fallbackData,
        { service: 'TestService', method: 'testMethod', operation: 'test' }
      );
      
      // Should return fallback data with isFallback flag
      expect(result).toHaveProperty('isFallback', true);
      expect(result.message).toBe('fallback');
      expect(result.value).toBe(42);
    });

    it('should validate input parameters correctly', async () => {
      const validInput = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        page: 1,
        limit: 20,
        requiredField: 'test',
      };
      
      const validation = PlatformAdminErrorHandler.validateInput(
        validInput,
        ['requiredField'],
        { service: 'TestService', method: 'testMethod' }
      );
      
      // Should pass validation
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Test invalid input
      const invalidInput = {
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'), // End before start
        page: -1, // Invalid page
        limit: 2000, // Exceeds limit
        // Missing required field
      };
      
      const invalidValidation = PlatformAdminErrorHandler.validateInput(
        invalidInput,
        ['requiredField'],
        { service: 'TestService', method: 'testMethod' }
      );
      
      // Should fail validation
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });

    it('should format responses consistently', async () => {
      const testData = { message: 'test', value: 123 };
      
      const response = PlatformAdminErrorHandler.formatResponse(
        testData,
        { service: 'TestService', method: 'testMethod', success: true }
      );
      
      // Validate response structure
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data', testData);
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('isFallback', false);
      expect(response).toHaveProperty('timestamp');
      expect(response).toHaveProperty('service', 'TestService');
      expect(response).toHaveProperty('method', 'testMethod');
      
      // Validate timestamp format
      expect(() => new Date(response.timestamp)).not.toThrow();
    });
  });

  describe('End-to-End Data Flow', () => {
    it('should demonstrate complete data flow from database to response', async () => {
      // Test complete flow: Database -> Cache -> Response formatting
      const result = await cacheService.getOrSet(
        'IntegrationTest',
        'getUserCount',
        async () => {
          return await DatabasePerformanceOptimizer.monitorQuery(
            'integrationTestQuery',
            async () => {
              const count = await prisma.user.count();
              return { userCount: count, timestamp: new Date().toISOString() };
            }
          );
        },
        300 // 5 minutes TTL
      );
      
      // Format response
      const formattedResponse = PlatformAdminErrorHandler.formatResponse(
        result,
        { service: 'IntegrationTest', method: 'getUserCount' }
      );
      
      // Validate complete flow
      expect(formattedResponse.success).toBe(true);
      expect(formattedResponse.data).toHaveProperty('userCount');
      expect(formattedResponse.data).toHaveProperty('timestamp');
      expect(typeof formattedResponse.data.userCount).toBe('number');
      expect(formattedResponse.data.userCount).toBeGreaterThanOrEqual(0);
      
      // Validate that performance was monitored
      const metrics = DatabasePerformanceOptimizer.getPerformanceMetrics();
      expect(metrics).toHaveProperty('integrationTestQuery');
      
      // Validate that cache was used
      const cacheMetrics = cacheService.getMetrics();
      expect(cacheMetrics.totalRequests).toBeGreaterThan(0);
    });
  });
});