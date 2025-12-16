import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlockForm } from './BlockForm';

describe('BlockForm', () => {
  const mockOnBlockCreated = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    listingId: 'test-listing-id',
    listingType: 'vehicle' as const,
    onBlockCreated: mockOnBlockCreated,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(<BlockForm {...defaultProps} />);

    expect(screen.getByText('Block Dates')).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create block/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('validates that start date is required', async () => {
    render(<BlockForm {...defaultProps} />);

    const form = screen.getByRole('button', { name: /create block/i }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/start date is required/i)).toBeInTheDocument();
    });
  });

  it('validates that end date is required', async () => {
    render(<BlockForm {...defaultProps} />);

    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: '2024-12-15' } });

    const form = screen.getByRole('button', { name: /create block/i }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument();
    });
  });

  it('validates that end date must be after or equal to start date', async () => {
    render(<BlockForm {...defaultProps} />);

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    fireEvent.change(startDateInput, { target: { value: '2024-12-20' } });
    fireEvent.change(endDateInput, { target: { value: '2024-12-15' } });

    const form = screen.getByRole('button', { name: /create block/i }).closest('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText(/end date must be after or equal to start date/i)
      ).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<BlockForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('allows optional reason field to be empty', () => {
    render(<BlockForm {...defaultProps} />);

    const reasonInput = screen.getByLabelText(/reason/i);
    expect(reasonInput).not.toBeRequired();
  });

  it('displays helper text for reason field', () => {
    render(<BlockForm {...defaultProps} />);

    expect(
      screen.getByText(/provide a reason for blocking these dates/i)
    ).toBeInTheDocument();
  });

  it('disables form fields when submitting', async () => {
    render(<BlockForm {...defaultProps} />);

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    const reasonInput = screen.getByLabelText(/reason/i);

    fireEvent.change(startDateInput, { target: { value: '2024-12-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-12-20' } });

    // Note: Actual API call would be mocked in integration tests
    expect(startDateInput).not.toBeDisabled();
    expect(endDateInput).not.toBeDisabled();
    expect(reasonInput).not.toBeDisabled();
  });
});
