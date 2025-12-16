/**
 * Company Admin Dashboard Page
 * Main command center for company administrators
 * Displays KPIs, actionable items, operations, and profile status
 * 
 * Performance optimizations:
 * - React.memo for dashboard sections to prevent unnecessary re-renders
 * - useMemo for expensive calculations
 * - Code splitting for below-the-fold sections
 */

import { Component, useEffect, useMemo, memo, lazy, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import Navbar from '../components/Navbar';
import { Container, Card, Stack, Skeleton, Button } from '../design-system/components';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useToast } from '../contexts/ToastContext';
import { KPISection } from '../components/dashboard/KPISection';
import { ActionableItemsList } from '../components/dashboard/ActionableItemsList';

// Code splitting for below-the-fold sections
const OperationsSummary = lazy(() => import('../components/dashboard/OperationsSummary').then(m => ({ default: m.OperationsSummary })));
const RecentBookingsTable = lazy(() => import('../components/dashboard/RecentBookingsTable').then(m => ({ default: m.RecentBookingsTable })));
const ProfileStatus = lazy(() => import('../components/dashboard/ProfileStatus').then(m => ({ default: m.ProfileStatus })));

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DashboardErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card padding="md" className="ds-bg-error-light border ds-border-error">
            <Stack direction="horizontal" spacing={3} align="start">
              <AlertCircle className="h-5 w-5 ds-text-error flex-shrink-0" />
              <Stack spacing={1}>
                <h3 className="text-sm font-medium ds-text-error">
                  Something went wrong
                </h3>
                <p className="text-sm ds-text-error">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </Stack>
            </Stack>
          </Card>
        )
      );
    }

    return this.props.children;
  }
}

// Section Skeleton Loaders - Memoized to prevent re-renders
const KPISectionSkeleton = memo(() => (
  <div className="dashboard-section">
    <Skeleton variant="text" width="200px" height="28px" className="mb-4" />
    <div className="kpi-grid">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} padding="md">
          <Stack spacing={2}>
            <Skeleton variant="text" width="120px" height="16px" />
            <Skeleton variant="text" width="80px" height="32px" />
            <Skeleton variant="text" width="100px" height="14px" />
          </Stack>
        </Card>
      ))}
    </div>
  </div>
));
KPISectionSkeleton.displayName = 'KPISectionSkeleton';

const ActionableItemsSectionSkeleton = memo(() => (
  <div className="dashboard-section">
    <Skeleton variant="text" width="200px" height="28px" className="mb-4" />
    <Card padding="md">
      <Stack spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <Stack direction="horizontal" spacing={3} align="center">
              <Skeleton variant="circle" width={40} height={40} />
              <Stack spacing={1} className="flex-1">
                <Skeleton variant="text" width="60%" height="16px" />
                <Skeleton variant="text" width="80%" height="14px" />
              </Stack>
            </Stack>
          </div>
        ))}
      </Stack>
    </Card>
  </div>
));
ActionableItemsSectionSkeleton.displayName = 'ActionableItemsSectionSkeleton';

const OperationsSectionSkeleton = memo(() => (
  <div className="dashboard-section">
    <Skeleton variant="text" width="200px" height="28px" className="mb-4" />
    <Stack spacing={4}>
      <Card padding="md">
        <Stack spacing={3}>
          <Skeleton variant="text" width="150px" height="20px" />
          <Stack direction="horizontal" spacing={4}>
            <Skeleton variant="text" width="100px" height="16px" />
            <Skeleton variant="text" width="100px" height="16px" />
          </Stack>
        </Stack>
      </Card>
      <Card padding="md">
        <Stack spacing={3}>
          <Skeleton variant="text" width="150px" height="20px" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangle" width="100%" height="60px" />
          ))}
        </Stack>
      </Card>
    </Stack>
  </div>
));
OperationsSectionSkeleton.displayName = 'OperationsSectionSkeleton';

const ProfileSectionSkeleton = memo(() => (
  <div className="dashboard-section">
    <Skeleton variant="text" width="200px" height="28px" className="mb-4" />
    <Card padding="md">
      <Stack spacing={3}>
        <Skeleton variant="text" width="180px" height="20px" />
        <Skeleton variant="rectangle" width="100%" height="20px" />
        <Skeleton variant="text" width="100%" height="14px" />
        <Skeleton variant="text" width="100%" height="14px" />
      </Stack>
    </Card>
  </div>
));
ProfileSectionSkeleton.displayName = 'ProfileSectionSkeleton';

