/**
 * KPISection Component
 * Displays all KPI cards for both provider and renter metrics
 * 
 * Features:
 * - Provider metrics: revenue, fleet utilization, rating
 * - Renter metrics: spending, open bookings, upcoming bookings
 * - Responsive grid layout (1 col mobile, 2 col tablet, 3 col desktop)
 * - Icons for visual clarity
 * - Validates Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 7.2, 7.4
 */

import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Star, 
  ShoppingCart, 
  Clock, 
  Calendar 
} from 'lucide-react';
import { KPICard, formatCurrency, formatPercentage, formatRating, formatCount } from './KPICard';
import type { DashboardKPIs } from '../../hooks/useDashboardData';

export interface KPISectionProps {
  kpis: DashboardKPIs;
}

export const KPISection: React.FC<KPISectionProps> = ({ kpis }) => {
  const { provider, renter } = kpis;

  return (
    <div className="kpi-section">
      <h2 id="kpi-section-heading" className="text-xl font-semibold ds-text-gray-900 mb-4">
        Key Performance Indicators
      </h2>
      
      <div className="kpi-grid">
        {/* Provider Metrics */}
        <KPICard
          title="Total Revenue"
          value={formatCurrency(provider.totalRevenue30Days)}
          subtitle="Last 30 days"
          icon={DollarSign}
          iconColor="ds-text-success"
          aria-label={`Total revenue: ${formatCurrency(provider.totalRevenue30Days)} in the last 30 days`}
        />

        <KPICard
          title="Fleet Utilization"
          value={formatPercentage(provider.fleetUtilization)}
          subtitle="Active & upcoming bookings"
          icon={TrendingUp}
          iconColor="ds-text-primary"
          aria-label={`Fleet utilization: ${formatPercentage(provider.fleetUtilization)}`}
        />

        <KPICard
          title="Company Rating"
          value={provider.aggregatedRating !== null ? formatRating(provider.aggregatedRating) : 'N/A'}
          subtitle={provider.aggregatedRating !== null ? 'Average rating' : 'No ratings yet'}
          icon={Star}
          iconColor="ds-text-warning"
          aria-label={`Company rating: ${provider.aggregatedRating !== null ? formatRating(provider.aggregatedRating) : 'No ratings yet'}`}
        />

        {/* Renter Metrics */}
        <KPICard
          title="Total Spending"
          value={formatCurrency(renter.totalSpend30Days)}
          subtitle="Last 30 days"
          icon={ShoppingCart}
          iconColor="ds-text-error"
          aria-label={`Total spending: ${formatCurrency(renter.totalSpend30Days)} in the last 30 days`}
        />

        <KPICard
          title="Open Bookings"
          value={formatCount(renter.openBookingsCount)}
          subtitle="Pending status"
          icon={Clock}
          iconColor="ds-text-warning"
          aria-label={`Open bookings: ${formatCount(renter.openBookingsCount)} with pending status`}
        />

        <KPICard
          title="Upcoming Bookings"
          value={formatCount(renter.upcomingBookingsCount)}
          subtitle="Accepted & not yet active"
          icon={Calendar}
          iconColor="ds-text-primary"
          aria-label={`Upcoming bookings: ${formatCount(renter.upcomingBookingsCount)} accepted and not yet active`}
        />
      </div>

      <style>{`
        .kpi-section {
          width: 100%;
        }

        /* KPI Grid - Responsive */
        .kpi-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
        }

        /* Tablet: 768px - 1024px */
        @media (min-width: 768px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Desktop: > 1024px */
        @media (min-width: 1024px) {
          .kpi-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        /* Extra large screens: > 1440px */
        @media (min-width: 1440px) {
          .kpi-grid {
            grid-template-columns: repeat(6, 1fr);
          }
        }
      `}</style>
    </div>
  );
};
