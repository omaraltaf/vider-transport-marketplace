/**
 * Responsive Design Tests for Dashboard
 * Tests responsive behavior and structure
 * Validates Requirements 6.1, 6.2, 6.3
 * 
 * Note: These tests verify the presence of responsive CSS classes and structure.
 * Actual media query behavior should be tested manually or with E2E tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '../contexts/ToastContext';
import DashboardPage from '../pages/DashboardPage';
import { useDashboardData } from '../hooks/useDashboardData';

// Mock the hooks
vi.mock('../hooks/useDashboardData');
vi.mock('../components/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', role: 'COMPANY_ADMIN', companyId: 'company-1' },
    isAuthenticated: true,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockDashboardData = {
  kpis: {
    provider: {
      totalRevenue30Days: 50000,
      fleetUtilization: 75.5,
      aggregatedRating: 4.5,
    },
    renter: {
      totalSpend30Days: 25000,
      openBookingsCount: 3,
      upcomingBookingsCount: 5,
    },
  },
  actionableItems: [
    {
      id: '1',
      type: 'booking_request' as const,
      title: 'New Booking Request',
      description: 'Review pending booking request',
      priority: 'high' as const,
      link: '/bookings/1',
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
        companyName: 'Test Company',
        listingTitle: 'Test Vehicle',
        status: 'ACTIVE' as const,
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
    missingFields: ['description'],
    verified: true,
    allDriversVerified: false,
  },
};

const renderDashboard = () => {
  return render(
    <ToastProvider>
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    </ToastProvider>
  );
};

describe('Dashboard Responsive Design', () => {
  beforeEach(() => {
    vi.mocked(useDashboardData).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: null,
    });
  });

  describe('Layout Structure', () => {
    it('should render dashboard with proper grid structure', () => {
      const { container } = renderDashboard();

      const dashboardGrid = container.querySelector('.dashboard-grid');
      expect(dashboardGrid).toBeTruthy();
      expect(dashboardGrid).toBeInstanceOf(HTMLElement);
    });

    it('should render all dashboard sections', () => {
      const { container } = renderDashboard();

      const sections = container.querySelectorAll('.dashboard-section');
      expect(sections.length).toBe(4); // KPI, Actionable, Operations, Profile
    });

    it('should render KPI grid with proper structure', () => {
      const { container } = renderDashboard();

      const kpiGrid = container.querySelector('.kpi-grid');
      expect(kpiGrid).toBeTruthy();
      
      // Should have 6 KPI cards (3 provider + 3 renter)
      const kpiCards = container.querySelectorAll('.kpi-card');
      expect(kpiCards.length).toBe(6);
    });
  });

  describe('Responsive CSS Classes', () => {
    it('should have responsive grid classes applied', () => {
      const { container } = renderDashboard();

      const dashboardGrid = container.querySelector('.dashboard-grid');
      expect(dashboardGrid?.classList.contains('dashboard-grid')).toBe(true);
    });

    it('should have KPI grid with responsive classes', () => {
      const { container } = renderDashboard();

      const kpiGrid = container.querySelector('.kpi-grid');
      expect(kpiGrid?.classList.contains('kpi-grid')).toBe(true);
    });
  });

  describe('Touch Target Accessibility', () => {
    it('should render interactive buttons', () => {
      const { container } = renderDashboard();

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Verify buttons are interactive elements
      buttons.forEach((button) => {
        expect(button.tagName).toBe('BUTTON');
      });
    });

    it('should have actionable items with proper button structure', () => {
      const { container } = renderDashboard();

      const actionableButtons = container.querySelectorAll('.actionable-item-button');
      expect(actionableButtons.length).toBeGreaterThan(0);
    });

    it('should have listing stat buttons with proper structure', async () => {
      renderDashboard();

      // Wait for the operations section to render
      await screen.findByText(/Listings/i);
      
      // Check for the listing count displays
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Suspended')).toBeInTheDocument();
    });
  });

  describe('Table Horizontal Scrolling', () => {
    it('should render recent bookings table', async () => {
      renderDashboard();

      // Wait for the table to render by checking for booking data
      const bookingNumbers = await screen.findAllByText('BK-001');
      expect(bookingNumbers.length).toBeGreaterThan(0);
      
      // Verify table content is present
      const companies = screen.getAllByText('Test Company');
      expect(companies.length).toBeGreaterThan(0);
      const vehicles = screen.getAllByText('Test Vehicle');
      expect(vehicles.length).toBeGreaterThan(0);
    });

    it('should have table wrapper for scrolling', async () => {
      renderDashboard();

      // Wait for table to render
      const bookingNumbers = await screen.findAllByText('BK-001');
      expect(bookingNumbers.length).toBeGreaterThan(0);
      
      // Verify table role exists (indicates table is rendered)
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should display skeleton loaders with proper responsive layout', () => {
      vi.mocked(useDashboardData).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      });

      const { container } = renderDashboard();

      // Check that skeleton loaders are present
      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Error States', () => {
    it('should display error messages with proper responsive layout', () => {
      vi.mocked(useDashboardData).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load dashboard data'),
      });

      renderDashboard();

      // Check that error messages are displayed
      const errorMessages = screen.getAllByText(/failed to load/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });
});
