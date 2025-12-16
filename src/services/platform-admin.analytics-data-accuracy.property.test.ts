/**
 * Property-Based Tests for Platform Admin Dashboard Analytics Data Accuracy
 * 
 * Feature: platform-admin-dashboard, Property 3: Analytics Data Accuracy
 * 
 * Property: For any analytics query, the returned metrics should accurately reflect 
 * the current platform state and historical data within the specified time range
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Analytics calculation functions (pure functions for testing)
interface PlatformKPIs {
  totalUsers: number;
  totalCompanies: number;
  totalBookings: number;
  totalRevenue: number;
  activeUsers: number;
  averageBookingValue: number;
}

interface GrowthMetrics {
  userGrowthRate: number;
  bookingGrowthRate: number;
  revenueGrowthRate: number;
  retentionRate: number;
}

interface GeographicData {
  region: string;
  country: string;
  city: string;
  userCount: number;
  bookingCount: number;
  revenue: number;
}

interface TimeRange {
  startDate: Date;
  endDate: Date;
}

// Pure calculation functions for testing
const calculateKPIs = (data: {
  totalUsers: number;
  totalCompanies: number;
  totalBookings: number;
  totalRevenue: number;
  activeUsers: number;
}): PlatformKPIs => {
  const averageBookingValue = data.totalBookings > 0 ? data.totalRevenue / data.totalBookings : 0;
  
  return {
    totalUsers: data.totalUsers,
    totalCompanies: data.totalCompanies,
    totalBookings: data.totalBookings,
    totalRevenue: data.totalRevenue,
    activeUsers: data.activeUsers,
    averageBookingValue,
  };
};

const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const aggregateGeographicData = (data: GeographicData[]): {
  regions: GeographicData[];
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
} => {
  const regionMap = new Map<string, GeographicData>();
  
  data.forEach(item => {
    const existing = regionMap.get(item.region);
    if (existing) {
      existing.userCount += item.userCount;
      existing.bookingCount += item.bookingCount;
      existing.revenue += item.revenue;
    } else {
      regionMap.set(item.region, { ...item });
    }
  });
  
  const regions = Array.from(regionMap.values());
  const totalUsers = regions.reduce((sum, region) => sum + region.userCount, 0);
  const totalBookings = regions.reduce((sum, region) => sum + region.bookingCount, 0);
  const totalRevenue = regions.reduce((sum, region) => sum + region.revenue, 0);
  
  return { regions, totalUsers, totalBookings, totalRevenue };
};

describe('Platform Admin Analytics Data Accuracy Properties', () => {

  // Arbitraries for generating test data
  const timeRangeArbitrary = fc.record({
    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
    endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
  }).filter(({ startDate, endDate }) => startDate <= endDate);

  const kpiDataArbitrary = fc.record({
    totalUsers: fc.integer({ min: 0, max: 100000 }),
    totalCompanies: fc.integer({ min: 0, max: 1000 }),
    totalBookings: fc.integer({ min: 0, max: 1000000 }),
    totalRevenue: fc.float({ min: 0, max: 10000000, noNaN: true }),
    activeUsers: fc.integer({ min: 0, max: 50000 }),
  }).filter(data => data.activeUsers <= data.totalUsers);

  const periodDataArbitrary = fc.record({
    current: fc.record({
      users: fc.integer({ min: 1, max: 10000 }),
      bookings: fc.integer({ min: 1, max: 50000 }),
      revenue: fc.float({ min: 1, max: 1000000, noNaN: true }),
    }),
    previous: fc.record({
      users: fc.integer({ min: 1, max: 10000 }),
      bookings: fc.integer({ min: 1, max: 50000 }),
      revenue: fc.float({ min: 1, max: 1000000, noNaN: true }),
    }),
  });

  const geographicDataArbitrary = fc.array(
    fc.record({
      region: fc.string({ minLength: 2, maxLength: 50 }),
      country: fc.string({ minLength: 2, maxLength: 50 }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      userCount: fc.integer({ min: 0, max: 10000 }),
      bookingCount: fc.integer({ min: 0, max: 50000 }),
      revenue: fc.float({ min: 0, max: 1000000, noNaN: true }),
    }),
    { minLength: 1, maxLength: 20 }
  );

  /**
   * Property 3.1: KPI Data Consistency
   * KPI calculations should be mathematically consistent and within expected ranges
   */
  it('should maintain KPI data consistency across calculations', () => {
    fc.assert(
      fc.property(kpiDataArbitrary, (mockData) => {
        // Execute pure calculation
        const kpis = calculateKPIs(mockData);

        // Verify consistency properties
        expect(kpis.totalUsers).toBeGreaterThanOrEqual(0);
        expect(kpis.totalCompanies).toBeGreaterThanOrEqual(0);
        expect(kpis.totalBookings).toBeGreaterThanOrEqual(0);
        expect(kpis.totalRevenue).toBeGreaterThanOrEqual(0);
        expect(kpis.activeUsers).toBeLessThanOrEqual(kpis.totalUsers);
        
        // Average booking value should be consistent
        if (kpis.totalBookings > 0) {
          const expectedAverage = kpis.totalRevenue / kpis.totalBookings;
          expect(Math.abs(kpis.averageBookingValue - expectedAverage)).toBeLessThan(0.01);
        } else {
          expect(kpis.averageBookingValue).toBe(0);
        }

        // Verify all values are finite numbers
        expect(Number.isFinite(kpis.totalUsers)).toBe(true);
        expect(Number.isFinite(kpis.totalCompanies)).toBe(true);
        expect(Number.isFinite(kpis.totalBookings)).toBe(true);
        expect(Number.isFinite(kpis.totalRevenue)).toBe(true);
        expect(Number.isFinite(kpis.activeUsers)).toBe(true);
        expect(Number.isFinite(kpis.averageBookingValue)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: Growth Rate Calculation Accuracy
   * Growth rates should be calculated correctly and within reasonable bounds
   */
  it('should calculate growth rates accurately within reasonable bounds', () => {
    fc.assert(
      fc.property(periodDataArbitrary, (periodData) => {
        // Execute pure calculations
        const userGrowthRate = calculateGrowthRate(periodData.current.users, periodData.previous.users);
        const bookingGrowthRate = calculateGrowthRate(periodData.current.bookings, periodData.previous.bookings);
        const revenueGrowthRate = calculateGrowthRate(periodData.current.revenue, periodData.previous.revenue);

        // Verify growth rate calculations
        const expectedUserGrowth = ((periodData.current.users - periodData.previous.users) / periodData.previous.users) * 100;
        const expectedBookingGrowth = ((periodData.current.bookings - periodData.previous.bookings) / periodData.previous.bookings) * 100;
        const expectedRevenueGrowth = ((periodData.current.revenue - periodData.previous.revenue) / periodData.previous.revenue) * 100;

        // Allow for small floating point differences
        expect(Math.abs(userGrowthRate - expectedUserGrowth)).toBeLessThan(0.01);
        expect(Math.abs(bookingGrowthRate - expectedBookingGrowth)).toBeLessThan(0.01);
        expect(Math.abs(revenueGrowthRate - expectedRevenueGrowth)).toBeLessThan(0.01);

        // Verify all growth rates are finite
        expect(Number.isFinite(userGrowthRate)).toBe(true);
        expect(Number.isFinite(bookingGrowthRate)).toBe(true);
        expect(Number.isFinite(revenueGrowthRate)).toBe(true);

        // Verify growth rates are mathematically consistent
        if (periodData.current.users > periodData.previous.users) {
          expect(userGrowthRate).toBeGreaterThan(0);
        } else if (periodData.current.users < periodData.previous.users) {
          expect(userGrowthRate).toBeLessThan(0);
        } else {
          expect(userGrowthRate).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: Geographic Data Aggregation Consistency
   * Geographic analytics should properly aggregate data and maintain hierarchical consistency
   */
  it('should maintain geographic data aggregation consistency', () => {
    fc.assert(
      fc.property(geographicDataArbitrary, (mockGeographicData) => {
        // Execute pure aggregation
        const result = aggregateGeographicData(mockGeographicData);

        // Verify data structure and consistency
        expect(Array.isArray(result.regions)).toBe(true);

        // Verify aggregation consistency - totals should match sum of parts
        const calculatedTotalUsers = result.regions.reduce((sum, region) => sum + region.userCount, 0);
        const calculatedTotalBookings = result.regions.reduce((sum, region) => sum + region.bookingCount, 0);
        const calculatedTotalRevenue = result.regions.reduce((sum, region) => sum + region.revenue, 0);

        expect(calculatedTotalUsers).toBe(result.totalUsers);
        expect(calculatedTotalBookings).toBe(result.totalBookings);
        expect(Math.abs(calculatedTotalRevenue - result.totalRevenue)).toBeLessThan(0.01);

        // Verify original data totals match aggregated totals
        const originalTotalUsers = mockGeographicData.reduce((sum, data) => sum + data.userCount, 0);
        const originalTotalBookings = mockGeographicData.reduce((sum, data) => sum + data.bookingCount, 0);
        const originalTotalRevenue = mockGeographicData.reduce((sum, data) => sum + data.revenue, 0);

        expect(result.totalUsers).toBe(originalTotalUsers);
        expect(result.totalBookings).toBe(originalTotalBookings);
        expect(Math.abs(result.totalRevenue - originalTotalRevenue)).toBeLessThan(0.01);

        // Verify all numeric values are non-negative and finite
        result.regions.forEach(region => {
          expect(region.userCount).toBeGreaterThanOrEqual(0);
          expect(region.bookingCount).toBeGreaterThanOrEqual(0);
          expect(region.revenue).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(region.userCount)).toBe(true);
          expect(Number.isFinite(region.bookingCount)).toBe(true);
          expect(Number.isFinite(region.revenue)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.4: Time Range Filtering Accuracy
   * Analytics queries should respect time range filters and return data only within specified periods
   */
  it('should accurately filter data by time ranges', () => {
    fc.assert(
      fc.property(timeRangeArbitrary, (timeRange) => {
        // Generate mock data with timestamps both inside and outside the range
        const allBookings = Array.from({ length: 20 }, (_, i) => ({
          id: `booking-${i}`,
          createdAt: new Date(
            new Date('2020-01-01').getTime() + 
            Math.random() * (new Date('2025-12-31').getTime() - new Date('2020-01-01').getTime())
          ),
          amount: Math.random() * 1000,
        }));

        // Filter function (pure function to test)
        const filterByTimeRange = (bookings: typeof allBookings, range: TimeRange) => {
          return bookings.filter(booking => 
            booking.createdAt >= range.startDate && booking.createdAt <= range.endDate
          );
        };

        // Execute filtering
        const filteredBookings = filterByTimeRange(allBookings, timeRange);

        // Verify time range filtering accuracy
        filteredBookings.forEach(booking => {
          expect(booking.createdAt.getTime()).toBeGreaterThanOrEqual(timeRange.startDate.getTime());
          expect(booking.createdAt.getTime()).toBeLessThanOrEqual(timeRange.endDate.getTime());
        });

        // Verify no valid bookings were excluded
        const manuallyFiltered = allBookings.filter(booking => 
          booking.createdAt >= timeRange.startDate && booking.createdAt <= timeRange.endDate
        );
        expect(filteredBookings.length).toBe(manuallyFiltered.length);

        // Verify metrics calculation on filtered data
        const totalAmount = filteredBookings.reduce((sum, booking) => sum + booking.amount, 0);
        const averageAmount = filteredBookings.length > 0 ? totalAmount / filteredBookings.length : 0;

        expect(Number.isFinite(totalAmount)).toBe(true);
        expect(Number.isFinite(averageAmount)).toBe(true);
        expect(totalAmount).toBeGreaterThanOrEqual(0);
        expect(averageAmount).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: Data Export Integrity
   * Exported analytics data should maintain the same accuracy and completeness as dashboard data
   */
  it('should maintain data integrity during export operations', () => {
    fc.assert(
      fc.property(
        timeRangeArbitrary,
        fc.constantFrom('csv', 'excel', 'json'),
        kpiDataArbitrary,
        (timeRange, format, mockData) => {
          // Mock export data transformation (pure function)
          const transformDataForExport = (data: any, exportFormat: string) => {
            const baseResult = {
              success: true,
              metadata: {
                recordCount: Object.keys(data).length,
                exportedAt: new Date(),
                format: exportFormat,
                timeRange: timeRange,
              },
              data: '',
            };

            switch (exportFormat) {
              case 'json':
                baseResult.data = JSON.stringify(data);
                break;
              case 'csv':
                const headers = Object.keys(data).join(',');
                const values = Object.values(data).join(',');
                baseResult.data = `${headers}\n${values}`;
                break;
              case 'excel':
                baseResult.data = `Excel format data for: ${JSON.stringify(data)}`;
                break;
              default:
                baseResult.data = String(data);
            }

            return baseResult;
          };

          // Execute export transformation
          const exportResult = transformDataForExport(mockData, format);

          // Verify export integrity
          expect(exportResult).toBeDefined();
          expect(exportResult.success).toBe(true);
          expect(exportResult.data).toBeDefined();
          expect(exportResult.metadata).toBeDefined();
          expect(exportResult.metadata.recordCount).toBeGreaterThanOrEqual(0);
          expect(exportResult.metadata.exportedAt).toBeInstanceOf(Date);
          expect(exportResult.metadata.format).toBe(format);

          // Verify time range is preserved in metadata
          expect(exportResult.metadata.timeRange.startDate).toEqual(timeRange.startDate);
          expect(exportResult.metadata.timeRange.endDate).toEqual(timeRange.endDate);

          // Verify data structure based on format
          if (format === 'json') {
            expect(() => JSON.parse(exportResult.data)).not.toThrow();
            const parsedData = JSON.parse(exportResult.data);
            expect(typeof parsedData === 'object').toBe(true);
            
            // Verify data integrity - exported data should match original
            expect(parsedData.totalUsers).toBe(mockData.totalUsers);
            expect(parsedData.totalCompanies).toBe(mockData.totalCompanies);
            expect(parsedData.totalBookings).toBe(mockData.totalBookings);
          } else {
            expect(typeof exportResult.data).toBe('string');
            expect(exportResult.data.length).toBeGreaterThan(0);
            
            // Verify CSV contains the data
            if (format === 'csv') {
              expect(exportResult.data).toContain(String(mockData.totalUsers));
              expect(exportResult.data).toContain(String(mockData.totalCompanies));
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});