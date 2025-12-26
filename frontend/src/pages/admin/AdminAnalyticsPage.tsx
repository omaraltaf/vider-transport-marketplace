import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
import { useAuth } from '../../contexts/EnhancedAuthContext';
import { tokenManager } from '../../services/error-handling/TokenManager';
import AdminPanelPage from '../AdminPanelPage';
import { Container, Card, Grid, Button, Input, Spinner } from '../../design-system/components';

interface AnalyticsReport {
  totalRevenue: number;
  activeListings: {
    vehicles: number;
    drivers: number;
    total: number;
  };
  bookings: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
  topRatedProviders: Array<{
    companyId: string;
    companyName: string;
    rating: number;
    totalRatings: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: analytics, isLoading, error } = useQuery<AnalyticsReport>({
    queryKey: ['admin-analytics', startDate, endDate],
    queryFn: async () => {
      const validToken = await tokenManager.getValidToken();
      return apiClient.get<AnalyticsReport>(`/admin/analytics?startDate=${startDate}&endDate=${endDate}`, validToken);
    },
    enabled: !!user,
  });

  const handleApplyFilters = () => {
    // Query will automatically refetch due to queryKey change
  };

  if (isLoading) {
    return (
      <AdminPanelPage>
        <Container >
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        </Container>
      </AdminPanelPage>
    );
  }

  if (error) {
    return (
      <AdminPanelPage>
        <Container >
          <div className="bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-800">Failed to load analytics data</p>
          </div>
        </Container>
      </AdminPanelPage>
    );
  }

  return (
    <AdminPanelPage>
      <Container >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-neutral-900">Analytics Dashboard</h1>
          </div>

          {/* Date Range Filter */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Report Period</h2>
            <Grid cols={3} gap="md">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium ds-text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={setStartDate}
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium ds-text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={setEndDate}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleApplyFilters}
                >
                  Apply Filters
                </Button>
              </div>
            </Grid>
          </Card>

          {/* Key Metrics Cards */}
          <Grid cols={4} gap="lg">
            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium ds-text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">
                    {analytics?.totalRevenue.toLocaleString('nb-NO', {
                      style: 'currency',
                      currency: 'NOK',
                    })}
                  </p>
                </div>
                <div className="p-3 bg-success-100 rounded-full">
                  <svg className="w-8 h-8 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium ds-text-gray-600">Active Listings</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">{analytics?.activeListings.total}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {analytics?.activeListings.vehicles} vehicles, {analytics?.activeListings.drivers} drivers
                  </p>
                </div>
                <div className="p-3 bg-info-100 rounded-full">
                  <svg className="w-8 h-8 text-info-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium ds-text-gray-600">Total Bookings</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">{analytics?.bookings.total}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {analytics?.bookings.completed} completed
                  </p>
                </div>
                <div className="p-3 bg-primary-100 rounded-full">
                  <svg className="w-8 h-8 ds-text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </Card>

            <Card padding="lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium ds-text-gray-600">Active Bookings</p>
                  <p className="text-3xl font-bold text-neutral-900 mt-2">{analytics?.bookings.active}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {analytics?.bookings.pending} pending
                  </p>
                </div>
                <div className="p-3 bg-warning-100 rounded-full">
                  <svg className="w-8 h-8 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </Card>
          </Grid>

          {/* Bookings Status Chart */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Bookings by Status</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="ds-text-gray-600">Completed</span>
                  <span className="font-medium text-neutral-900">{analytics?.bookings.completed}</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-success-600 h-2 rounded-full"
                    style={{
                      width: `${analytics?.bookings.total ? (analytics.bookings.completed / analytics.bookings.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="ds-text-gray-600">Active</span>
                  <span className="font-medium text-neutral-900">{analytics?.bookings.active}</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-info-600 h-2 rounded-full"
                    style={{
                      width: `${analytics?.bookings.total ? (analytics.bookings.active / analytics.bookings.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="ds-text-gray-600">Pending</span>
                  <span className="font-medium text-neutral-900">{analytics?.bookings.pending}</span>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-warning-600 h-2 rounded-full"
                    style={{
                      width: `${analytics?.bookings.total ? (analytics.bookings.pending / analytics.bookings.total) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Top Rated Providers */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Top Rated Providers</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Total Reviews
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {analytics?.topRatedProviders.map((provider, index) => (
                    <tr key={provider.companyId} className="ds-hover-bg-page">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">{provider.companyName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-warning-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="ml-2 text-sm font-medium text-neutral-900">
                            {provider.rating.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {provider.totalRatings}
                      </td>
                    </tr>
                  ))}
                  {(!analytics?.topRatedProviders || analytics.topRatedProviders.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-neutral-500">
                        No rated providers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </Container>
    </AdminPanelPage>
  );
}
