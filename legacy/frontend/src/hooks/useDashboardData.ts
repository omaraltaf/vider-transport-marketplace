/**
 * useDashboardData Hook
 * Custom hook for fetching dashboard data with caching and error handling
 */

import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

export interface DashboardKPIs {
  provider: {
    totalRevenue30Days: number;
    fleetUtilization: number;
    aggregatedRating: number | null;
  };
  renter: {
    totalSpend30Days: number;
    openBookingsCount: number;
    upcomingBookingsCount: number;
  };
}

export interface ActionableItem {
  type: 'booking_request' | 'expiring_request' | 'unread_message' | 'rating_prompt' | 'verification_status';
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link: string;
  createdAt: string;
}

export interface OperationalSummary {
  listings: {
    availableCount: number;
    suspendedCount: number;
  };
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    companyName: string;
    listingTitle: string;
    status: string;
    startDate: string;
    role: 'provider' | 'renter';
  }>;
  billing: {
    hasInvoices: boolean;
    latestInvoicePath: string | null;
  };
}

export interface ProfileStatus {
  completeness: number;
  missingFields: string[];
  verified: boolean;
  allDriversVerified: boolean;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  actionableItems: ActionableItem[];
  operations: OperationalSummary;
  profile: ProfileStatus;
}

/**
 * Custom hook for fetching dashboard data
 * Implements 30-second cache and automatic retry logic
 */
export function useDashboardData() {
  const api = useApi();

  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const data = await api.get<DashboardData>('/dashboard');
        return data;
      } catch (error) {
        // Re-throw with more context
        if (error instanceof Error) {
          throw new Error(`Failed to load dashboard data: ${error.message}`);
        }
        throw new Error('Failed to load dashboard data');
      }
    },
    staleTime: 30 * 1000, // 30 seconds cache
    gcTime: 60 * 1000, // Keep in cache for 60 seconds
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}
