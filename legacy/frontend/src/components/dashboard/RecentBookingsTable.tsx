/**
 * RecentBookingsTable Component
 * Displays the 5 most recent bookings with sorting functionality
 * 
 * Features:
 * - Display 5 most recent bookings with booking number, company name, listing title, status
 * - Table sorting functionality
 * - Click to navigate to booking details
 * - Uses design system Table component
 * - Responsive design with mobile card view
 * - Validates Requirements 3.4, 3.5, 7.4
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Badge } from '../../design-system/components';
import type { Column } from '../../design-system/components';
import type { OperationalSummary } from '../../hooks/useDashboardData';

export interface RecentBookingsTableProps {
  bookings: OperationalSummary['recentBookings'];
}

type BookingRow = OperationalSummary['recentBookings'][0];

/**
 * Get badge variant for booking status
 */
const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'COMPLETED':
    case 'CLOSED':
      return 'success';
    case 'ACTIVE':
      return 'info';
    case 'PENDING':
      return 'warning';
    case 'CANCELLED':
    case 'DISPUTED':
      return 'error';
    case 'ACCEPTED':
      return 'info';
    default:
      return 'info';
  }
};

/**
 * Format booking status for display
 */
const formatStatus = (status: string): string => {
  return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ');
};

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const RecentBookingsTable: React.FC<RecentBookingsTableProps> = ({ bookings }) => {
  const navigate = useNavigate();
  const [sortedBookings, setSortedBookings] = useState<BookingRow[]>(bookings);

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    const sorted = [...sortedBookings].sort((a, b) => {
      let aValue: any = a[key as keyof BookingRow];
      let bValue: any = b[key as keyof BookingRow];

      // Handle date sorting
      if (key === 'startDate') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setSortedBookings(sorted);
  };

  const columns: Column<BookingRow>[] = [
    {
      key: 'bookingNumber',
      header: 'Booking #',
      sortable: true,
      mobileLabel: 'Booking',
      render: (row) => (
        <button
          onClick={() => navigate(`/bookings/${row.id}`)}
          className="booking-link"
          aria-label={`View booking ${row.bookingNumber}`}
        >
          {row.bookingNumber}
        </button>
      ),
    },
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      mobileLabel: 'Company',
      render: (row) => (
        <span className="ds-text-gray-900">{row.companyName}</span>
      ),
    },
    {
      key: 'listingTitle',
      header: 'Listing',
      sortable: true,
      mobileLabel: 'Listing',
      render: (row) => (
        <span className="ds-text-gray-700">{row.listingTitle}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      mobileLabel: 'Role',
      render: (row) => (
        <span className="role-badge">
          {row.role === 'provider' ? 'Provider' : 'Renter'}
        </span>
      ),
    },
    {
      key: 'startDate',
      header: 'Start Date',
      sortable: true,
      mobileLabel: 'Start Date',
      render: (row) => (
        <span className="ds-text-gray-600">{formatDate(row.startDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      mobileLabel: 'Status',
      render: (row) => (
        <Badge
          variant={getStatusBadgeVariant(row.status)}
          size="sm"
        >
          {formatStatus(row.status)}
        </Badge>
      ),
    },
  ];

  if (bookings.length === 0) {
    return (
      <div className="empty-bookings">
        <p className="text-sm ds-text-gray-500 text-center py-8">
          No recent bookings to display
        </p>
      </div>
    );
  }

  return (
    <div className="recent-bookings-table">
      <Table
        columns={columns}
        data={sortedBookings}
        onSort={handleSort}
        rowKey={(row) => row.id}
        emptyMessage="No recent bookings"
      />

      <style>{`
        .recent-bookings-table {
          width: 100%;
        }

        .booking-link {
          color: var(--color-primary);
          font-weight: 500;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s ease;
        }

        .booking-link:hover {
          color: var(--color-primary-dark);
          text-decoration: underline;
        }

        .booking-link:focus {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
          border-radius: 2px;
        }

        .role-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: 0.25rem;
          background-color: var(--color-gray-100);
          color: var(--color-gray-700);
        }

        .empty-bookings {
          padding: 2rem 0;
        }

        /* Mobile optimizations - ensure touch targets and horizontal scrolling */
        @media (max-width: 767px) {
          .booking-link {
            min-height: 44px;
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 0;
          }

          .recent-bookings-table {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          /* Ensure table wrapper allows horizontal scrolling */
          .recent-bookings-table > div {
            min-width: 100%;
          }
        }

        /* Tablet optimizations */
        @media (min-width: 768px) and (max-width: 1023px) {
          .booking-link {
            min-height: 40px;
            display: inline-flex;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
};
