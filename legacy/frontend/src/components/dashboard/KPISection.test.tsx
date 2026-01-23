/**
 * KPISection Property-Based Tests
 * Tests rating display consistency
 * 
 * Feature: company-admin-dashboard
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { KPISection } from './KPISection';
import type { DashboardKPIs } from '../../hooks/useDashboardData';

describe('KPISection Property-Based Tests', () => {
  /**
   * Feature: company-admin-dashboard, Property 4: Rating display consistency
   * Validates: Requirements 1.3
   * 
   * For any company, the rating displayed on the dashboard should match the 
   * aggregatedRating field stored in the company record
   */
  describe('Property 4: Rating display consistency', () => {
    it('should display the exact aggregatedRating value from the data', () => {
      fc.assert(
        fc.property(
          // Generate random KPI data with various rating values
          fc.record({
            provider: fc.record({
              totalRevenue30Days: fc.double({ min: 0, max: 1000000, noNaN: true }),
              fleetUtilization: fc.double({ min: 0, max: 100, noNaN: true }),
              // Rating can be null or a value between 0 and 5
              aggregatedRating: fc.option(
                fc.double({ min: 0, max: 5, noNaN: true }),
                { nil: null }
              ),
            }),
            renter: fc.record({
              totalSpend30Days: fc.double({ min: 0, max: 1000000, noNaN: true }),
              openBookingsCount: fc.integer({ min: 0, max: 1000 }),
              upcomingBookingsCount: fc.integer({ min: 0, max: 1000 }),
            }),
          }),
          (kpis: DashboardKPIs) => {
            const { container } = render(<KPISection kpis={kpis} />);
            
            // Find the rating card by looking for the "Company Rating" text
            const ratingCard = Array.from(container.querySelectorAll('[role="article"]'))
              .find(card => card.textContent?.includes('Company Rating'));
            
            expect(ratingCard).toBeTruthy();
            
            if (kpis.provider.aggregatedRating !== null) {
              // If rating exists, it should be displayed with 1 decimal place
              const expectedRating = kpis.provider.aggregatedRating.toFixed(1);
              expect(ratingCard?.textContent).toContain(expectedRating);
              expect(ratingCard?.textContent).toContain('Average rating');
            } else {
              // If rating is null, should display "N/A"
              expect(ratingCard?.textContent).toContain('N/A');
              expect(ratingCard?.textContent).toContain('No ratings yet');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case: rating of 0', () => {
      const kpis: DashboardKPIs = {
        provider: {
          totalRevenue30Days: 1000,
          fleetUtilization: 50,
          aggregatedRating: 0,
        },
        renter: {
          totalSpend30Days: 500,
          openBookingsCount: 2,
          upcomingBookingsCount: 3,
        },
      };

      const { container } = render(<KPISection kpis={kpis} />);
      const ratingCard = Array.from(container.querySelectorAll('[role="article"]'))
        .find(card => card.textContent?.includes('Company Rating'));

      expect(ratingCard?.textContent).toContain('0.0');
      expect(ratingCard?.textContent).toContain('Average rating');
    });

    it('should handle edge case: perfect rating of 5', () => {
      const kpis: DashboardKPIs = {
        provider: {
          totalRevenue30Days: 1000,
          fleetUtilization: 50,
          aggregatedRating: 5,
        },
        renter: {
          totalSpend30Days: 500,
          openBookingsCount: 2,
          upcomingBookingsCount: 3,
        },
      };

      const { container } = render(<KPISection kpis={kpis} />);
      const ratingCard = Array.from(container.querySelectorAll('[role="article"]'))
        .find(card => card.textContent?.includes('Company Rating'));

      expect(ratingCard?.textContent).toContain('5.0');
      expect(ratingCard?.textContent).toContain('Average rating');
    });

    it('should handle edge case: null rating (no ratings yet)', () => {
      const kpis: DashboardKPIs = {
        provider: {
          totalRevenue30Days: 1000,
          fleetUtilization: 50,
          aggregatedRating: null,
        },
        renter: {
          totalSpend30Days: 500,
          openBookingsCount: 2,
          upcomingBookingsCount: 3,
        },
      };

      const { container } = render(<KPISection kpis={kpis} />);
      const ratingCard = Array.from(container.querySelectorAll('[role="article"]'))
        .find(card => card.textContent?.includes('Company Rating'));

      expect(ratingCard?.textContent).toContain('N/A');
      expect(ratingCard?.textContent).toContain('No ratings yet');
    });

    it('should display rating with exactly 1 decimal place for all valid ratings', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 5, noNaN: true }),
          (rating) => {
            const kpis: DashboardKPIs = {
              provider: {
                totalRevenue30Days: 1000,
                fleetUtilization: 50,
                aggregatedRating: rating,
              },
              renter: {
                totalSpend30Days: 500,
                openBookingsCount: 2,
                upcomingBookingsCount: 3,
              },
            };

            const { container } = render(<KPISection kpis={kpis} />);
            const ratingCard = Array.from(container.querySelectorAll('[role="article"]'))
              .find(card => card.textContent?.includes('Company Rating'));

            const expectedRating = rating.toFixed(1);
            expect(ratingCard?.textContent).toContain(expectedRating);
            
            // Verify it has exactly 1 decimal place
            const ratingMatch = ratingCard?.textContent?.match(/(\d+\.\d)/);
            expect(ratingMatch).toBeTruthy();
            if (ratingMatch) {
              const displayedRating = parseFloat(ratingMatch[1]);
              expect(displayedRating).toBeCloseTo(rating, 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
