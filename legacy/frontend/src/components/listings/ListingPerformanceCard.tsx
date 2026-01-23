/**
 * Listing Performance Card Component
 * Displays performance metrics for vehicle and driver listings using real database data
 */

import React from 'react';
import { Card, Badge } from '../../design-system/components';
import type { ListingPerformanceMetrics } from '../../types/listing-performance.types';

interface ListingPerformanceCardProps {
  metrics: ListingPerformanceMetrics;
  listingTitle: string;
  className?: string;
}

export const ListingPerformanceCard: React.FC<ListingPerformanceCardProps> = ({
  metrics,
  listingTitle,
  className = '',
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getUtilizationBadgeVariant = (rate: number): 'success' | 'warning' | 'error' | 'info' | 'neutral' => {
    if (rate >= 70) return 'success';
    if (rate >= 40) return 'warning';
    if (rate >= 20) return 'error';
    return 'neutral';
  };

  const getRatingDisplay = () => {
    if (metrics.averageRating === null || metrics.totalReviews === 0) {
      return 'No ratings yet';
    }
    return `${metrics.averageRating.toFixed(1)} ★ (${metrics.totalReviews} reviews)`;
  };

  return (
    <Card padding="lg" className={className}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold ds-text-gray-900 truncate">
              {listingTitle}
            </h3>
            <p className="text-sm ds-text-gray-500 capitalize">
              {metrics.listingType} listing
            </p>
          </div>
          <Badge 
            variant={getUtilizationBadgeVariant(metrics.utilizationRate)}
            size="sm"
          >
            {formatPercentage(metrics.utilizationRate)} utilized
          </Badge>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Bookings */}
          <div className="text-center p-3 ds-bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold ds-text-gray-900">
              {metrics.totalBookings}
            </div>
            <div className="text-xs ds-text-gray-500">Total Bookings</div>
          </div>

          {/* Completed Bookings */}
          <div className="text-center p-3 ds-bg-green-50 rounded-lg">
            <div className="text-2xl font-bold ds-text-green-700">
              {metrics.completedBookings}
            </div>
            <div className="text-xs ds-text-gray-500">Completed</div>
          </div>

          {/* Total Revenue */}
          <div className="text-center p-3 ds-bg-blue-50 rounded-lg">
            <div className="text-lg font-bold ds-text-blue-700">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="text-xs ds-text-gray-500">Total Revenue</div>
          </div>

          {/* Average Booking Value */}
          <div className="text-center p-3 ds-bg-purple-50 rounded-lg">
            <div className="text-lg font-bold ds-text-purple-700">
              {formatCurrency(metrics.averageBookingValue)}
            </div>
            <div className="text-xs ds-text-gray-500">Avg. Booking</div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="space-y-2 pt-2 border-t ds-border-gray-200">
          {/* Rating */}
          <div className="flex justify-between items-center">
            <span className="text-sm ds-text-gray-600">Rating:</span>
            <span className="text-sm font-medium ds-text-gray-900">
              {getRatingDisplay()}
            </span>
          </div>

          {/* Cancellation Rate */}
          {metrics.totalBookings > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm ds-text-gray-600">Cancellation Rate:</span>
              <span className="text-sm font-medium ds-text-gray-900">
                {formatPercentage((metrics.cancelledBookings / metrics.totalBookings) * 100)}
              </span>
            </div>
          )}

          {/* Completion Rate */}
          {metrics.totalBookings > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm ds-text-gray-600">Completion Rate:</span>
              <span className="text-sm font-medium ds-text-green-700">
                {formatPercentage((metrics.completedBookings / metrics.totalBookings) * 100)}
              </span>
            </div>
          )}
        </div>

        {/* Performance Indicator */}
        <div className="pt-2 border-t ds-border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm ds-text-gray-600">Performance:</span>
            <div className="flex items-center space-x-2">
              {metrics.utilizationRate >= 70 && (
                <span className="text-sm font-medium ds-text-green-700">Excellent</span>
              )}
              {metrics.utilizationRate >= 40 && metrics.utilizationRate < 70 && (
                <span className="text-sm font-medium ds-text-yellow-700">Good</span>
              )}
              {metrics.utilizationRate >= 20 && metrics.utilizationRate < 40 && (
                <span className="text-sm font-medium ds-text-orange-700">Fair</span>
              )}
              {metrics.utilizationRate < 20 && (
                <span className="text-sm font-medium ds-text-red-700">Needs Attention</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ListingPerformanceCard;