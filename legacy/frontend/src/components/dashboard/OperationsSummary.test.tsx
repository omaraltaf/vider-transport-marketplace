import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { OperationsSummary } from './OperationsSummary';
import type { OperationalSummary } from '../../hooks/useDashboardData';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('OperationsSummary Component', () => {
  const mockOperations: OperationalSummary = {
    listings: {
      availableCount: 12,
      suspendedCount: 3,
    },
    recentBookings: [],
    billing: {
      hasInvoices: true,
      latestInvoicePath: 'uploads/invoices/invoice-123.pdf',
    },
  };

  it('should display listing counts', () => {
    renderWithRouter(<OperationsSummary operations={mockOperations} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
  });

  it('should navigate to listings page when available count is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OperationsSummary operations={mockOperations} />);

    const availableButton = screen.getByRole('button', { name: /view 12 available listings/i });
    await user.click(availableButton);

    expect(mockNavigate).toHaveBeenCalledWith('/listings/vehicles');
  });

  it('should navigate to suspended listings when suspended count is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OperationsSummary operations={mockOperations} />);

    const suspendedButton = screen.getByRole('button', { name: /view 3 suspended listings/i });
    await user.click(suspendedButton);

    expect(mockNavigate).toHaveBeenCalledWith('/listings/vehicles?status=suspended');
  });

  it('should navigate to new listing page when create button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OperationsSummary operations={mockOperations} />);

    const createButton = screen.getByRole('button', { name: /create new listing/i });
    await user.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/listings/vehicles/new');
  });

  it('should display billing section with invoice buttons', () => {
    renderWithRouter(<OperationsSummary operations={mockOperations} />);

    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all invoices and receipts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download latest invoice/i })).toBeInTheDocument();
  });

  it('should navigate to billing page when view all invoices is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<OperationsSummary operations={mockOperations} />);

    const viewAllButton = screen.getByRole('button', { name: /view all invoices and receipts/i });
    await user.click(viewAllButton);

    expect(mockNavigate).toHaveBeenCalledWith('/billing');
  });

  it('should show no invoices message when no invoices exist', () => {
    const noInvoicesOperations: OperationalSummary = {
      ...mockOperations,
      billing: {
        hasInvoices: false,
        latestInvoicePath: null,
      },
    };

    renderWithRouter(<OperationsSummary operations={noInvoicesOperations} />);

    expect(screen.getByText(/no invoices available yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download latest invoice/i })).not.toBeInTheDocument();
  });

  it('should not show download button when no latest invoice path', () => {
    const noLatestInvoiceOperations: OperationalSummary = {
      ...mockOperations,
      billing: {
        hasInvoices: true,
        latestInvoicePath: null,
      },
    };

    renderWithRouter(<OperationsSummary operations={noLatestInvoiceOperations} />);

    expect(screen.queryByRole('button', { name: /download latest invoice/i })).not.toBeInTheDocument();
  });

  it('should have proper ARIA labels for accessibility', () => {
    renderWithRouter(<OperationsSummary operations={mockOperations} />);

    expect(screen.getByRole('button', { name: /view 12 available listings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view 3 suspended listings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create new listing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all invoices and receipts/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download latest invoice/i })).toBeInTheDocument();
  });
});
