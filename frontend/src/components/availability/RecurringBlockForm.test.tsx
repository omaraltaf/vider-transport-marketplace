/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecurringBlockForm } from './RecurringBlockForm';
import { apiClient } from '../../services/api';

// Mock the API client
vi.mock('../../services/api', () => ({
  apiClient: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });
}

describe('RecurringBlockForm', () => {
  const mockOnBlockCreated = vi.fn();
  const mockOnBlockUpdated = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    listingId: 'listing-123',
    listingType: 'vehicle' as const,
    onBlockCreated: mockOnBlockCreated,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('Create Mode', () => {
    it('renders the form with all required fields', () => {
      render(<RecurringBlockForm {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Create Recurring Block' })).toBeInTheDocument();
      expect(screen.getByText('Days of Week')).toBeInTheDocument();
      expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
      expect(screen.getByText('Set end date (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason (Optional)')).toBeInTheDocument();
    });

    it('renders all days of the week as checkboxes', () => {
      render(<RecurringBlockForm {...defaultProps} />);

      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('allows selecting and deselecting days of the week', () => {
      render(<RecurringBlockForm {...defaultProps} />);

      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      expect(mondayCheckbox).not.toBeChecked();

      if (mondayCheckbox) {
        fireEvent.click(mondayCheckbox);
        expect(mondayCheckbox).toBeChecked();

        fireEvent.click(mondayCheckbox);
        expect(mondayCheckbox).not.toBeChecked();
      }
    });

    it('shows validation error when no days are selected', async () => {
      render(<RecurringBlockForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: 'Create Recurring Block' });
      const form = submitButton.closest('form');
      
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('Select at least one day of the week')).toBeInTheDocument();
      });
    });

    it('shows validation error when start date is missing', async () => {
      render(<RecurringBlockForm {...defaultProps} />);

      // Select a day
      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      if (mondayCheckbox) {
        fireEvent.click(mondayCheckbox);
      }

      const submitButton = screen.getByRole('button', { name: 'Create Recurring Block' });
      const form = submitButton.closest('form');
      
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
      });
    });

    it('shows preview of recurring instances', async () => {
      render(<RecurringBlockForm {...defaultProps} />);

      // Select Monday
      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      if (mondayCheckbox) {
        fireEvent.click(mondayCheckbox);
      }

      // Set start date
      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      await waitFor(() => {
        expect(screen.getByText('Preview (Next 4 weeks)')).toBeInTheDocument();
      });
    });

    it('allows toggling end date field', () => {
      render(<RecurringBlockForm {...defaultProps} />);

      const endDateToggle = screen.getByText('Set end date (optional)').closest('label')?.querySelector('input');
      expect(endDateToggle).not.toBeChecked();

      if (endDateToggle) {
        fireEvent.click(endDateToggle);
        expect(endDateToggle).toBeChecked();
        expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
      }
    });

    it('validates end date is after start date', async () => {
      render(<RecurringBlockForm {...defaultProps} />);

      // Select a day
      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      if (mondayCheckbox) {
        fireEvent.click(mondayCheckbox);
      }

      // Set dates
      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });

      // Enable end date
      const endDateToggle = screen.getByText('Set end date (optional)').closest('label')?.querySelector('input');
      if (endDateToggle) {
        fireEvent.click(endDateToggle);
      }

      const endDateInput = screen.getByLabelText(/End Date/);
      fireEvent.change(endDateInput, { target: { value: '2024-01-10' } });

      const submitButton = screen.getByRole('button', { name: 'Create Recurring Block' });
      const form = submitButton.closest('form');
      
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('End date must be after or equal to start date')).toBeInTheDocument();
      });
    });

    it('submits form successfully with valid data', async () => {
      const mockResponse = {
        recurringBlock: {
          id: 'block-123',
          listingId: 'listing-123',
          listingType: 'vehicle',
          daysOfWeek: [1, 3, 5],
          startDate: '2024-01-01',
          reason: 'Weekly maintenance',
          createdBy: 'user-123',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      render(<RecurringBlockForm {...defaultProps} />);

      // Select days
      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      const wednesdayCheckbox = screen.getByText('Wed').closest('label')?.querySelector('input');
      const fridayCheckbox = screen.getByText('Fri').closest('label')?.querySelector('input');

      if (mondayCheckbox) fireEvent.click(mondayCheckbox);
      if (wednesdayCheckbox) fireEvent.click(wednesdayCheckbox);
      if (fridayCheckbox) fireEvent.click(fridayCheckbox);

      // Set start date
      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Set reason
      const reasonInput = screen.getByLabelText('Reason (Optional)');
      fireEvent.change(reasonInput, { target: { value: 'Weekly maintenance' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Create Recurring Block' });
      const form = submitButton.closest('form');
      
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/availability/recurring',
          {
            listingId: 'listing-123',
            listingType: 'vehicle',
            daysOfWeek: [1, 3, 5],
            startDate: '2024-01-01',
            endDate: undefined,
            reason: 'Weekly maintenance',
          },
          'mock-token'
        );
        expect(mockOnBlockCreated).toHaveBeenCalledWith(mockResponse.recurringBlock);
      });
    });

    it('handles API errors gracefully', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'));

      render(<RecurringBlockForm {...defaultProps} />);

      // Select a day and set start date
      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      if (mondayCheckbox) fireEvent.click(mondayCheckbox);

      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Create Recurring Block/i });
      const form = submitButton.closest('form');
      
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('calls onCancel when cancel button is clicked', () => {
      render(<RecurringBlockForm {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const existingBlock = {
      id: 'block-123',
      listingId: 'listing-123',
      listingType: 'vehicle' as const,
      daysOfWeek: [1, 3, 5],
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-12-31T00:00:00Z',
      reason: 'Weekly maintenance',
      createdBy: 'user-123',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('renders in edit mode with existing data', () => {
      render(
        <RecurringBlockForm
          {...defaultProps}
          mode="edit"
          existingBlock={existingBlock}
          onBlockUpdated={mockOnBlockUpdated}
        />
      );

      expect(screen.getByText('Edit Recurring Block')).toBeInTheDocument();
      expect(screen.getByText('Update Scope')).toBeInTheDocument();

      // Check that days are pre-selected
      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      const wednesdayCheckbox = screen.getByText('Wed').closest('label')?.querySelector('input');
      const fridayCheckbox = screen.getByText('Fri').closest('label')?.querySelector('input');

      expect(mondayCheckbox).toBeChecked();
      expect(wednesdayCheckbox).toBeChecked();
      expect(fridayCheckbox).toBeChecked();
    });

    it('shows update scope options', () => {
      render(
        <RecurringBlockForm
          {...defaultProps}
          mode="edit"
          existingBlock={existingBlock}
          onBlockUpdated={mockOnBlockUpdated}
        />
      );

      expect(screen.getByText('Future instances only')).toBeInTheDocument();
      expect(screen.getByText('All instances')).toBeInTheDocument();
    });

    it('shows delete button in edit mode', () => {
      render(
        <RecurringBlockForm
          {...defaultProps}
          mode="edit"
          existingBlock={existingBlock}
          onBlockUpdated={mockOnBlockUpdated}
        />
      );

      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('shows delete confirmation when delete is clicked', () => {
      render(
        <RecurringBlockForm
          {...defaultProps}
          mode="edit"
          existingBlock={existingBlock}
          onBlockUpdated={mockOnBlockUpdated}
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(screen.getByText('Delete Recurring Block?')).toBeInTheDocument();
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    it('submits update with correct scope', async () => {
      const mockResponse = {
        recurringBlock: { ...existingBlock, reason: 'Updated reason' },
      };

      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      render(
        <RecurringBlockForm
          {...defaultProps}
          mode="edit"
          existingBlock={existingBlock}
          onBlockUpdated={mockOnBlockUpdated}
        />
      );

      // Change reason - use input event for textarea
      const reasonInput = screen.getByLabelText('Reason (Optional)') as HTMLTextAreaElement;
      fireEvent.input(reasonInput, { target: { value: 'Updated reason' } });

      // Select "All instances"
      const allInstancesRadio = screen.getByLabelText('All instances');
      fireEvent.click(allInstancesRadio);

      // Submit
      const submitButton = screen.getByRole('button', { name: /Update Recurring Block/i });
      const form = submitButton.closest('form');
      
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(apiClient.put).toHaveBeenCalledWith(
          '/availability/recurring/block-123',
          expect.objectContaining({
            listingId: 'listing-123',
            listingType: 'vehicle',
            daysOfWeek: [1, 3, 5],
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            reason: 'Updated reason',
            updateScope: 'all',
          }),
          'mock-token'
        );
        expect(mockOnBlockUpdated).toHaveBeenCalledWith(mockResponse.recurringBlock);
      }, { timeout: 5000 });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<RecurringBlockForm {...defaultProps} />);

      expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
      expect(screen.getByLabelText('Reason (Optional)')).toBeInTheDocument();
    });

    it('shows required indicator for required fields', () => {
      render(<RecurringBlockForm {...defaultProps} />);

      const daysLabel = screen.getByText('Days of Week');
      expect(daysLabel.parentElement?.textContent).toContain('*');
    });

    it('displays error messages with role="alert"', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Test error'));

      render(<RecurringBlockForm {...defaultProps} />);

      // Select a day and set start date
      const mondayCheckbox = screen.getByText('Mon').closest('label')?.querySelector('input');
      if (mondayCheckbox) fireEvent.click(mondayCheckbox);

      const startDateInput = screen.getByLabelText(/Start Date/);
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Create Recurring Block/i });
      const form = submitButton.closest('form');
      
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent('Test error');
      }, { timeout: 5000 });
    });
  });
});
