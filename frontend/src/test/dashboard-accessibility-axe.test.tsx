/**
 * Automated Accessibility Tests using axe-core
 * 
 * This test suite uses axe-core to automatically detect WCAG violations
 * in the dashboard components.
 * 
 * Requirements: 6.4, 6.5, 7.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../contexts/ToastContext';
import { axe } from 'vitest-axe';
import React from 'react';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', role: 'COMPANY_ADMIN' },
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Import dashboard components
import DashboardPage from '../pages/DashboardPage';
import { KPICard } from '../components/dashboard/KPICard';
import { KPISection } from '../components/dashboard/KPISection';
import { ActionableItemsList } from '../components/dashboard/ActionableItemsList';
import { RecentBookingsTable } from '../components/dashboard/RecentBookingsTable';
import { OperationsSummary } from '../components/dashboard/OperationsSummary';
import { ProfileStatus } from '../components/dashboard/ProfileStatus';

// Mock useDashboardData hook
vi.mock('../hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    data: {
      kpis: {
        provider: {
          totalRevenue30Days: 50000,
          fleetUtilization: 75.5,
          aggregatedRating: 4.5,
        },
        renter: {
          totalSpend30Days: 25000,
          openBookingsCount: 5,
          upcomingBookingsCount: 3,
        },
      },
      actionableItems: [
        {
          id: '1',
          type: 'booking_request' as const,
          title: 'New Booking Request',
          description: 'Review pending booking from Acme Corp',
          priority: 'high' as const,
          link: '/bookings/1',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'expiring_request' as const,
          title: 'Expiring Request',
          description: 'Booking request expires in 2 hours',
          priority: 'high' as const,
          link: '/bookings/2',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          type: 'unread_message' as const,
          title: 'Unread Messages',
          description: '3 unread messages',
          priority: 'medium' as const,
          link: '/messages',
          createdAt: new Date().toISOString(),
        },
      ],
      operations: {
        listings: {
          availableCount: 10,
          suspendedCount: 2,
        },
        recentBookings: [
          {
            id: '1',
            bookingNumber: 'BK-001',
            companyName: 'Acme Corp',
            listingTitle: 'Mercedes Sprinter Van',
            status: 'ACTIVE' as const,
            startDate: new Date().toISOString(),
            role: 'provider' as const,
          },
          {
            id: '2',
            bookingNumber: 'BK-002',
            companyName: 'Tech Solutions',
            listingTitle: 'Professional Driver',
            status: 'PENDING' as const,
            startDate: new Date().toISOString(),
            role: 'provider' as const,
          },
        ],
        billing: {
          hasInvoices: true,
          latestInvoicePath: '/invoices/latest.pdf',
        },
      },
      profile: {
        completeness: 80,
        missingFields: ['description', 'logo'],
        verified: true,
        allDriversVerified: false,
      },
    },
    isLoading: false,
    error: null,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>{component}</BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('Dashboard Accessibility - Automated WCAG Compliance (axe-core)', () => {
  describe('KPICard Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <KPICard
          title="Total Revenue"
          value={50000}
          subtitle="Last 30 days"
          aria-label="Total Revenue: 50000 Last 30 days"
        />
      );

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it('should have no violations with different value types', async () => {
      const { container } = render(
        <div>
          <KPICard
            title="Fleet Utilization"
            value="75.5%"
            aria-label="Fleet Utilization: 75.5%"
          />
          <KPICard
            title="Rating"
            value={4.5}
            aria-label="Rating: 4.5"
          />
        </div>
      );

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('KPISection Component', () => {
    it('should have no accessibility violations', async () => {
      const kpis = {
        provider: {
          totalRevenue30Days: 50000,
          fleetUtilization: 75.5,
          aggregatedRating: 4.5,
        },
        renter: {
          totalSpend30Days: 25000,
          openBookingsCount: 5,
          upcomingBookingsCount: 3,
        },
      };

      const { container } = render(<KPISection kpis={kpis} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('ActionableItemsList Component', () => {
    it('should have no accessibility violations', async () => {
      const items = [
        {
          id: '1',
          type: 'booking_request' as const,
          title: 'New Booking Request',
          description: 'Review pending booking',
          priority: 'high' as const,
          link: '/bookings/1',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'unread_message' as const,
          title: 'Unread Messages',
          description: '5 unread messages',
          priority: 'medium' as const,
          link: '/messages',
          createdAt: new Date().toISOString(),
        },
      ];

      const { container } = renderWithRouter(<ActionableItemsList items={items} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it('should have no violations with empty list', async () => {
      const { container } = renderWithRouter(<ActionableItemsList items={[]} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('RecentBookingsTable Component', () => {
    it('should have no accessibility violations', async () => {
      const bookings = [
        {
          id: '1',
          bookingNumber: 'BK-001',
          companyName: 'Acme Corp',
          listingTitle: 'Mercedes Sprinter Van',
          status: 'ACTIVE' as const,
          startDate: new Date().toISOString(),
          role: 'provider' as const,
        },
        {
          id: '2',
          bookingNumber: 'BK-002',
          companyName: 'Tech Solutions',
          listingTitle: 'Professional Driver',
          status: 'COMPLETED' as const,
          startDate: new Date().toISOString(),
          role: 'renter' as const,
        },
      ];

      const { container } = renderWithRouter(<RecentBookingsTable bookings={bookings} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it('should have no violations with empty bookings', async () => {
      const { container } = renderWithRouter(<RecentBookingsTable bookings={[]} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('OperationsSummary Component', () => {
    it('should have no accessibility violations', async () => {
      const operations = {
        listings: {
          availableCount: 10,
          suspendedCount: 2,
        },
        recentBookings: [
          {
            id: '1',
            bookingNumber: 'BK-001',
            companyName: 'Acme Corp',
            listingTitle: 'Mercedes Sprinter Van',
            status: 'ACTIVE' as const,
            startDate: new Date().toISOString(),
            role: 'provider' as const,
          },
        ],
        billing: {
          hasInvoices: true,
          latestInvoicePath: '/invoices/latest.pdf',
        },
      };

      const { container } = renderWithRouter(<OperationsSummary operations={operations} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('ProfileStatus Component', () => {
    it('should have no accessibility violations', async () => {
      const profile = {
        completeness: 80,
        missingFields: ['description', 'logo'],
        verified: true,
        allDriversVerified: false,
      };

      const { container } = renderWithRouter(<ProfileStatus profile={profile} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it('should have no violations with complete profile', async () => {
      const profile = {
        completeness: 100,
        missingFields: [],
        verified: true,
        allDriversVerified: true,
      };

      const { container } = renderWithRouter(<ProfileStatus profile={profile} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });

    it('should have no violations with incomplete profile', async () => {
      const profile = {
        completeness: 40,
        missingFields: ['description', 'logo', 'businessAddress', 'city', 'postalCode'],
        verified: false,
        allDriversVerified: false,
      };

      const { container } = renderWithRouter(<ProfileStatus profile={profile} />);

      const results = await axe(container);
      expect(results.violations).toEqual([]);
    });
  });

  describe('DashboardPage Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithRouter(<DashboardPage />);

      // Run axe with specific rules for dashboard
      const results = await axe(container, {
        rules: {
          // Ensure color contrast meets WCAG AA
          'color-contrast': { enabled: true },
          // Ensure proper heading hierarchy
          'heading-order': { enabled: true },
          // Ensure all interactive elements are keyboard accessible
          'button-name': { enabled: true },
          'link-name': { enabled: true },
          // Ensure proper ARIA usage
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          // Ensure proper form labels
          'label': { enabled: true },
          // Ensure proper landmark regions
          'region': { enabled: true },
        },
      });

      expect(results.violations).toEqual([]);
    });
  });

  describe('WCAG 2.1 AA Compliance - Specific Rules', () => {
    it('should meet color contrast requirements (WCAG 1.4.3)', async () => {
      const { container } = renderWithRouter(<DashboardPage />);

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results.violations).toEqual([]);
    });

    it('should have proper keyboard navigation (WCAG 2.1.1)', async () => {
      const { container } = renderWithRouter(<DashboardPage />);

      const results = await axe(container, {
        rules: {
          'button-name': { enabled: true },
          'link-name': { enabled: true },
          'tabindex': { enabled: true },
        },
      });

      expect(results.violations).toEqual([]);
    });

    it('should have proper ARIA labels (WCAG 4.1.2)', async () => {
      const { container } = renderWithRouter(<DashboardPage />);

      const results = await axe(container, {
        rules: {
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          'aria-required-attr': { enabled: true },
          'aria-required-children': { enabled: true },
          'aria-required-parent': { enabled: true },
        },
      });

      expect(results.violations).toEqual([]);
    });

    it('should have proper heading hierarchy (WCAG 1.3.1)', async () => {
      const { container } = renderWithRouter(<DashboardPage />);

      const results = await axe(container, {
        rules: {
          'heading-order': { enabled: true },
        },
      });

      expect(results.violations).toEqual([]);
    });

    it('should have proper landmark regions (WCAG 1.3.1)', async () => {
      const { container } = renderWithRouter(<DashboardPage />);

      const results = await axe(container, {
        rules: {
          'region': { enabled: true },
          'landmark-one-main': { enabled: true },
        },
      });

      expect(results.violations).toEqual([]);
    });

    it('should have proper focus indicators (WCAG 2.4.7)', async () => {
      const { container } = renderWithRouter(<DashboardPage />);

      const results = await axe(container, {
        rules: {
          'focus-order-semantics': { enabled: true },
        },
      });

      expect(results.violations).toEqual([]);
    });
  });
});
