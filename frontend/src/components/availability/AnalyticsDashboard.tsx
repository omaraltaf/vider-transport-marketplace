import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Card } from '../../design-system/components/Card';
import { Button } from '../../design-system/components/Button';
import { Spinner } from '../../design-system/components/Spinner';
import { Badge } from '../../design-system/components/Badge';
import styles from './AnalyticsDashboard.module.css';

export interface AnalyticsData {
  totalDays: number;
  blockedDays: number;
  bookedDays: number;
  availableDays: number;
  blockedPercentage: number;
  utilizationRate: number;
}

export interface AnalyticsDashboardProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  className?: string;
}

type TimePeriod = 'week' | 'month' | 'year';

const AnalyticsDashboardComponent: React.FC<AnalyticsDashboardProps> = ({
  listingId,
  listingType,
  className = '',
}) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Calculate date range based on time period - memoized for performance
  const getDateRange = useCallback((period: TimePeriod): { startDate: Date; endDate: Date } => {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case 'year':
        startDate.setDate(endDate.getDate() - 365);
        break;
    }

    return { startDate, endDate };
  }, []);

  // Fetch analytics data with pagination support for large datasets
  const fetchAnalytics = useCallback(async (period: TimePeriod, page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(period);
      const token = localStorage.getItem('auth_token');

      // Add pagination for large time periods (year)
      const pageSize = period === 'year' ? 30 : 100; // Limit data points for performance
      
      const response = await fetch(
        `/api/availability/analytics/${listingId}?listingType=${listingType}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&page=${page}&pageSize=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics || data);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [listingId, listingType, getDateRange]);

  // Fetch analytics when component mounts or time period changes
  useEffect(() => {
    fetchAnalytics(timePeriod, 1);
    setCurrentPage(1); // Reset to first page when period changes
  }, [fetchAnalytics, timePeriod]);

  // Handle time period change - memoized for performance
  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setTimePeriod(period);
  }, []);

  // Handle page change for pagination
  const handlePageChange = useCallback((page: number) => {
    fetchAnalytics(timePeriod, page);
  }, [fetchAnalytics, timePeriod]);

  // Memoized calculations for expensive operations
  const calculatedMetrics = useMemo(() => {
    if (!analytics) return null;

    return {
      utilizationColor: analytics.utilizationRate >= 80 ? '#10b981' : 
                       analytics.utilizationRate >= 50 ? '#3b82f6' : '#f59e0b',
      blockedPercentageColor: analytics.blockedPercentage > 30 ? '#ef4444' : '#10b981',
      dashArrayValue: analytics.utilizationRate * 2.51,
      availableNonBlockedDays: analytics.totalDays - analytics.blockedDays,
    };
  }, [analytics]);

  // Render loading state
  if (loading) {
    return (
      <Card className={`${styles.dashboard} ${className}`} padding="lg">
        <div className={styles.loadingContainer}>
          <Spinner size="lg" />
          <p>Loading analytics...</p>
        </div>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={`${styles.dashboard} ${className}`} padding="lg">
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>Error: {error}</p>
          <Button onClick={() => fetchAnalytics(timePeriod)} variant="primary" size="sm">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // Render no data state
  if (!analytics) {
    return (
      <Card className={`${styles.dashboard} ${className}`} padding="lg">
        <p>No analytics data available</p>
      </Card>
    );
  }

  return (
    <Card className={`${styles.dashboard} ${className}`} padding="lg">
      {/* Header with time period selector */}
      <div className={styles.header}>
        <h2 className={styles.title}>Availability Analytics</h2>
        <div className={styles.periodSelector}>
          <Button
            variant={timePeriod === 'week' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePeriodChange('week')}
          >
            Week
          </Button>
          <Button
            variant={timePeriod === 'month' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePeriodChange('month')}
          >
            Month
          </Button>
          <Button
            variant={timePeriod === 'year' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => handlePeriodChange('year')}
          >
            Year
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Total Days</div>
          <div className={styles.summaryValue}>{analytics.totalDays}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Blocked Days</div>
          <div className={styles.summaryValue}>{analytics.blockedDays}</div>
          <Badge variant="warning" size="sm">
            {analytics.blockedPercentage.toFixed(1)}%
          </Badge>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Booked Days</div>
          <div className={styles.summaryValue}>{analytics.bookedDays}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Available Days</div>
          <div className={styles.summaryValue}>{analytics.availableDays}</div>
        </div>
      </div>

      {/* Blocked Days Percentage Chart */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>Blocked Days Percentage</h3>
        <div className={styles.chartContainer}>
          <div className={styles.barChart}>
            <div
              className={styles.barFill}
              style={{ width: `${analytics.blockedPercentage}%` }}
              role="img"
              aria-label={`${analytics.blockedPercentage.toFixed(1)}% of days are blocked`}
            >
              <span className={styles.barLabel}>
                {analytics.blockedPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.blocked}`} />
              <span>Blocked ({analytics.blockedDays} days)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.available}`} />
              <span>Available ({calculatedMetrics?.availableNonBlockedDays || 0} days)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booked vs Available Days Chart */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>Booked vs Available Days</h3>
        <div className={styles.chartContainer}>
          <div className={styles.comparisonChart}>
            <div className={styles.comparisonBar}>
              <div className={styles.comparisonLabel}>Booked</div>
              <div className={styles.comparisonBarContainer}>
                <div
                  className={`${styles.comparisonBarFill} ${styles.booked}`}
                  style={{
                    width: analytics.availableDays > 0
                      ? `${(analytics.bookedDays / analytics.availableDays) * 100}%`
                      : '0%',
                  }}
                  role="img"
                  aria-label={`${analytics.bookedDays} booked days`}
                />
                <span className={styles.comparisonValue}>{analytics.bookedDays}</span>
              </div>
            </div>
            <div className={styles.comparisonBar}>
              <div className={styles.comparisonLabel}>Available</div>
              <div className={styles.comparisonBarContainer}>
                <div
                  className={`${styles.comparisonBarFill} ${styles.available}`}
                  style={{ width: '100%' }}
                  role="img"
                  aria-label={`${analytics.availableDays} available days`}
                />
                <span className={styles.comparisonValue}>{analytics.availableDays}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization Rate */}
      <div className={styles.chartSection}>
        <h3 className={styles.chartTitle}>Utilization Rate</h3>
        <div className={styles.chartContainer}>
          <div className={styles.utilizationDisplay}>
            <div className={styles.utilizationCircle}>
              <svg viewBox="0 0 100 100" className={styles.utilizationSvg}>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={styles.utilizationBackground}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={styles.utilizationForeground}
                  style={{
                    strokeDasharray: `${calculatedMetrics?.dashArrayValue || 0} 251`,
                  }}
                />
              </svg>
              <div className={styles.utilizationText}>
                <span className={styles.utilizationValue}>
                  {analytics.utilizationRate.toFixed(1)}%
                </span>
                <span className={styles.utilizationLabel}>Utilized</span>
              </div>
            </div>
            <div className={styles.utilizationDescription}>
              <p>
                {analytics.bookedDays} out of {analytics.availableDays} available days are booked
              </p>
              {analytics.utilizationRate < 50 && (
                <Badge variant="warning" size="sm">
                  Low utilization
                </Badge>
              )}
              {analytics.utilizationRate >= 50 && analytics.utilizationRate < 80 && (
                <Badge variant="info" size="sm">
                  Moderate utilization
                </Badge>
              )}
              {analytics.utilizationRate >= 80 && (
                <Badge variant="success" size="sm">
                  High utilization
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className={styles.insights}>
        <h3 className={styles.insightsTitle}>Insights</h3>
        <ul className={styles.insightsList}>
          {analytics.blockedPercentage > 30 && (
            <li className={styles.insightItem}>
              <Badge variant="warning" size="sm">
                High Block Rate
              </Badge>
              <span>
                Over 30% of days are blocked. Consider reducing blocked days to increase booking
                opportunities.
              </span>
            </li>
          )}
          {analytics.utilizationRate < 40 && analytics.availableDays > 0 && (
            <li className={styles.insightItem}>
              <Badge variant="info" size="sm">
                Low Utilization
              </Badge>
              <span>
                Utilization is below 40%. Consider adjusting pricing or marketing to increase
                bookings.
              </span>
            </li>
          )}
          {analytics.utilizationRate >= 80 && (
            <li className={styles.insightItem}>
              <Badge variant="success" size="sm">
                High Demand
              </Badge>
              <span>
                Your listing has high utilization! Consider increasing rates or adding more
                listings.
              </span>
            </li>
          )}
          {analytics.availableDays === 0 && (
            <li className={styles.insightItem}>
              <Badge variant="error" size="sm">
                No Availability
              </Badge>
              <span>
                All days in this period are blocked. Consider unblocking some dates to allow
                bookings.
              </span>
            </li>
          )}
        </ul>
      </div>

      {/* Pagination for large datasets */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
};

// Memoized AnalyticsDashboard component for performance
export const AnalyticsDashboard = memo(AnalyticsDashboardComponent, (prevProps, nextProps) => {
  return (
    prevProps.listingId === nextProps.listingId &&
    prevProps.listingType === nextProps.listingType &&
    prevProps.className === nextProps.className
  );
});

AnalyticsDashboard.displayName = 'AnalyticsDashboard';