// Error Display Component with Retry - Memoized
interface ErrorDisplayProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = memo(({ title, message, onRetry }) => (
  <Card padding="md" className="ds-bg-error-light border ds-border-error">
    <Stack spacing={3}>
      <Stack direction="horizontal" spacing={3} align="start">
        <AlertCircle className="h-5 w-5 ds-text-error flex-shrink-0" />
        <Stack spacing={1} className="flex-1">
          <h3 className="text-sm font-medium ds-text-error">{title}</h3>
          <p className="text-sm ds-text-error">{message}</p>
        </Stack>
      </Stack>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="w-full"
          aria-label="Retry loading data"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </Stack>
  </Card>
));
ErrorDisplay.displayName = 'ErrorDisplay';

// Main Dashboard Component
export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardData();
  const { showToast } = useToast();

  // Memoize expensive calculations
  const hasActionableItems = useMemo(() => {
    return data?.actionableItems && data.actionableItems.length > 0;
  }, [data?.actionableItems]);

  const hasRecentBookings = useMemo(() => {
    return data?.operations?.recentBookings && data.operations.recentBookings.length > 0;
  }, [data?.operations?.recentBookings]);

  const profileNeedsAttention = useMemo(() => {
    return data?.profile && (data.profile.completeness < 100 || !data.profile.verified);
  }, [data?.profile]);

  // Show toast notification for critical errors
  useEffect(() => {
    if (error) {
      showToast(
        'Failed to load dashboard data. Some sections may not be available.',
        'error',
        7000
      );
    }
  }, [error, showToast]);

  return (
    <div className="min-h-screen ds-bg-page">
      {/* Skip Link for Keyboard Navigation */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <Navbar />
      
      <Container>
        <div className="dashboard-container">
          {/* Page Header */}
          <div className="dashboard-header">
            <h1 id="main-content" className="text-3xl font-bold ds-text-gray-900" tabIndex={-1}>
              Dashboard
            </h1>
            <p className="mt-1 text-sm ds-text-gray-500">
              Welcome to your company command center
            </p>
          </div>

          {/* Dashboard Grid Layout */}
          <div className="dashboard-grid">
            {/* KPI Section */}
            <DashboardErrorBoundary>
              {isLoading ? (
                <KPISectionSkeleton />
              ) : error ? (
                <div className="dashboard-section">
                  <ErrorDisplay
                    title="Failed to load KPI data"
                    message={error instanceof Error ? error.message : 'An unexpected error occurred'}
                    onRetry={() => refetch()}
                  />
                </div>
              ) : data ? (
                <div className="dashboard-section" role="region" aria-labelledby="kpi-section-heading">
                  <KPISection kpis={data.kpis} />
                </div>
              ) : null}
            </DashboardErrorBoundary>

            {/* Actionable Items Section */}
            <DashboardErrorBoundary>
              {isLoading ? (
                <ActionableItemsSectionSkeleton />
              ) : error ? (
                <div className="dashboard-section">
                  <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">
                    Action Required
                  </h2>
                  <ErrorDisplay
                    title="Failed to load actionable items"
                    message={error instanceof Error ? error.message : 'An unexpected error occurred'}
                    onRetry={() => refetch()}
                  />
                </div>
              ) : data ? (
                <div className="dashboard-section" role="region" aria-labelledby="actionable-items-heading">
                  <h2 id="actionable-items-heading" className="text-xl font-semibold ds-text-gray-900 mb-4">
                    Action Required
                  </h2>
                  <ActionableItemsList items={data.actionableItems} />
                </div>
              ) : null}
            </DashboardErrorBoundary>

            {/* Operations Section - Code Split */}
            <DashboardErrorBoundary>
              {isLoading ? (
                <OperationsSectionSkeleton />
              ) : error ? (
                <div className="dashboard-section">
                  <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">
                    Operations
                  </h2>
                  <ErrorDisplay
                    title="Failed to load operations data"
                    message={error instanceof Error ? error.message : 'An unexpected error occurred'}
                    onRetry={() => refetch()}
                  />
                </div>
              ) : data ? (
                <Suspense fallback={<OperationsSectionSkeleton />}>
                  <div className="dashboard-section" role="region" aria-labelledby="operations-heading">
                    <h2 id="operations-heading" className="text-xl font-semibold ds-text-gray-900 mb-4">
                      Operations
                    </h2>
                    <Stack spacing={4}>
                      <OperationsSummary operations={data.operations} />
                      
                      {/* Recent Bookings */}
                      <Card padding="md">
                        <Stack spacing={3}>
                          <h3 id="recent-bookings-heading" className="text-lg font-semibold ds-text-gray-900">
                            Recent Bookings
                          </h3>
                          <RecentBookingsTable bookings={data.operations.recentBookings} />
                        </Stack>
                      </Card>
                    </Stack>
                  </div>
                </Suspense>
              ) : null}
            </DashboardErrorBoundary>

            {/* Profile Section - Code Split */}
            <DashboardErrorBoundary>
              {isLoading ? (
                <ProfileSectionSkeleton />
              ) : error ? (
                <div className="dashboard-section">
                  <h2 className="text-xl font-semibold ds-text-gray-900 mb-4">
                    Profile Status
                  </h2>
                  <ErrorDisplay
                    title="Failed to load profile data"
                    message={error instanceof Error ? error.message : 'An unexpected error occurred'}
                    onRetry={() => refetch()}
                  />
                </div>
              ) : data ? (
                <Suspense fallback={<ProfileSectionSkeleton />}>
                  <div className="dashboard-section" role="region" aria-labelledby="profile-status-heading">
                    <h2 id="profile-status-heading" className="text-xl font-semibold ds-text-gray-900 mb-4">
                      Profile Status
                    </h2>
                    <ProfileStatus profile={data.profile} />
                  </div>
                </Suspense>
              ) : null}
            </DashboardErrorBoundary>
          </div>
        </div>
      </Container>

      <style>{`
        /* Skip Link Styles - Hidden until focused */
        .skip-link {
          position: absolute;
          top: -40px;
          left: 0;
          background: var(--color-primary);
          color: white;
          padding: 0.5rem 1rem;
          text-decoration: none;
          border-radius: 0 0 0.25rem 0;
          z-index: 100;
          font-weight: 500;
          transition: top 0.2s ease;
        }

        .skip-link:focus {
          top: 0;
          outline: 2px solid var(--color-primary-dark);
          outline-offset: 2px;
        }

        /* Ensure main content heading can receive focus */
        #main-content:focus {
          outline: none;
        }

        /* Visible focus indicators for all interactive elements */
        button:focus-visible,
        a:focus-visible,
        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible,
        [role="button"]:focus-visible {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
          border-radius: 0.25rem;
        }

        .dashboard-container {
          padding-top: 2rem;
          padding-bottom: 2rem;
        }

        .dashboard-header {
          margin-bottom: 2rem;
        }

        .dashboard-grid {
          display: grid;
          gap: 2rem;
          grid-template-columns: 1fr;
        }

        .dashboard-section {
          width: 100%;
        }

        /* KPI Grid - Responsive */
        .kpi-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }

        /* Mobile: < 768px - Single column layout */
        @media (max-width: 767px) {
          .dashboard-container {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }

          .dashboard-header {
            margin-bottom: 1.5rem;
          }

          .dashboard-header h1 {
            font-size: 1.5rem; /* 24px */
          }

          .dashboard-grid {
            gap: 1.5rem;
          }

          .kpi-grid {
            gap: 0.75rem;
          }

          /* Ensure all interactive elements have minimum 44x44px touch targets */
          button, a, [role="button"] {
            min-height: 44px;
            min-width: 44px;
          }

          /* Optimize card padding for mobile */
          .dashboard-section h2 {
            font-size: 1.25rem; /* 20px */
          }
        }

        /* Tablet: 768px - 1024px - Two column layout */
        @media (min-width: 768px) and (max-width: 1023px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.5rem;
          }

          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          /* KPI section spans full width on tablet */
          .dashboard-section:first-child {
            grid-column: 1 / -1;
          }

          /* Actionable items and operations side by side */
          .dashboard-section:nth-child(2),
          .dashboard-section:nth-child(3) {
            grid-column: span 1;
          }

          /* Profile takes full width */
          .dashboard-section:nth-child(4) {
            grid-column: 1 / -1;
          }
        }

        /* Desktop: > 1024px - Multi-column grid layout */
        @media (min-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }

          /* KPI section spans full width on desktop */
          .dashboard-section:first-child {
            grid-column: 1 / -1;
          }

          /* Actionable items takes 2 columns */
          .dashboard-section:nth-child(2) {
            grid-column: span 2;
          }

          /* Operations takes 1 column */
          .dashboard-section:nth-child(3) {
            grid-column: span 1;
          }

          /* Profile takes full width */
          .dashboard-section:nth-child(4) {
            grid-column: 1 / -1;
          }
        }

        /* Extra large screens: > 1440px */
        @media (min-width: 1440px) {
          .kpi-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }

        /* Ensure horizontal scrolling for tables on mobile */
        @media (max-width: 767px) {
          .dashboard-section table {
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }

        /* Print styles */
        @media print {
          .dashboard-grid {
            display: block;
          }

          .dashboard-section {
            page-break-inside: avoid;
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
