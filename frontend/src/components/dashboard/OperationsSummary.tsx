/**
 * OperationsSummary Component
 * Displays listing counts and quick access links for operations management
 * 
 * Features:
 * - Display listing counts (available, suspended) with links to listings pages
 * - Links to create new listings
 * - Links to billing page and invoice download
 * - Uses design system components
 * - Validates Requirements 3.1, 3.2, 3.3, 3.6, 3.7, 7.4
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Stack, Button } from '../../design-system/components';
import { Plus, FileText, Download, Package } from 'lucide-react';
import type { OperationalSummary } from '../../hooks/useDashboardData';

export interface OperationsSummaryProps {
  operations: OperationalSummary;
}

export const OperationsSummary: React.FC<OperationsSummaryProps> = ({ operations }) => {
  const navigate = useNavigate();

  const handleDownloadInvoice = () => {
    if (operations.billing.latestInvoicePath) {
      // Create a download link
      const link = document.createElement('a');
      link.href = `/${operations.billing.latestInvoicePath}`;
      link.download = operations.billing.latestInvoicePath.split('/').pop() || 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Stack spacing={4}>
      {/* Listings Summary Card */}
      <Card padding="md">
        <Stack spacing={3}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold ds-text-gray-900 flex items-center gap-2">
              <Package className="h-5 w-5 ds-text-primary" aria-hidden="true" />
              Listings
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/listings/vehicles/new')}
              aria-label="Create new listing"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              New Listing
            </Button>
          </div>

          <div className="listings-stats">
            <button
              onClick={() => navigate('/listings/vehicles')}
              className="listing-stat-button"
              aria-label={`View ${operations.listings.availableCount} available listings`}
            >
              <div className="listing-stat-value ds-text-success">
                {operations.listings.availableCount}
              </div>
              <div className="listing-stat-label ds-text-gray-600">
                Available
              </div>
            </button>

            <button
              onClick={() => navigate('/listings/vehicles?status=suspended')}
              className="listing-stat-button"
              aria-label={`View ${operations.listings.suspendedCount} suspended listings`}
            >
              <div className="listing-stat-value ds-text-warning">
                {operations.listings.suspendedCount}
              </div>
              <div className="listing-stat-label ds-text-gray-600">
                Suspended
              </div>
            </button>
          </div>
        </Stack>
      </Card>

      {/* Billing Card */}
      <Card padding="md">
        <Stack spacing={3}>
          <h3 className="text-lg font-semibold ds-text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 ds-text-primary" aria-hidden="true" />
            Billing
          </h3>

          <Stack spacing={2}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/billing')}
              className="w-full justify-start"
              aria-label="View all invoices and receipts"
            >
              <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
              View All Invoices & Receipts
            </Button>

            {operations.billing.hasInvoices && operations.billing.latestInvoicePath && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadInvoice}
                className="w-full justify-start"
                aria-label="Download latest invoice"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Download Latest Invoice
              </Button>
            )}

            {!operations.billing.hasInvoices && (
              <p className="text-sm ds-text-gray-500 text-center py-2">
                No invoices available yet
              </p>
            )}
          </Stack>
        </Stack>
      </Card>

      <style>{`
        .listings-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        .listing-stat-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          background: var(--color-gray-50);
          border: 1px solid var(--color-gray-200);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 80px;
        }

        .listing-stat-button:hover {
          background: var(--color-gray-100);
          border-color: var(--color-primary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .listing-stat-button:focus {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }

        .listing-stat-button:active {
          transform: translateY(0);
        }

        .listing-stat-value {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .listing-stat-label {
          font-size: 0.875rem;
          font-weight: 500;
        }

        /* Mobile optimizations - ensure touch targets are at least 44x44px */
        @media (max-width: 767px) {
          .listings-stats {
            gap: 0.75rem;
          }

          .listing-stat-button {
            min-height: 44px;
            min-width: 44px;
            padding: 0.75rem 0.5rem;
          }

          .listing-stat-value {
            font-size: 1.5rem;
          }

          .listing-stat-label {
            font-size: 0.75rem;
          }
        }

        /* Tablet optimizations */
        @media (min-width: 768px) and (max-width: 1023px) {
          .listing-stat-button {
            min-height: 70px;
          }

          .listing-stat-value {
            font-size: 1.75rem;
          }
        }

        /* Desktop optimizations */
        @media (min-width: 1024px) {
          .listings-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </Stack>
  );
};
