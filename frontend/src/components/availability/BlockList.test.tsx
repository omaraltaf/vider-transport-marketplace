import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BlockList } from './BlockList';
import { apiClient } from '../../services/api';

// Mock the API client
vi.mock('../../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('BlockList', () => {
  const mockOnBlockDeleted = vi.fn();

  const defaultProps = {
    listingId: 'test-listing-id',
    listingType: 'vehicle' as const,
    onBlockDeleted: mockOnBlockDeleted,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  const mockBlocks = [
    {
      id: 'block-1',
      listingId: 'test-listing-id',
      listingType: 'vehicle',
      startDate: '2024-12-15',
      endDate: '2024-12-20',
      reason: 'Maintenance',
      isRecurring: false,
      createdBy: 'user-1',
      createdAt: '2024-12-01T00:00:00Z',
      updatedAt: '2024-12-01T00:00:00Z',
    },
    {
      id: 'block-2',
      listingId: 'test-listing-id',
      listingType: 'vehicle',
      startDate: '2024-12-25',
      endDate: '2024-12-25',
      reason: 'Holiday',
      isRecurring: false,
      createdBy: 'user-1',
      createdAt: '2024-12-01T00:00:00Z',
      updatedAt: '2024-12-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('displays loading state initially', () => {
    vi.mocked(apiClient.get).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<BlockList {...defaultProps} />);

    expect(screen.getByText(/loading availability blocks/i)).toBeInTheDocument();
  });

  it('displays blocks when loaded successfully', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockBlocks);

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Blocked Dates')).toBeInTheDocument();
    });

    expect(screen.getByText(/maintenance/i)).toBeInTheDocument();
    expect(screen.getByText(/holiday/i)).toBeInTheDocument();
  });

  it('displays empty state when no blocks exist', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/no blocked dates/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/you haven't blocked any dates/i)
    ).toBeInTheDocument();
  });

  it('displays error state when fetch fails', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('displays delete button for each block', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockBlocks);

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(mockBlocks.length);
    });
  });

  it('shows "Past" badge for blocks in the past', async () => {
    const pastBlock = {
      ...mockBlocks[0],
      startDate: '2020-01-01',
      endDate: '2020-01-05',
    };

    vi.mocked(apiClient.get).mockResolvedValue([pastBlock]);

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Past')).toBeInTheDocument();
    });
  });

  it('shows "Recurring" badge for recurring blocks', async () => {
    const recurringBlock = {
      ...mockBlocks[0],
      isRecurring: true,
      recurringBlockId: 'recurring-1',
    };

    vi.mocked(apiClient.get).mockResolvedValue([recurringBlock]);

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Recurring')).toBeInTheDocument();
    });
  });

  it('formats date ranges correctly', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockBlocks);

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      // Check for formatted date range
      expect(screen.getByText(/Dec 15, 2024 - Dec 20, 2024/i)).toBeInTheDocument();
    });
  });

  it('displays single date when start and end are the same', async () => {
    const singleDayBlock = {
      ...mockBlocks[1],
      startDate: '2025-01-15',
      endDate: '2025-01-15',
    };
    
    vi.mocked(apiClient.get).mockResolvedValue([singleDayBlock]);

    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      // Should show single date, not a range
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument();
    });
    
    // Verify it doesn't show as a range
    const dateRange = screen.getByText('Jan 15, 2025');
    expect(dateRange.textContent).toBe('Jan 15, 2025');
    expect(dateRange.textContent).not.toContain(' - ');
  });

  it('requires authentication token', async () => {
    // Mock localStorage to return null for auth_token
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
    
    render(<BlockList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
    });
  });
});
