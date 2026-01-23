import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AnalyticsDashboard } from './AnalyticsDashboard';

describe('AnalyticsDashboard', () => {
  const mockAnalyticsData = {
    totalDays: 30,
    blockedDays: 5,
    bookedDays: 15,
    availableDays: 25,
    blockedPercentage: 16.67,
    utilizationRate: 60.0,
  };

  beforeEach(() => {
    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => 'mock-token'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAnalyticsData),
      } as Response)
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    expect(screen.getByText(/loading analytics/i)).toBeInTheDocument();
  });

  it('fetches and displays analytics data', async () => {
    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText('Availability Analytics')).toBeInTheDocument();
    });

    // Check summary cards
    expect(screen.getByText('Total Days')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Blocked Days')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Booked Days')).toBeInTheDocument();
    expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Available Days')).toBeInTheDocument();
    expect(screen.getAllByText('25').length).toBeGreaterThanOrEqual(1);
  });

  it('displays blocked days percentage', async () => {
    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText('Blocked Days Percentage')).toBeInTheDocument();
    });

    // Check that the percentage is displayed (appears in multiple places)
    expect(screen.getAllByText(/16\.7%/)).toHaveLength(2); // Badge and bar label
  });

  it('displays utilization rate', async () => {
    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText('Utilization Rate')).toBeInTheDocument();
    });

    expect(screen.getByText('60.0%')).toBeInTheDocument();
    expect(screen.getByText('Utilized')).toBeInTheDocument();
  });

  it('displays insights for high block rate', async () => {
    const highBlockData = {
      ...mockAnalyticsData,
      blockedDays: 10,
      blockedPercentage: 33.33,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(highBlockData),
      } as Response)
    );

    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText(/high block rate/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/over 30% of days are blocked/i)
    ).toBeInTheDocument();
  });

  it('displays insights for low utilization', async () => {
    const lowUtilizationData = {
      ...mockAnalyticsData,
      bookedDays: 5,
      utilizationRate: 20.0,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(lowUtilizationData),
      } as Response)
    );

    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText(/utilization is below 40%/i)).toBeInTheDocument();
    });

    // Check that low utilization badge appears (appears in multiple places)
    expect(screen.getAllByText(/low utilization/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays insights for high demand', async () => {
    const highDemandData = {
      ...mockAnalyticsData,
      bookedDays: 20,
      utilizationRate: 80.0,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(highDemandData),
      } as Response)
    );

    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText(/high demand/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/your listing has high utilization/i)
    ).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response)
    );

    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('displays moderate utilization badge', async () => {
    const moderateData = {
      ...mockAnalyticsData,
      bookedDays: 15,
      utilizationRate: 60.0,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(moderateData),
      } as Response)
    );

    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText(/moderate utilization/i)).toBeInTheDocument();
    });
  });

  it('displays no availability warning', async () => {
    const noAvailabilityData = {
      ...mockAnalyticsData,
      availableDays: 0,
      blockedDays: 30,
      bookedDays: 0,
      blockedPercentage: 100,
      utilizationRate: 0,
    };

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(noAvailabilityData),
      } as Response)
    );

    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(screen.getByText(/no availability/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/all days in this period are blocked/i)
    ).toBeInTheDocument();
  });

  it('includes authorization header in fetch request', async () => {
    render(<AnalyticsDashboard listingId="listing-1" listingType="vehicle" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/availability/analytics/listing-1'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer mock-token',
          },
        })
      );
    });
  });
});
