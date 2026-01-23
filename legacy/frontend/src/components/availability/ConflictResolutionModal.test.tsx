/**
 * Tests for ConflictResolutionModal component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConflictResolutionModal from './ConflictResolutionModal';
import { EnhancedAuthProvider as AuthProvider } from '../../contexts/EnhancedAuthContext';
import * as apiClient from '../../services/api';

// Mock API client
vi.mock('../../services/api', () => ({
  apiClient: {
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../../contexts/EnhancedAuthContext', () => ({
  EnhancedAuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    token: 'mock-token',
    user: { id: '1', email: 'test@example.com', role: 'COMPANY_ADMIN' },
  }),
}));

describe('ConflictResolutionModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const mockConflict = {
    notificationId: 'notif-1',
    blockId: 'block-1',
    bookingId: 'booking-1',
    bookingNumber: 'BK-12345',
    listingId: 'listing-1',
    listingTitle: 'Test Vehicle',
    startDate: '2024-01-15',
    endDate: '2024-01-20',
    conflictType: 'block_vs_booking' as const,
  };

  const renderModal = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConflictResolutionModal
            isOpen={true}
            onClose={vi.fn()}
            conflict={mockConflict}
            {...props}
          />
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('renders conflict details', () => {
    renderModal();

    expect(screen.getByText('Resolve Availability Conflict')).toBeInTheDocument();
    expect(screen.getAllByText(/Test Vehicle/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/BK-12345/)[0]).toBeInTheDocument();
  });

  it('displays both resolution options when both IDs are present', () => {
    renderModal();

    expect(screen.getByText('Cancel the booking')).toBeInTheDocument();
    expect(screen.getByText('Remove the availability block')).toBeInTheDocument();
  });

  it('only displays cancel booking option when no block ID', () => {
    const conflictWithoutBlock = { ...mockConflict, blockId: undefined };
    renderModal({ conflict: conflictWithoutBlock });

    expect(screen.getByText('Cancel the booking')).toBeInTheDocument();
    expect(screen.queryByText('Remove the availability block')).not.toBeInTheDocument();
  });

  it('only displays remove block option when no booking ID', () => {
    const conflictWithoutBooking = {
      ...mockConflict,
      bookingId: undefined,
      bookingNumber: undefined,
    };
    renderModal({ conflict: conflictWithoutBooking });

    expect(screen.queryByText('Cancel the booking')).not.toBeInTheDocument();
    expect(screen.getByText('Remove the availability block')).toBeInTheDocument();
  });

  it('allows selecting cancel booking option', async () => {
    const user = userEvent.setup();
    renderModal();

    const cancelOption = screen.getByText('Cancel the booking').closest('button');
    await user.click(cancelOption!);

    // Check if the option is visually selected (has primary border color)
    expect(cancelOption).toHaveClass('ds-border-primary-600');
  });

  it('allows selecting remove block option', async () => {
    const user = userEvent.setup();
    renderModal();

    const removeOption = screen.getByText('Remove the availability block').closest('button');
    await user.click(removeOption!);

    // Check if the option is visually selected
    expect(removeOption).toHaveClass('ds-border-primary-600');
  });

  it('calls cancel booking API when resolving with cancel option', async () => {
    const user = userEvent.setup();
    const mockPut = vi.mocked(apiClient.apiClient.put);
    mockPut.mockResolvedValue({});

    renderModal();

    // Select cancel booking option
    const cancelOption = screen.getByText('Cancel the booking').closest('button');
    await user.click(cancelOption!);

    // Click resolve button
    const resolveButton = screen.getByRole('button', { name: /Resolve Conflict/i });
    await user.click(resolveButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/bookings/booking-1/cancel',
        { reason: 'Availability conflict' },
        'mock-token'
      );
    });
  });

  it('calls delete block API when resolving with remove option', async () => {
    const user = userEvent.setup();
    const mockDelete = vi.mocked(apiClient.apiClient.delete);
    mockDelete.mockResolvedValue({});

    renderModal();

    // Select remove block option
    const removeOption = screen.getByText('Remove the availability block').closest('button');
    await user.click(removeOption!);

    // Click resolve button
    const resolveButton = screen.getByRole('button', { name: /Resolve Conflict/i });
    await user.click(resolveButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/availability/blocks/block-1', 'mock-token');
    });
  });

  it('disables resolve button when no option is selected', () => {
    renderModal();

    const resolveButton = screen.getByRole('button', { name: /Resolve Conflict/i });
    expect(resolveButton).toBeDisabled();
  });

  it('enables resolve button when an option is selected', async () => {
    const user = userEvent.setup();
    renderModal();

    const resolveButton = screen.getByRole('button', { name: /Resolve Conflict/i });
    expect(resolveButton).toBeDisabled();

    // Select an option
    const cancelOption = screen.getByText('Cancel the booking').closest('button');
    await user.click(cancelOption!);

    expect(resolveButton).not.toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    // Get the Cancel button in the modal footer (not the "Cancel the booking" option)
    const cancelButton = screen.getByRole('button', { name: /^Cancel$/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose after successful resolution', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const mockDelete = vi.mocked(apiClient.apiClient.delete);
    mockDelete.mockResolvedValue({});

    renderModal({ onClose });

    // Select and resolve
    const removeOption = screen.getByText('Remove the availability block').closest('button');
    await user.click(removeOption!);

    const resolveButton = screen.getByRole('button', { name: /Resolve Conflict/i });
    await user.click(resolveButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays error message when resolution fails', async () => {
    const user = userEvent.setup();
    const mockDelete = vi.mocked(apiClient.apiClient.delete);
    mockDelete.mockRejectedValue(new Error('Failed to delete block'));

    renderModal();

    // Select and resolve
    const removeOption = screen.getByText('Remove the availability block').closest('button');
    await user.click(removeOption!);

    const resolveButton = screen.getByRole('button', { name: /Resolve Conflict/i });
    await user.click(resolveButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to delete block/i)).toBeInTheDocument();
    });
  });

  it('formats dates correctly', () => {
    renderModal();

    // Check that dates are formatted in a readable way (multiple instances are expected)
    expect(screen.getAllByText(/January 15, 2024/)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/January 20, 2024/)[0]).toBeInTheDocument();
  });
});
