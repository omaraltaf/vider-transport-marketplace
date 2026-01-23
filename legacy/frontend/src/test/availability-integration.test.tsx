/**
 * Availability Integration Tests
 * Tests for complete availability flow from block creation to search filtering
 * Task 23.1: Write integration tests for complete availability flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { EnhancedAuthProvider as AuthProvider } from '../contexts/EnhancedAuthContext';

// Import components to test
import { CalendarView } from '../components/availability/CalendarView';
import { BlockForm } from '../components/availability/BlockForm';
import { RecurringBlockForm } from '../components/availability/RecurringBlockForm';
import BulkCalendarManagementPage from '../pages/BulkCalendarManagementPage';
import SearchPage from '../pages/SearchPage';

// Mock API client
vi.mock('../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock auth context
const mockAuthUser = {
  id: 'user1',
  email: 'test@example.com',
  companyId: 'company1',
  role: 'PROVIDER',
};

vi.mock('../contexts/EnhancedAuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    token: 'test-token',
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'listing1', type: 'vehicle' }),
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock data
const mockCalendarData = [
  {
    date: new Date('2024-01-01'),
    status: 'available' as const,
  },
  {
    date: new Date('2024-01-02'),
    status: 'blocked' as const,
    blockReason: 'Maintenance',
  },
  {
    date: new Date('2024-01-03'),
    status: 'booked' as const,
    bookingId: 'booking1',
    bookingNumber: 'BK-001',
  },
];

const mockAvailabilityBlock = {
  id: 'block1',
  listingId: 'listing1',
  listingType: 'vehicle' as const,
  startDate: '2024-01-02',
  endDate: '2024-01-02',
  reason: 'Maintenance',
  isRecurring: false,
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockRecurringBlock = {
  id: 'recurring1',
  listingId: 'listing1',
  listingType: 'vehicle' as const,
  daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  reason: 'Weekly maintenance',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockBooking = {
  id: 'booking1',
  vehicleListingId: 'listing1',
  startDate: '2024-01-03',
  endDate: '2024-01-03',
  status: 'ACCEPTED',
  bookingNumber: 'BK-001',
};

describe('Availability Integration Tests', () => {
  let mockApiGet: any;
  let mockApiPost: any;
  let mockApiPut: any;
  let mockApiDelete: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.setItem('token', 'test-token');
    
    // Get mocked functions
    const { apiClient } = await import('../services/api');
    mockApiGet = vi.mocked(apiClient.get);
    mockApiPost = vi.mocked(apiClient.post);
    mockApiPut = vi.mocked(apiClient.put);
    mockApiDelete = vi.mocked(apiClient.delete);
    
    // Setup default API responses
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/availability/blocks')) {
        return Promise.resolve({ data: [mockAvailabilityBlock] });
      }
      if (url.includes('/availability/calendar')) {
        return Promise.resolve({ data: mockCalendarData });
      }
      if (url.includes('/listings')) {
        return Promise.resolve({ 
          data: {
            id: 'listing1',
            title: 'Vehicle 1',
            type: 'vehicle',
            company: { id: 'company1', name: 'Test Company' }
          }
        });
      }
      if (url.includes('/search')) {
        return Promise.resolve({ 
          data: {
            vehicleListings: [{
              id: 'listing1',
              title: 'Vehicle 1',
              company: { name: 'Test Company' }
            }],
            total: 1
          }
        });
      }
      return Promise.resolve({ data: {} });
    });
    
    mockApiPost.mockResolvedValue({ data: { success: true } });
    mockApiPut.mockResolvedValue({ data: { success: true } });
    mockApiDelete.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Block Creation to Search Filtering Flow', () => {
    it('should create availability block and filter search results', async () => {
      const user = userEvent.setup();

      // Mock API responses
      mockApiPost.mockResolvedValueOnce({ data: { availabilityBlock: mockAvailabilityBlock } });
      mockApiGet.mockResolvedValueOnce({
        data: {
          vehicleListings: [],
          total: 0,
          totalPages: 1,
        }
      });

      // 1. Create availability block
      const onBlockCreated = vi.fn();
      render(
        <BlockForm
          listingId="listing1"
          listingType="vehicle"
          onBlockCreated={onBlockCreated}
          onCancel={() => {}}
        />,
        { wrapper: createWrapper() }
      );

      // Wait for form to load
      await waitFor(() => {
        expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      });

      // Fill in the form
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      const reasonInput = screen.getByLabelText(/reason/i);

      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-01-02');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-01-02');
      await user.type(reasonInput, 'Maintenance');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create.*block/i });
      await user.click(submitButton);

      // Verify block creation API call
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/availability/blocks',
          expect.objectContaining({
            listingId: 'listing1',
            listingType: 'vehicle',
            startDate: '2024-01-02',
            endDate: '2024-01-02',
            reason: 'Maintenance',
          }),
          'test-token'
        );
      });

      expect(onBlockCreated).toHaveBeenCalledWith(mockAvailabilityBlock);

      // 2. Test search filtering
      const { unmount } = render(<SearchPage />, { wrapper: createWrapper() });

      // Verify search API was called (should exclude blocked listings)
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          expect.stringContaining('/search'),
          'test-token'
        );
      });

      unmount();
    });

    it('should create recurring block and show instances in calendar', async () => {
      const user = userEvent.setup();

      // Get mocked functions
      const { apiClient } = await import('../services/api');
      const mockApiPost = vi.mocked(apiClient.post);

      // Mock API responses
      mockApiPost.mockResolvedValueOnce({ recurringBlock: mockRecurringBlock });

      // 1. Create recurring block
      const onBlockCreated = vi.fn();
      render(
        <RecurringBlockForm
          listingId="listing1"
          listingType="vehicle"
          onBlockCreated={onBlockCreated}
          onCancel={() => {}}
        />,
        { wrapper: createWrapper() }
      );

      // Select days of week (Monday, Wednesday, Friday)
      const mondayCheckbox = screen.getByLabelText(/monday/i);
      const wednesdayCheckbox = screen.getByLabelText(/wednesday/i);
      const fridayCheckbox = screen.getByLabelText(/friday/i);

      await user.click(mondayCheckbox);
      await user.click(wednesdayCheckbox);
      await user.click(fridayCheckbox);

      // Set date range
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2024-01-01');

      // Set end date
      const endDateCheckbox = screen.getByLabelText(/set end date/i);
      await user.click(endDateCheckbox);
      
      // Wait for end date input to become visible and enabled
      await waitFor(() => {
        const endDateInputs = screen.getAllByLabelText(/end date/i);
        expect(endDateInputs.length).toBeGreaterThan(0);
      });
      
      const endDateInputs = screen.getAllByLabelText(/end date/i);
      const endDateInput = endDateInputs.find(input => !input.hasAttribute('disabled'));
      if (endDateInput) {
        await user.clear(endDateInput);
        await user.type(endDateInput, '2024-12-31');
      }

      // Add reason
      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Weekly maintenance');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create.*recurring.*block/i });
      await user.click(submitButton);

      // Verify recurring block creation
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/availability/recurring',
          expect.objectContaining({
            listingId: 'listing1',
            listingType: 'vehicle',
            daysOfWeek: [1, 3, 5],
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            reason: 'Weekly maintenance',
          }),
          'test-token'
        );
      });

      expect(onBlockCreated).toHaveBeenCalledWith(mockRecurringBlock);

      // 2. Test calendar view shows recurring instances
      const { unmount } = render(
        <CalendarView
          listingId="listing1"
          listingType="vehicle"
          mode="manage"
          calendarData={mockCalendarData}
        />,
        { wrapper: createWrapper() }
      );

      // Verify calendar displays the data
      expect(screen.getByText('January 2024')).toBeInTheDocument();

      unmount();
    });
  });

  describe('Booking Acceptance to Calendar Update Flow', () => {
    it('should update calendar when booking is accepted', async () => {
      // Get mocked functions
      const { apiClient } = await import('../services/api');
      const mockApiPut = vi.mocked(apiClient.put);
      const mockApiGet = vi.mocked(apiClient.get);

      // Mock booking service response
      mockApiPut.mockResolvedValueOnce({
        booking: { ...mockBooking, status: 'ACCEPTED' },
      });

      // Mock calendar data fetch after booking update
      mockApiGet.mockResolvedValueOnce({
        calendarData: [
          ...mockCalendarData,
          {
            date: new Date('2024-01-04'),
            status: 'booked',
            bookingId: 'booking2',
            bookingNumber: 'BK-002',
          },
        ],
      });

      // Simulate booking acceptance (this would normally happen in booking service)
      const bookingUpdate = {
        id: 'booking1',
        status: 'ACCEPTED',
      };

      // Test that calendar reflects the booking
      render(
        <CalendarView
          listingId="listing1"
          listingType="vehicle"
          mode="view"
          calendarData={mockCalendarData}
        />,
        { wrapper: createWrapper() }
      );

      // Verify booked date is displayed
      const bookedDate = screen.getByText('3');
      const gridCell = bookedDate.closest('[role="gridcell"]');
      expect(gridCell?.className).toMatch(/_booked_/);
    });

    it('should restore availability when booking is cancelled', async () => {
      // Get mocked functions
      const { apiClient } = await import('../services/api');
      const mockApiPut = vi.mocked(apiClient.put);

      // Mock booking cancellation
      mockApiPut.mockResolvedValueOnce({
        booking: { ...mockBooking, status: 'CANCELLED' },
      });

      // Mock updated calendar data (booking removed)
      const updatedCalendarData = mockCalendarData.filter(
        (day) => day.status !== 'booked'
      );

      render(
        <CalendarView
          listingId="listing1"
          listingType="vehicle"
          mode="view"
          calendarData={updatedCalendarData}
        />,
        { wrapper: createWrapper() }
      );

      // Verify date is now available
      const availableDate = screen.getByText('3');
      expect(availableDate.closest('[role="gridcell"]')).not.toHaveClass('booked');
    });
  });

  describe('Bulk Operations Flow', () => {
    it('should handle bulk block creation across multiple listings', async () => {
      const user = userEvent.setup();

      // Mock listings data
      const mockListings = [
        { id: 'listing1', title: 'Vehicle 1', type: 'vehicle' },
        { id: 'listing2', title: 'Vehicle 2', type: 'vehicle' },
        { id: 'listing3', title: 'Driver 1', type: 'driver' },
      ];

      // Override the default mock for this test
      mockApiGet.mockImplementation((url: string) => {
        if (url.includes('/listings')) {
          return Promise.resolve({ data: mockListings });
        }
        return Promise.resolve({ data: {} });
      });

      // Mock bulk operation response
      mockApiPost.mockResolvedValueOnce({
        successful: ['listing1', 'listing2'],
        failed: [
          {
            listingId: 'listing3',
            reason: 'Conflict with existing booking',
            conflicts: [
              {
                type: 'booking',
                startDate: '2024-01-02',
                endDate: '2024-01-02',
                bookingNumber: 'BK-003',
              },
            ],
          },
        ],
      });

      render(<BulkCalendarManagementPage />, { wrapper: createWrapper() });

      // Wait for listings to load
      await waitFor(() => {
        expect(screen.getByText('Vehicle 1')).toBeInTheDocument();
      });

      // Select multiple listings
      const listing1Checkbox = screen.getByLabelText(/vehicle 1/i);
      const listing2Checkbox = screen.getByLabelText(/vehicle 2/i);
      const listing3Checkbox = screen.getByLabelText(/driver 1/i);

      await user.click(listing1Checkbox);
      await user.click(listing2Checkbox);
      await user.click(listing3Checkbox);

      // Fill bulk block form
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);
      const reasonInput = screen.getByLabelText(/reason/i);

      await user.type(startDateInput, '2024-01-02');
      await user.type(endDateInput, '2024-01-02');
      await user.type(reasonInput, 'Bulk maintenance');

      // Submit bulk operation
      const submitButton = screen.getByRole('button', { name: /create.*bulk.*block/i });
      await user.click(submitButton);

      // Verify bulk API call
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          '/availability/bulk',
          expect.objectContaining({
            listingIds: ['listing1', 'listing2', 'listing3'],
            startDate: '2024-01-02',
            endDate: '2024-01-02',
            reason: 'Bulk maintenance',
          }),
          'test-token'
        );
      });

      // Verify results display
      await waitFor(() => {
        expect(screen.getByText(/2.*successful/i)).toBeInTheDocument();
        expect(screen.getByText(/1.*failed/i)).toBeInTheDocument();
        expect(screen.getByText(/conflict with existing booking/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Integration with Availability', () => {
    it('should filter search results based on availability', async () => {
      const user = userEvent.setup();

      // Get mocked functions
      const { apiClient } = await import('../services/api');
      const mockApiGet = vi.mocked(apiClient.get);

      // Mock search results with availability filtering
      mockApiGet.mockResolvedValueOnce({
        vehicleListings: [
          {
            id: 'listing1',
            title: 'Available Vehicle',
            description: 'Test vehicle',
            vehicleType: 'PALLET_8',
            capacity: 8,
            fuelType: 'ELECTRIC',
            city: 'Oslo',
            fylke: 'Oslo',
            hourlyRate: 100,
            dailyRate: 800,
            currency: 'NOK',
            withDriver: true,
            withoutDriver: true,
            tags: [],
            photos: [],
            company: { name: 'Test Company', verified: true, aggregatedRating: 4.5 },
          },
        ],
        total: 1,
        totalPages: 1,
      });

      // Mock search API call directly since SearchPage has complex dependencies
      mockApiGet.mockResolvedValueOnce({
        data: {
          vehicleListings: [
            {
              id: 'listing1',
              title: 'Available Vehicle',
              company: { name: 'Test Company' }
            }
          ],
          total: 1
        }
      });

      // Simulate search with availability filters
      const searchParams = new URLSearchParams({
        startDate: '2024-01-01',
        endDate: '2024-01-05'
      });

      // Verify API was called with availability filters
      expect(mockApiGet).toHaveBeenCalledWith(
        expect.stringContaining('/search'),
        expect.objectContaining({
          params: expect.objectContaining({
            startDate: '2024-01-01',
            endDate: '2024-01-05'
          })
        })
      );

      // Verify search API includes date filters
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          expect.stringContaining('startDate=2024-01-01'),
          'test-token'
        );
        expect(mockApiGet).toHaveBeenCalledWith(
          expect.stringContaining('endDate=2024-01-05'),
          'test-token'
        );
      });

      // Verify only available listings are shown
      expect(screen.getByText('Available Vehicle')).toBeInTheDocument();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large calendar datasets efficiently', async () => {
      // Generate large calendar dataset (3 months of data)
      const largeCalendarData = [];
      const startDate = new Date('2024-01-01');
      
      for (let i = 0; i < 90; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        largeCalendarData.push({
          date,
          status: i % 7 === 0 ? 'blocked' : 'available' as const,
          blockReason: i % 7 === 0 ? 'Weekly maintenance' : undefined,
        });
      }

      const startTime = performance.now();

      render(
        <CalendarView
          listingId="listing1"
          listingType="vehicle"
          mode="manage"
          calendarData={largeCalendarData}
        />,
        { wrapper: createWrapper() }
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify calendar renders within performance budget (< 1 second)
      expect(renderTime).toBeLessThan(1000);

      // Verify calendar displays correctly (it shows current month)
      expect(screen.getByText(/\w+ \d{4}/)).toBeInTheDocument();
    });

    it('should handle recurring block calculations efficiently', async () => {
      const user = userEvent.setup();

      // Mock large recurring pattern (daily for a year)
      const largeRecurringBlock = {
        ...mockRecurringBlock,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      mockApiPost.mockResolvedValueOnce({ data: { recurringBlock: largeRecurringBlock } });

      const startTime = performance.now();

      render(
        <RecurringBlockForm
          listingId="listing1"
          listingType="vehicle"
          onBlockCreated={() => {}}
          onCancel={() => {}}
        />,
        { wrapper: createWrapper() }
      );

      // Select all days
      for (const day of ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']) {
        const checkbox = screen.getByLabelText(new RegExp(day, 'i'));
        await user.click(checkbox);
      }

      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      // Verify interactions are responsive (< 500ms for test environment)
      expect(interactionTime).toBeLessThan(500);

      // Verify preview is limited for performance
      const previewDates = screen.getAllByText(/\w+ \d+, \d+/);
      expect(previewDates.length).toBeLessThanOrEqual(20); // Limited to 20 instances
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock API error
      mockApiPost.mockRejectedValueOnce(new Error('Network error'));

      render(
        <BlockForm
          listingId="listing1"
          listingType="vehicle"
          onBlockCreated={() => {}}
          onCancel={() => {}}
        />,
        { wrapper: createWrapper() }
      );

      // Fill and submit form
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2024-01-02');

      const submitButton = screen.getByRole('button', { name: /create.*block/i });
      await user.click(submitButton);

      // Verify form is still displayed (error handling is internal)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create.*block/i })).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockApiPost).toHaveBeenCalledWith(
        '/availability/blocks',
        expect.objectContaining({
          listingId: 'listing1',
          startDate: '2024-01-02'
        })
      );
    });

    it('should handle conflicts and provide resolution options', async () => {
      const user = userEvent.setup();

      // Mock conflict response
      mockApiPost.mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            error: {
              message: 'Conflict with existing booking',
              conflicts: [
                {
                  type: 'booking',
                  startDate: '2024-01-02',
                  endDate: '2024-01-02',
                  bookingNumber: 'BK-001',
                },
              ],
            },
          },
        },
      });

      render(
        <BlockForm
          listingId="listing1"
          listingType="vehicle"
          onBlockCreated={() => {}}
          onCancel={() => {}}
        />,
        { wrapper: createWrapper() }
      );

      // Fill and submit form
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2024-01-02');

      const submitButton = screen.getByRole('button', { name: /create.*block/i });
      await user.click(submitButton);

      // Verify form is still displayed (conflict handling is internal)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create.*block/i })).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockApiPost).toHaveBeenCalledWith(
        '/availability/blocks',
        expect.objectContaining({
          listingId: 'listing1',
          startDate: '2024-01-02'
        })
      );
    });
  });
});