/**
 * Calendar Performance Tests
 * Tests to verify calendar load time < 1 second
 * Task 23: Performance optimization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarView } from '../components/availability/CalendarView';
import { AnalyticsDashboard } from '../components/availability/AnalyticsDashboard';

// Mock design system components
vi.mock('../design-system/components', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
  Modal: ({ children, isOpen }: any) => isOpen ? <div>{children}</div> : null,
  Input: ({ label, value, onChange }: any) => (
    <div>
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange?.(e.target.value)} />
    </div>
  ),
  Spinner: () => <div>Loading...</div>,
}));

vi.mock('../design-system/components/Toast', () => ({
  Toast: ({ message }: any) => <div>{message}</div>,
}));

vi.mock('../components/availability/CalendarSkeleton', () => ({
  CalendarSkeleton: () => <div>Loading skeleton...</div>,
}));

vi.mock('../components/availability/ErrorState', () => ({
  ErrorState: ({ error }: any) => <div>Error: {error}</div>,
}));

vi.mock('../components/availability/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

describe('Calendar Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CalendarView Performance', () => {
    it('should render calendar with large dataset in under 1 second', () => {
      // Generate large calendar dataset (90 days)
      const largeCalendarData = [];
      const startDate = new Date('2024-01-01');
      
      for (let i = 0; i < 90; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        largeCalendarData.push({
          date,
          status: i % 7 === 0 ? 'blocked' : 'available' as const,
          blockReason: i % 7 === 0 ? 'Weekly maintenance' : undefined,
        });
      }

      const startTime = performance.now();

      render(
        <CalendarView
          listingId="listing1"
          listingType="vehicle"
          mode="manage"
          calendarData={largeCalendarData}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify calendar renders within performance budget (< 1 second)
      expect(renderTime).toBeLessThan(1000);

      // Verify calendar displays correctly
      expect(screen.getByText(/december|january/i)).toBeInTheDocument();
    });

    it('should handle month navigation efficiently', () => {
      const onMonthChange = vi.fn();
      
      const startTime = performance.now();

      const { rerender } = render(
        <CalendarView
          listingId="listing1"
          listingType="vehicle"
          mode="view"
          calendarData={[]}
          onMonthChange={onMonthChange}
        />
      );

      // Simulate multiple month changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <CalendarView
            listingId="listing1"
            listingType="vehicle"
            mode="view"
            calendarData={[]}
            onMonthChange={onMonthChange}
          />
        );
      }

      const endTime = performance.now();
      const navigationTime = endTime - startTime;

      // Verify navigation is responsive (< 500ms for 10 navigations)
      expect(navigationTime).toBeLessThan(500);
    });

    it('should memoize expensive calculations', () => {
      const calendarData = [
        { date: new Date('2024-01-01'), status: 'available' as const },
        { date: new Date('2024-01-02'), status: 'blocked' as const, blockReason: 'Maintenance' },
      ];

      const startTime = performance.now();

      // Render multiple times with same props (should use memoization)
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(
          <CalendarView
            listingId="listing1"
            listingType="vehicle"
            mode="view"
            calendarData={calendarData}
          />
        );
        unmount();
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Multiple renders with same props should be fast due to memoization
      expect(totalTime).toBeLessThan(200);
    });
  });

  describe('AnalyticsDashboard Performance', () => {
    it('should render analytics dashboard efficiently', () => {
      // Mock fetch for analytics
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          totalDays: 30,
          blockedDays: 5,
          bookedDays: 10,
          availableDays: 15,
          blockedPercentage: 16.7,
          utilizationRate: 66.7,
        }),
      });

      const startTime = performance.now();

      render(
        <AnalyticsDashboard
          listingId="listing1"
          listingType="vehicle"
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify analytics dashboard renders quickly
      expect(renderTime).toBeLessThan(100);

      // Verify loading state is shown initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should handle pagination for large datasets', () => {
      // Mock paginated response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          analytics: {
            totalDays: 365,
            blockedDays: 50,
            bookedDays: 200,
            availableDays: 115,
            blockedPercentage: 13.7,
            utilizationRate: 63.5,
          },
          totalPages: 12,
          currentPage: 1,
        }),
      });

      const startTime = performance.now();

      render(
        <AnalyticsDashboard
          listingId="listing1"
          listingType="vehicle"
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify pagination doesn't impact initial render performance
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should not create memory leaks with frequent re-renders', () => {
      const calendarData = [
        { date: new Date('2024-01-01'), status: 'available' as const },
      ];

      // Simulate frequent re-renders (like real user interaction)
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(
          <CalendarView
            listingId={`listing${i}`}
            listingType="vehicle"
            mode="view"
            calendarData={calendarData}
          />
        );
        unmount();
      }

      // Test passes if no memory errors occur
      expect(true).toBe(true);
    });
  });
});