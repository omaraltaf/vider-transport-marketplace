/**
 * Property-Based Tests for Analytics Calculations Consistency
 * 
 * **Feature: mock-data-replacement, Property 1: Analytics data consistency**
 * **Validates: Requirements 5.1**
 * 
 * Tests that analytics calculations maintain mathematical consistency
 * and accuracy when converting from mock data to real database operations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { redis } from '../config/redis';
import { AnalyticsService } from './analytics.service';
import { GeographicAnalyticsService } from './geographic-analytics.service';
import { GrowthAnalyticsService } from './growth-analytics.service';

const prisma = new PrismaClient();
const analyticsService = new AnalyticsService();
const geoAnalyticsService = new GeographicAnalyticsService();
const growthAnalyticsService = new GrowthAnalyticsService();

describe('Analytics Calculations Consistency Properties', () => {
  beforeEach(async () => {
    // Clear Redis cache before each test
    try {
      await redis.flushall();
    } catch (error) {
      // Redis not available, continue without cache
    }
  });

  afterEach(async () => {
    // Clean up Redis after each test
    try {
      await redis.flushall();
    } catch (error) {
      // Redis not available, continue without cache
    }
  });

  // Arbitraries for generating test data
  const dateRangeArbitrary = fc.record({
    start: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-11-01') }),
    end: fc.date({ min: new Date('2024-02-01'), max: new Date('2024-12-31') })
  }).filter(range => range.start < range.end);

  const metricsArbitrary = fc.array(
    fc.constantFrom('users', 'companies', 'bookings', 'revenue', 'growth'),
    { minLength: 1, maxLength: 5 }
  );

  /**
   * Property 1: Platform KPIs Mathematical Consistency
   * Platform KPIs should maintain mathematical relationships and
   * consistency across different time periods.
   */
  it('should maintain mathematical consistency in platform KPIs', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateRangeArbitrary,
        metricsArbitrary,
        async (dateRange, requestedMetrics) => {
          // Get platform KPIs
          const kpis = await analyticsService.getPlatformKPIs(
            dateRange.start,
            dateRange.end,
            requestedMetrics
          );

          // Verify KPIs structure
          expect(kpis).toHaveProperty('totalUsers');
          expect(kpis).toHaveProperty('activeUsers');
          expect(kpis).toHaveProperty('totalCompanies');
          expect(kpis).toHaveProperty('verifiedCompanies');
          expect(kpis).toHaveProperty('totalBookings');
          expect(kpis).toHaveProperty('completedBookings');
          expect(kpis).toHaveProperty('totalRevenue');
          expect(kpis).toHaveProperty('averageBookingValue');
          expect(kpis).toHaveProperty('userGrowthRate');
          expect(kpis).toHaveProperty('revenueGrowthRate');

          // Verify all counts are non-negative
          expect(kpis.totalUsers).toBeGreaterThanOrEqual(0);
          expect(kpis.activeUsers).toBeGreaterThanOrEqual(0);
          expect(kpis.totalCompanies).toBeGreaterThanOrEqual(0);
          expect(kpis.verifiedCompanies).toBeGreaterThanOrEqual(0);
          expect(kpis.totalBookings).toBeGreaterThanOrEqual(0);
          expect(kpis.completedBookings).toBeGreaterThanOrEqual(0);
          expect(kpis.totalRevenue).toBeGreaterThanOrEqual(0);
          expect(kpis.averageBookingValue).toBeGreaterThanOrEqual(0);

          // Verify mathematical relationships
          expect(kpis.activeUsers).toBeLessThanOrEqual(kpis.totalUsers);
          expect(kpis.verifiedCompanies).toBeLessThanOrEqual(kpis.totalCompanies);
          expect(kpis.completedBookings).toBeLessThanOrEqual(kpis.totalBookings);

          // Verify average booking value calculation
          if (kpis.completedBookings > 0) {
            const expectedAverage = kpis.totalRevenue / kpis.completedBookings;
            expect(Math.abs(kpis.averageBookingValue - expectedAverage)).toBeLessThan(0.01);
          } else {
            expect(kpis.averageBookingValue).toBe(0);
          }

          // Verify growth rates are reasonable
          expect(kpis.userGrowthRate).toBeGreaterThanOrEqual(-100);
          expect(kpis.userGrowthRate).toBeLessThanOrEqual(1000);
          expect(kpis.revenueGrowthRate).toBeGreaterThanOrEqual(-100);
          expect(kpis.revenueGrowthRate).toBeLessThanOrEqual(1000);
        }
      ),
      { numRuns: 20 }
    );
  });
  /**
   * Property 2: Time Series Data Temporal Consistency
   * Time series analytics should maintain proper temporal ordering
   * and mathematical consistency across data points.
   */
  it('should maintain temporal consistency in time series analytics', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateRangeArbitrary,
        fc.constantFrom('daily', 'weekly', 'monthly'),
        fc.constantFrom('users', 'bookings', 'revenue'),
        async (dateRange, interval, metric) => {
          // Get time series data
          const timeSeries = await analyticsService.getTimeSeriesData(
            metric as any,
            dateRange.start,
            dateRange.end,
            interval as any
          );

          // Verify time series structure
          expect(Array.isArray(timeSeries)).toBe(true);

          if (timeSeries.length > 0) {
            // Verify each data point has required properties
            timeSeries.forEach(point => {
              expect(point).toHaveProperty('timestamp');
              expect(point).toHaveProperty('value');
              expect(point).toHaveProperty('change');
              expect(point).toHaveProperty('changePercentage');

              // Verify data types
              expect(point.timestamp).toBeInstanceOf(Date);
              expect(typeof point.value).toBe('number');
              expect(typeof point.change).toBe('number');
              expect(typeof point.changePercentage).toBe('number');

              // Verify values are non-negative for count metrics
              if (metric === 'users' || metric === 'bookings') {
                expect(point.value).toBeGreaterThanOrEqual(0);
              }

              // Verify revenue is non-negative
              if (metric === 'revenue') {
                expect(point.value).toBeGreaterThanOrEqual(0);
              }

              // Verify change percentage is reasonable
              expect(point.changePercentage).toBeGreaterThanOrEqual(-100);
              expect(point.changePercentage).toBeLessThanOrEqual(1000);
            });

            // Verify temporal ordering
            for (let i = 1; i < timeSeries.length; i++) {
              expect(timeSeries[i].timestamp.getTime()).toBeGreaterThan(
                timeSeries[i - 1].timestamp.getTime()
              );
            }

            // Verify all timestamps are within range
            timeSeries.forEach(point => {
              expect(point.timestamp.getTime()).toBeGreaterThanOrEqual(dateRange.start.getTime());
              expect(point.timestamp.getTime()).toBeLessThanOrEqual(dateRange.end.getTime());
            });

            // Verify change calculations are consistent
            for (let i = 1; i < timeSeries.length; i++) {
              const current = timeSeries[i];
              const previous = timeSeries[i - 1];
              
              const expectedChange = current.value - previous.value;
              expect(Math.abs(current.change - expectedChange)).toBeLessThan(0.01);

              if (previous.value > 0) {
                const expectedChangePercentage = (expectedChange / previous.value) * 100;
                expect(Math.abs(current.changePercentage - expectedChangePercentage)).toBeLessThan(0.1);
              }
            }
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 3: Geographic Analytics Regional Consistency
   * Geographic analytics should maintain consistency across regions
   * and proper aggregation of location-based data.
   */
  it('should maintain regional consistency in geographic analytics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('users', 'companies', 'bookings', 'revenue'),
        async (metric) => {
          // Get regional distribution
          const regionalData = await geoAnalyticsService.getRegionalDistribution(metric as any);

          // Verify regional data structure
          expect(Array.isArray(regionalData)).toBe(true);

          if (regionalData.length > 0) {
            // Verify each region has required properties
            regionalData.forEach(region => {
              expect(region).toHaveProperty('region');
              expect(region).toHaveProperty('value');
              expect(region).toHaveProperty('percentage');
              expect(region).toHaveProperty('coordinates');

              // Verify data types
              expect(typeof region.region).toBe('string');
              expect(typeof region.value).toBe('number');
              expect(typeof region.percentage).toBe('number');
              expect(Array.isArray(region.coordinates)).toBe(true);

              // Verify values are non-negative
              expect(region.value).toBeGreaterThanOrEqual(0);
              expect(region.percentage).toBeGreaterThanOrEqual(0);
              expect(region.percentage).toBeLessThanOrEqual(100);

              // Verify coordinates format [lat, lng]
              expect(region.coordinates.length).toBe(2);
              expect(typeof region.coordinates[0]).toBe('number');
              expect(typeof region.coordinates[1]).toBe('number');
              
              // Verify Norwegian coordinates (approximate bounds)
              expect(region.coordinates[0]).toBeGreaterThanOrEqual(58); // Southern Norway
              expect(region.coordinates[0]).toBeLessThanOrEqual(72); // Northern Norway
              expect(region.coordinates[1]).toBeGreaterThanOrEqual(4); // Western Norway
              expect(region.coordinates[1]).toBeLessThanOrEqual(32); // Eastern Norway
            });

            // Verify percentages sum to approximately 100%
            const totalPercentage = regionalData.reduce((sum, region) => sum + region.percentage, 0);
            expect(Math.abs(totalPercentage - 100)).toBeLessThan(1); // Allow 1% tolerance

            // Verify no duplicate regions
            const regions = regionalData.map(r => r.region);
            const uniqueRegions = new Set(regions);
            expect(uniqueRegions.size).toBe(regions.length);

            // Verify total value consistency
            const totalValue = regionalData.reduce((sum, region) => sum + region.value, 0);
            expect(totalValue).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property 4: Growth Analytics Calculation Consistency
   * Growth analytics should maintain mathematical consistency in
   * growth rate calculations and trend analysis.
   */
  it('should maintain consistency in growth analytics calculations', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateRangeArbitrary,
        fc.constantFrom('users', 'companies', 'revenue', 'bookings'),
        async (dateRange, metric) => {
          // Get growth metrics
          const growthMetrics = await growthAnalyticsService.getGrowthMetrics(
            metric as any,
            dateRange.start,
            dateRange.end
          );

          // Verify growth metrics structure
          expect(growthMetrics).toHaveProperty('currentPeriodValue');
          expect(growthMetrics).toHaveProperty('previousPeriodValue');
          expect(growthMetrics).toHaveProperty('growthRate');
          expect(growthMetrics).toHaveProperty('growthDirection');
          expect(growthMetrics).toHaveProperty('trend');
          expect(growthMetrics).toHaveProperty('forecast');

          // Verify data types and ranges
          expect(typeof growthMetrics.currentPeriodValue).toBe('number');
          expect(typeof growthMetrics.previousPeriodValue).toBe('number');
          expect(typeof growthMetrics.growthRate).toBe('number');
          expect(['up', 'down', 'stable']).toContain(growthMetrics.growthDirection);

          // Verify values are non-negative for count metrics
          if (metric === 'users' || metric === 'companies' || metric === 'bookings') {
            expect(growthMetrics.currentPeriodValue).toBeGreaterThanOrEqual(0);
            expect(growthMetrics.previousPeriodValue).toBeGreaterThanOrEqual(0);
          }

          // Verify revenue is non-negative
          if (metric === 'revenue') {
            expect(growthMetrics.currentPeriodValue).toBeGreaterThanOrEqual(0);
            expect(growthMetrics.previousPeriodValue).toBeGreaterThanOrEqual(0);
          }

          // Verify growth rate calculation
          if (growthMetrics.previousPeriodValue > 0) {
            const expectedGrowthRate = 
              ((growthMetrics.currentPeriodValue - growthMetrics.previousPeriodValue) / 
               growthMetrics.previousPeriodValue) * 100;
            expect(Math.abs(growthMetrics.growthRate - expectedGrowthRate)).toBeLessThan(0.1);
          }

          // Verify growth direction consistency
          if (growthMetrics.growthRate > 1) {
            expect(growthMetrics.growthDirection).toBe('up');
          } else if (growthMetrics.growthRate < -1) {
            expect(growthMetrics.growthDirection).toBe('down');
          } else {
            expect(growthMetrics.growthDirection).toBe('stable');
          }

          // Verify trend data structure
          expect(Array.isArray(growthMetrics.trend)).toBe(true);
          growthMetrics.trend.forEach(point => {
            expect(point).toHaveProperty('date');
            expect(point).toHaveProperty('value');
            expect(point.date).toBeInstanceOf(Date);
            expect(typeof point.value).toBe('number');
            
            if (metric === 'users' || metric === 'companies' || metric === 'bookings') {
              expect(point.value).toBeGreaterThanOrEqual(0);
            }
          });

          // Verify forecast data structure
          expect(Array.isArray(growthMetrics.forecast)).toBe(true);
          growthMetrics.forecast.forEach(point => {
            expect(point).toHaveProperty('date');
            expect(point).toHaveProperty('predictedValue');
            expect(point).toHaveProperty('confidence');
            expect(point.date).toBeInstanceOf(Date);
            expect(typeof point.predictedValue).toBe('number');
            expect(typeof point.confidence).toBe('number');
            
            expect(point.confidence).toBeGreaterThanOrEqual(0);
            expect(point.confidence).toBeLessThanOrEqual(100);
          });
        }
      ),
      { numRuns: 10 }
    );
  });
  /**
   * Property 5: Cross-Service Analytics Consistency
   * Analytics data should be consistent across different analytics services
   * and maintain referential integrity.
   */
  it('should maintain consistency across different analytics services', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateRangeArbitrary,
        async (dateRange) => {
          // Get data from multiple analytics services
          const [platformKPIs, userGrowth, companyGrowth, regionalUsers] = await Promise.all([
            analyticsService.getPlatformKPIs(dateRange.start, dateRange.end, ['users', 'companies']),
            growthAnalyticsService.getGrowthMetrics('users', dateRange.start, dateRange.end),
            growthAnalyticsService.getGrowthMetrics('companies', dateRange.start, dateRange.end),
            geoAnalyticsService.getRegionalDistribution('users')
          ]);

          // Verify cross-service consistency for user counts
          // Platform KPIs and growth analytics should have consistent current period values
          if (userGrowth.currentPeriodValue > 0 && platformKPIs.totalUsers > 0) {
            // Allow some tolerance for different calculation methods
            const userCountDifference = Math.abs(platformKPIs.totalUsers - userGrowth.currentPeriodValue);
            const tolerance = Math.max(platformKPIs.totalUsers * 0.1, 5); // 10% or 5 users tolerance
            expect(userCountDifference).toBeLessThan(tolerance);
          }

          // Verify company count consistency
          if (companyGrowth.currentPeriodValue > 0 && platformKPIs.totalCompanies > 0) {
            const companyCountDifference = Math.abs(platformKPIs.totalCompanies - companyGrowth.currentPeriodValue);
            const tolerance = Math.max(platformKPIs.totalCompanies * 0.1, 2); // 10% or 2 companies tolerance
            expect(companyCountDifference).toBeLessThan(tolerance);
          }

          // Verify regional distribution sums are reasonable
          if (regionalUsers.length > 0) {
            const totalRegionalUsers = regionalUsers.reduce((sum, region) => sum + region.value, 0);
            if (totalRegionalUsers > 0 && platformKPIs.totalUsers > 0) {
              // Regional total should be close to platform total (allowing for users without region data)
              expect(totalRegionalUsers).toBeLessThanOrEqual(platformKPIs.totalUsers * 1.1); // Allow 10% over
              expect(totalRegionalUsers).toBeGreaterThanOrEqual(platformKPIs.totalUsers * 0.5); // At least 50%
            }
          }

          // Verify all services return valid data structures
          expect(typeof platformKPIs.totalUsers).toBe('number');
          expect(typeof platformKPIs.totalCompanies).toBe('number');
          expect(typeof userGrowth.currentPeriodValue).toBe('number');
          expect(typeof companyGrowth.currentPeriodValue).toBe('number');
          expect(Array.isArray(regionalUsers)).toBe(true);
        }
      ),
      { numRuns: 8 }
    );
  });

  /**
   * Property 6: Analytics Cache Consistency
   * Cached analytics data should be consistent with fresh database queries
   * and maintain mathematical accuracy.
   */
  it('should maintain cache consistency for analytics calculations', async () => {
    await fc.assert(
      fc.asyncProperty(
        dateRangeArbitrary,
        fc.constantFrom('users', 'companies', 'bookings'),
        async (dateRange, metric) => {
          // Clear cache to ensure fresh data
          try {
            await redis.flushall();
          } catch (error) {
            // Redis not available, skip cache test
            return;
          }

          // First query (should hit database)
          const firstKPIs = await analyticsService.getPlatformKPIs(
            dateRange.start,
            dateRange.end,
            [metric]
          );

          // Second query (should hit cache)
          const secondKPIs = await analyticsService.getPlatformKPIs(
            dateRange.start,
            dateRange.end,
            [metric]
          );

          // Results should be identical
          expect(firstKPIs.totalUsers).toBe(secondKPIs.totalUsers);
          expect(firstKPIs.activeUsers).toBe(secondKPIs.activeUsers);
          expect(firstKPIs.totalCompanies).toBe(secondKPIs.totalCompanies);
          expect(firstKPIs.verifiedCompanies).toBe(secondKPIs.verifiedCompanies);
          expect(firstKPIs.totalBookings).toBe(secondKPIs.totalBookings);
          expect(firstKPIs.completedBookings).toBe(secondKPIs.completedBookings);
          expect(firstKPIs.totalRevenue).toBe(secondKPIs.totalRevenue);
          expect(firstKPIs.averageBookingValue).toBe(secondKPIs.averageBookingValue);
          expect(firstKPIs.userGrowthRate).toBe(secondKPIs.userGrowthRate);
          expect(firstKPIs.revenueGrowthRate).toBe(secondKPIs.revenueGrowthRate);
        }
      ),
      { numRuns: 5 }
    );
  });

  /**
   * Property 7: Analytics Data Completeness
   * Analytics services should return complete data sets without
   * missing required fields or inconsistent structures.
   */
  it('should return complete and consistent analytics data structures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('daily', 'weekly', 'monthly'),
        async (interval) => {
          const endDate = new Date();
          const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

          // Test multiple analytics endpoints for completeness
          const [kpis, userTimeSeries, revenueTimeSeries, heatMapData] = await Promise.all([
            analyticsService.getPlatformKPIs(startDate, endDate),
            analyticsService.getTimeSeriesData('users', startDate, endDate, interval as any),
            analyticsService.getTimeSeriesData('revenue', startDate, endDate, interval as any),
            geoAnalyticsService.getHeatMapData('users')
          ]);

          // Verify KPIs completeness
          const requiredKPIFields = [
            'totalUsers', 'activeUsers', 'totalCompanies', 'verifiedCompanies',
            'totalBookings', 'completedBookings', 'totalRevenue', 'averageBookingValue',
            'userGrowthRate', 'revenueGrowthRate'
          ];
          
          requiredKPIFields.forEach(field => {
            expect(kpis).toHaveProperty(field);
            expect(typeof (kpis as any)[field]).toBe('number');
          });

          // Verify time series completeness
          [userTimeSeries, revenueTimeSeries].forEach(series => {
            expect(Array.isArray(series)).toBe(true);
            series.forEach(point => {
              expect(point).toHaveProperty('timestamp');
              expect(point).toHaveProperty('value');
              expect(point).toHaveProperty('change');
              expect(point).toHaveProperty('changePercentage');
            });
          });

          // Verify heat map data completeness
          expect(Array.isArray(heatMapData)).toBe(true);
          heatMapData.forEach(point => {
            expect(point).toHaveProperty('lat');
            expect(point).toHaveProperty('lng');
            expect(point).toHaveProperty('intensity');
            expect(point).toHaveProperty('region');
            
            expect(typeof point.lat).toBe('number');
            expect(typeof point.lng).toBe('number');
            expect(typeof point.intensity).toBe('number');
            expect(typeof point.region).toBe('string');
            
            expect(point.intensity).toBeGreaterThanOrEqual(0);
          });
        }
      ),
      { numRuns: 5 }
    );
  });
});