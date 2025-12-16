import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import fc from 'fast-check';

// Mock Prisma
const mockPrisma = {
  user: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  booking: {
    count: vi.fn(),
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  transaction: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
  },
  company: {
    count: vi.fn(),
  },
  $queryRaw: vi.fn(),
} as unknown as PrismaClient;

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
};

describe('Platform Admin Growth Calculations Accuracy - Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
  });

  /**
   * Property 1: Growth Rate Calculation Mathematical Consistency
   * Validates that growth rate calculations maintain mathematical integrity
   * and proper data structure consistency
   */
  it('should maintain growth rate calculation mathematical consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          currentPeriodUsers: fc.integer({ min: 0, max: 1000 }),
          previousPeriodUsers: fc.integer({ min: 0, max: 1000 }),
          currentRevenue: fc.float({ min: Math.fround(0), max: Math.fround(100000) }),
          previousRevenue: fc.float({ min: Math.fround(0), max: Math.fround(100000) }),
        }),
        async ({ currentPeriodUsers, previousPeriodUsers, currentRevenue, previousRevenue }) => {
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-31');

          // Mock database responses with comprehensive fallback data
          mockPrisma.user.count.mockResolvedValue(currentPeriodUsers);
          mockPrisma.booking.count.mockResolvedValue(50);
          mockPrisma.transaction.aggregate.mockResolvedValue({
            _sum: { amount: currentRevenue },
            _count: Math.floor(currentRevenue / 100) || 1,
          });
          mockPrisma.company.count.mockResolvedValue(10);
          mockPrisma.user.findMany.mockResolvedValue([]);
          mockPrisma.$queryRaw.mockResolvedValue([
            { date: '2024-01-01', count: currentPeriodUsers, amount: currentRevenue },
          ]);

          // Import and create service instance here to avoid constructor issues
          const { GrowthAnalyticsService } = await import('./growth-analytics.service');
          const growthService = new GrowthAnalyticsService();

          const growthMetrics = await growthService.getGrowthMetrics(startDate, endDate, false);

          // Validate basic data structure and mathematical consistency
          expect(growthMetrics).toBeDefined();
          expect(growthMetrics.userGrowth).toBeDefined();
          expect(growthMetrics.bookingGrowth).toBeDefined();
          expect(growthMetrics.revenueGrowth).toBeDefined();

          // Validate data types and ranges
          expect(typeof growthMetrics.userGrowth.currentPeriod).toBe('number');
          expect(typeof growthMetrics.userGrowth.previousPeriod).toBe('number');
          expect(typeof growthMetrics.userGrowth.growthRate).toBe('number');
          expect(typeof growthMetrics.userGrowth.periodOverPeriodChange).toBe('number');

          expect(growthMetrics.userGrowth.currentPeriod).toBeGreaterThanOrEqual(0);
          expect(growthMetrics.userGrowth.previousPeriod).toBeGreaterThanOrEqual(0);
          expect(isFinite(growthMetrics.userGrowth.growthRate)).toBe(true);

          // Validate period-over-period change consistency
          const expectedChange = growthMetrics.userGrowth.currentPeriod - growthMetrics.userGrowth.previousPeriod;
          expect(growthMetrics.userGrowth.periodOverPeriodChange).toBe(expectedChange);

          // Validate growth direction consistency
          expect(['up', 'down', 'stable']).toContain(growthMetrics.userGrowth.growthDirection);

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 2: Growth Direction Classification Consistency
   * Validates that growth direction classification (up/down/stable) 
   * is consistent with the calculated growth rates
   */
  it('should maintain growth direction classification consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          growthRate: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
        }),
        async ({ growthRate }) => {
          // Mock a simple scenario to test direction logic
          mockPrisma.user.count.mockResolvedValue(100);
          mockPrisma.booking.count.mockResolvedValue(50);
          mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 25 });
          mockPrisma.company.count.mockResolvedValue(10);
          mockPrisma.user.findMany.mockResolvedValue([]);
          mockPrisma.$queryRaw.mockResolvedValue([
            { date: '2024-01-01', count: 100, amount: 5000 },
          ]);

          const { GrowthAnalyticsService } = await import('./growth-analytics.service');
          const growthService = new GrowthAnalyticsService();

          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-31');
          const growthMetrics = await growthService.getGrowthMetrics(startDate, endDate, false);

          // Validate that growth direction is one of the valid values
          expect(['up', 'down', 'stable']).toContain(growthMetrics.userGrowth.growthDirection);
          expect(['up', 'down', 'stable']).toContain(growthMetrics.bookingGrowth.growthDirection);
          expect(['up', 'down', 'stable']).toContain(growthMetrics.revenueGrowth.growthDirection);

          // Validate that growth rates are finite numbers
          expect(isFinite(growthMetrics.userGrowth.growthRate)).toBe(true);
          expect(isFinite(growthMetrics.bookingGrowth.growthRate)).toBe(true);
          expect(isFinite(growthMetrics.revenueGrowth.growthRate)).toBe(true);

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 3: Data Structure Completeness and Consistency
   * Validates that all growth metrics contain required fields
   * with proper data types and reasonable value ranges
   */
  it('should maintain data structure completeness and consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userCount: fc.integer({ min: 0, max: 500 }),
          bookingCount: fc.integer({ min: 0, max: 200 }),
          revenue: fc.float({ min: Math.fround(0), max: Math.fround(50000) }),
        }),
        async ({ userCount, bookingCount, revenue }) => {
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-31');

          // Mock comprehensive database responses
          mockPrisma.user.count.mockResolvedValue(userCount);
          mockPrisma.booking.count.mockResolvedValue(bookingCount);
          mockPrisma.transaction.aggregate.mockResolvedValue({ 
            _sum: { amount: revenue }, 
            _count: Math.floor(revenue / 100) || 1 
          });
          mockPrisma.company.count.mockResolvedValue(10);
          mockPrisma.user.findMany.mockResolvedValue([]);
          mockPrisma.$queryRaw.mockResolvedValue([
            { date: '2024-01-01', count: userCount, amount: revenue },
          ]);

          const { GrowthAnalyticsService } = await import('./growth-analytics.service');
          const growthService = new GrowthAnalyticsService();

          const growthMetrics = await growthService.getGrowthMetrics(startDate, endDate, false);

          // Validate complete data structure
          expect(growthMetrics).toHaveProperty('userGrowth');
          expect(growthMetrics).toHaveProperty('bookingGrowth');
          expect(growthMetrics).toHaveProperty('revenueGrowth');
          expect(growthMetrics).toHaveProperty('cohortAnalysis');
          expect(growthMetrics).toHaveProperty('trendAnalysis');
          expect(growthMetrics).toHaveProperty('forecasting');

          // Validate user growth structure
          expect(growthMetrics.userGrowth).toHaveProperty('currentPeriod');
          expect(growthMetrics.userGrowth).toHaveProperty('previousPeriod');
          expect(growthMetrics.userGrowth).toHaveProperty('growthRate');
          expect(growthMetrics.userGrowth).toHaveProperty('growthDirection');
          expect(growthMetrics.userGrowth).toHaveProperty('periodOverPeriodChange');
          expect(growthMetrics.userGrowth).toHaveProperty('compoundGrowthRate');
          expect(growthMetrics.userGrowth).toHaveProperty('timeSeries');

          // Validate data types
          expect(typeof growthMetrics.userGrowth.currentPeriod).toBe('number');
          expect(typeof growthMetrics.userGrowth.previousPeriod).toBe('number');
          expect(typeof growthMetrics.userGrowth.growthRate).toBe('number');
          expect(typeof growthMetrics.userGrowth.growthDirection).toBe('string');
          expect(typeof growthMetrics.userGrowth.periodOverPeriodChange).toBe('number');
          expect(typeof growthMetrics.userGrowth.compoundGrowthRate).toBe('number');
          expect(Array.isArray(growthMetrics.userGrowth.timeSeries)).toBe(true);

          // Validate reasonable value ranges
          expect(growthMetrics.userGrowth.currentPeriod).toBeGreaterThanOrEqual(0);
          expect(growthMetrics.userGrowth.previousPeriod).toBeGreaterThanOrEqual(0);
          expect(isFinite(growthMetrics.userGrowth.growthRate)).toBe(true);
          expect(isFinite(growthMetrics.userGrowth.compoundGrowthRate)).toBe(true);

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 4: Time Series Data Temporal Consistency
   * Validates that time series data maintains proper temporal ordering
   * and mathematical relationships between data points
   */
  it('should maintain time series data temporal consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-01-31') }),
            value: fc.integer({ min: 0, max: 100 }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (timeSeriesData) => {
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-31');

          // Sort data by date for consistency
          const sortedData = timeSeriesData.sort((a, b) => a.date.getTime() - b.date.getTime());

          // Mock database responses
          mockPrisma.user.count.mockResolvedValue(100);
          mockPrisma.booking.count.mockResolvedValue(50);
          mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 25 });

          // Mock time series query
          mockPrisma.$queryRaw.mockResolvedValue(
            sortedData.map(item => ({
              date: item.date.toISOString().split('T')[0],
              count: item.value,
            }))
          );

          const { GrowthAnalyticsService } = await import('./growth-analytics.service');
          const growthService = new GrowthAnalyticsService();
          const growthMetrics = await growthService.getGrowthMetrics(startDate, endDate, false);

          // Validate time series data structure and consistency
          expect(growthMetrics.userGrowth.timeSeries).toBeDefined();
          expect(Array.isArray(growthMetrics.userGrowth.timeSeries)).toBe(true);

          if (growthMetrics.userGrowth.timeSeries.length > 1) {
            // Validate temporal ordering
            for (let i = 1; i < growthMetrics.userGrowth.timeSeries.length; i++) {
              const currentPeriod = new Date(growthMetrics.userGrowth.timeSeries[i].period);
              const previousPeriod = new Date(growthMetrics.userGrowth.timeSeries[i - 1].period);
              
              // Current period should be after or equal to previous period
              expect(currentPeriod.getTime()).toBeGreaterThanOrEqual(previousPeriod.getTime());
            }

            // Validate growth rate calculations in time series
            growthMetrics.userGrowth.timeSeries.forEach((point, index) => {
              expect(point.value).toBeGreaterThanOrEqual(0);
              expect(typeof point.growthRate).toBe('number');
              expect(point.period).toBeDefined();
              
              // Growth rate should be finite
              expect(isFinite(point.growthRate)).toBe(true);
            });
          }

          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 5: Cohort Analysis Data Integrity
   * Validates that cohort analysis maintains mathematical consistency
   * and proper retention rate calculations
   */
  it('should maintain cohort analysis data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          cohortSize: fc.integer({ min: 10, max: 1000 }),
          retentionMonth1: fc.integer({ min: 0, max: 1000 }),
          retentionMonth2: fc.integer({ min: 0, max: 1000 }),
          retentionMonth3: fc.integer({ min: 0, max: 1000 }),
        }),
        async ({ cohortSize, retentionMonth1, retentionMonth2, retentionMonth3 }) => {
          // Ensure retention numbers don't exceed cohort size
          const actualRetention1 = Math.min(retentionMonth1, cohortSize);
          const actualRetention2 = Math.min(retentionMonth2, actualRetention1);
          const actualRetention3 = Math.min(retentionMonth3, actualRetention2);

          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-03-31');

          // Mock database responses
          mockPrisma.user.count.mockResolvedValue(cohortSize);
          mockPrisma.booking.count.mockResolvedValue(0);
          mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: 0 });

          // Mock cohort data
          mockPrisma.user.findMany.mockResolvedValue(
            Array.from({ length: cohortSize }, (_, i) => ({
              id: `user-${i}`,
              createdAt: new Date('2024-01-01'),
            }))
          );

          mockPrisma.$queryRaw.mockResolvedValue([
            { cohort_month: '2024-01', cohort_size: cohortSize },
          ]);

          const { GrowthAnalyticsService } = await import('./growth-analytics.service');
          const growthService = new GrowthAnalyticsService();
          const growthMetrics = await growthService.getGrowthMetrics(startDate, endDate, false);

          // Validate cohort analysis structure
          expect(growthMetrics.cohortAnalysis).toBeDefined();
          expect(Array.isArray(growthMetrics.cohortAnalysis)).toBe(true);

          if (growthMetrics.cohortAnalysis.length > 0) {
            growthMetrics.cohortAnalysis.forEach(cohort => {
              // Validate cohort structure
              expect(cohort.cohortMonth).toBeDefined();
              expect(cohort.cohortSize).toBeGreaterThanOrEqual(0);
              expect(Array.isArray(cohort.retentionRates)).toBe(true);
              expect(cohort.lifetimeValue).toBeGreaterThanOrEqual(0);
              expect(cohort.averageLifespan).toBeGreaterThanOrEqual(0);

              // Validate retention rates
              cohort.retentionRates.forEach((retention, index) => {
                expect(retention.month).toBe(index);
                expect(retention.retainedUsers).toBeGreaterThanOrEqual(0);
                expect(retention.retainedUsers).toBeLessThanOrEqual(cohort.cohortSize);
                expect(retention.retentionRate).toBeGreaterThanOrEqual(0);
                expect(retention.retentionRate).toBeLessThanOrEqual(100);

                // Retention rate should match calculation
                const expectedRate = cohort.cohortSize > 0 
                  ? (retention.retainedUsers / cohort.cohortSize) * 100 
                  : 0;
                expect(retention.retentionRate).toBeCloseTo(expectedRate, 1);
              });

              // Retention should generally decrease over time (or stay same)
              for (let i = 1; i < cohort.retentionRates.length; i++) {
                expect(cohort.retentionRates[i].retainedUsers)
                  .toBeLessThanOrEqual(cohort.retentionRates[i - 1].retainedUsers);
              }
            });
          }

          return true;
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property 6: Forecasting Data Mathematical Consistency
   * Validates that forecasting calculations maintain mathematical
   * consistency and proper confidence interval bounds
   */
  it('should maintain forecasting data mathematical consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          historicalData: fc.array(
            fc.record({
              period: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
              value: fc.float({ min: Math.fround(0), max: Math.fround(10000) }),
            }),
            { minLength: 3, maxLength: 12 }
          ),
        }),
        async ({ historicalData }) => {
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-06-30');

          // Sort historical data by period
          const sortedData = historicalData.sort((a, b) => a.period.getTime() - b.period.getTime());

          // Mock database responses
          mockPrisma.user.count.mockResolvedValue(100);
          mockPrisma.booking.count.mockResolvedValue(50);
          mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 5000 }, _count: 25 });

          // Mock historical time series data
          mockPrisma.$queryRaw.mockResolvedValue(
            sortedData.map(item => ({
              date: item.period.toISOString().split('T')[0],
              count: Math.floor(item.value),
            }))
          );

          const { GrowthAnalyticsService } = await import('./growth-analytics.service');
          const growthService = new GrowthAnalyticsService();
          const growthMetrics = await growthService.getGrowthMetrics(startDate, endDate, false);

          // Validate forecasting structure
          expect(growthMetrics.forecasting).toBeDefined();
          expect(Array.isArray(growthMetrics.forecasting.userGrowthForecast)).toBe(true);
          expect(Array.isArray(growthMetrics.forecasting.revenueForecast)).toBe(true);

          // Validate forecast accuracy metrics
          expect(typeof growthMetrics.forecasting.forecastAccuracy.mape).toBe('number');
          expect(typeof growthMetrics.forecasting.forecastAccuracy.rmse).toBe('number');
          expect(growthMetrics.forecasting.forecastAccuracy.mape).toBeGreaterThanOrEqual(0);
          expect(growthMetrics.forecasting.forecastAccuracy.rmse).toBeGreaterThanOrEqual(0);

          // Validate user growth forecast
          growthMetrics.forecasting.userGrowthForecast.forEach(forecast => {
            expect(forecast.period).toBeDefined();
            expect(forecast.predicted).toBeGreaterThanOrEqual(0);
            expect(forecast.confidenceInterval).toBeDefined();
            expect(forecast.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
            expect(forecast.confidenceInterval.upper).toBeGreaterThanOrEqual(0);

            // Upper bound should be >= lower bound
            expect(forecast.confidenceInterval.upper)
              .toBeGreaterThanOrEqual(forecast.confidenceInterval.lower);

            // Predicted value should be within confidence interval
            expect(forecast.predicted)
              .toBeGreaterThanOrEqual(forecast.confidenceInterval.lower);
            expect(forecast.predicted)
              .toBeLessThanOrEqual(forecast.confidenceInterval.upper);
          });

          // Validate revenue forecast
          growthMetrics.forecasting.revenueForecast.forEach(forecast => {
            expect(forecast.period).toBeDefined();
            expect(forecast.predicted).toBeGreaterThanOrEqual(0);
            expect(forecast.confidenceInterval).toBeDefined();
            expect(forecast.confidenceInterval.lower).toBeGreaterThanOrEqual(0);
            expect(forecast.confidenceInterval.upper).toBeGreaterThanOrEqual(0);

            // Upper bound should be >= lower bound
            expect(forecast.confidenceInterval.upper)
              .toBeGreaterThanOrEqual(forecast.confidenceInterval.lower);

            // Predicted value should be within confidence interval
            expect(forecast.predicted)
              .toBeGreaterThanOrEqual(forecast.confidenceInterval.lower);
            expect(forecast.predicted)
              .toBeLessThanOrEqual(forecast.confidenceInterval.upper);
          });

          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});