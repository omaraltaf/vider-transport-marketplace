/**
 * KPICard Property-Based Tests
 * Tests numerical formatting consistency and rating display
 * 
 * Feature: company-admin-dashboard
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatCurrency, formatPercentage, formatRating, formatCount } from './KPICard';

describe('KPICard Property-Based Tests', () => {
  /**
   * Feature: company-admin-dashboard, Property 12: Numerical formatting consistency
   * Validates: Requirements 7.2
   * 
   * For any numerical value displayed on the dashboard, currency values should include 
   * currency symbol and 2 decimal places, percentages should include % symbol and 1 decimal 
   * place, and counts should be integers
   */
  describe('Property 12: Numerical formatting consistency', () => {
    it('should format currency with kr symbol and exactly 2 decimal places', () => {
      fc.assert(
        fc.property(
          // Generate any finite number (positive, negative, or zero)
          fc.double({ min: -1000000, max: 1000000, noNaN: true }),
          (value) => {
            const formatted = formatCurrency(value);
            
            // Should start with "kr "
            expect(formatted).toMatch(/^kr /);
            
            // Should have exactly 2 decimal places
            const numberPart = formatted.replace('kr ', '');
            const decimalMatch = numberPart.match(/\.(\d+)$/);
            expect(decimalMatch).toBeTruthy();
            expect(decimalMatch![1].length).toBe(2);
            
            // Should be parseable back to a number
            const parsed = parseFloat(numberPart);
            expect(parsed).toBeCloseTo(value, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format percentage with % symbol and exactly 1 decimal place', () => {
      fc.assert(
        fc.property(
          // Generate percentages from 0 to 100
          fc.double({ min: 0, max: 100, noNaN: true }),
          (value) => {
            const formatted = formatPercentage(value);
            
            // Should end with "%"
            expect(formatted).toMatch(/%$/);
            
            // Should have exactly 1 decimal place
            const numberPart = formatted.replace('%', '');
            const decimalMatch = numberPart.match(/\.(\d+)$/);
            expect(decimalMatch).toBeTruthy();
            expect(decimalMatch![1].length).toBe(1);
            
            // Should be parseable back to a number
            const parsed = parseFloat(numberPart);
            expect(parsed).toBeCloseTo(value, 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format rating with exactly 1 decimal place', () => {
      fc.assert(
        fc.property(
          // Generate ratings from 0 to 5
          fc.double({ min: 0, max: 5, noNaN: true }),
          (value) => {
            const formatted = formatRating(value);
            
            // Should have exactly 1 decimal place
            const decimalMatch = formatted.match(/\.(\d+)$/);
            expect(decimalMatch).toBeTruthy();
            expect(decimalMatch![1].length).toBe(1);
            
            // Should be parseable back to a number
            const parsed = parseFloat(formatted);
            expect(parsed).toBeCloseTo(value, 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format count as integer (no decimal places)', () => {
      fc.assert(
        fc.property(
          // Generate any number including decimals
          fc.double({ min: 0, max: 10000, noNaN: true }),
          (value) => {
            const formatted = formatCount(value);
            
            // Should not contain a decimal point
            expect(formatted).not.toMatch(/\./);
            
            // Should be an integer when parsed
            const parsed = parseInt(formatted, 10);
            expect(parsed).toBe(Math.floor(value));
            
            // Should equal the floor of the original value
            expect(parsed).toBe(Math.floor(value));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: zero values', () => {
      expect(formatCurrency(0)).toBe('kr 0.00');
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatRating(0)).toBe('0.0');
      expect(formatCount(0)).toBe('0');
    });

    it('should handle edge cases: negative values for currency', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000000, max: -0.01, noNaN: true }),
          (value) => {
            const formatted = formatCurrency(value);
            expect(formatted).toMatch(/^kr -/);
            
            const numberPart = formatted.replace('kr ', '');
            const parsed = parseFloat(numberPart);
            expect(parsed).toBeCloseTo(value, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases: very large numbers', () => {
      const largeNumber = 999999.99;
      expect(formatCurrency(largeNumber)).toBe('kr 999999.99');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatCount(999999.5)).toBe('999999');
    });

    it('should handle edge cases: very small decimal values', () => {
      expect(formatCurrency(0.01)).toBe('kr 0.01');
      expect(formatPercentage(0.1)).toBe('0.1%');
      expect(formatRating(0.1)).toBe('0.1');
    });
  });
});
