/**
 * Bulk Calendar Management Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import BulkCalendarManagementPage from './BulkCalendarManagementPage';
import * as api from '../services/api';

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock Navbar
vi.mock('../components/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

// Mock useAuth hook
vi.mock('../contexts/EnhancedAuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'test@example.com',
      role: 'COMPANY_ADMIN',
      companyId: 'company-1',
      firstName: 'Test',
      lastName: 'User',
      phone: '12345678',
      emailVerified: true,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    token: 'test-token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  }),
}));

const mockVehicleListings = [
  {
    id: 'vehicle-1',
    companyId: 'company-1',
    title: 'Test Vehicle 1',
    description: 'Test description',
    vehicleType: 'PALLET_8',
    capacity: 8,
    fuelType: 'DIESEL',
    location: { city: 'Oslo', fylke: 'Oslo', kommune: 'Oslo' },
    pricing: { hourlyRate: 500, dailyRate: 4000, currency: 'NOK' },
    serviceOfferings: { withDriver: true, withoutDriver: true },
    photos: [],
    tags: [],
    status: 'ACTIVE',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: 'vehicle-2',
    companyId: 'company-1',
    title: 'Test Vehicle 2',
    description: 'Test description 2',
    vehicleType: 'PALLET_18',
    capacity: 18,
    fuelType: 'ELECTRIC',
    location: { city: 'Bergen', fylke: 'Vestland', kommune: 'Bergen' },
    pricing: { hourlyRate: 600, dailyRate: 5000, currency: 'NOK' },
    serviceOfferings: { withDriver: false, withoutDriver: true },
    photos: [],
    tags: [],
    status: 'ACTIVE',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const mockDriverListings = [
  {
    id: 'driver-1',
    companyId: 'company-1',
    name: 'Test Driver 1',
    licenseClass: 'CE',
    languages: ['Norwegian', 'English'],
    pricing: { hourlyRate: 300, dailyRate: 2400, currency: 'NOK' },
    verified: true,
    status: 'ACTIVE',
    totalRatings: 0,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('BulkCalendarManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API responses
    vi.mocked(api.apiClient.get).mockImplementation((endpoint: string) => {
      if (endpoint === '/listings/vehicles') {
        return Promise.resolve(mockVehicleListings);
      }
      if (endpoint === '/listings/drivers') {
        return Promise.resolve(mockDriverListings);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  it('renders the page title and description', async () => {
    renderWithProviders(<BulkCalendarManagementPage />);

    expect(screen.getByText('Bulk Calendar Management')).toBeInTheDocument();
    expect(screen.getByText('Block dates for multiple listings at once')).toBeInTheDocument();
  });

  it('displays loading state while fetching listings', () => {
    renderWithProviders(<BulkCalendarManagementPage />);

    expect(screen.getByText('Loading listings...')).toBeInTheDocument();
  });

  it('displays vehicle and driver listings after loading', async () => {
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Vehicle 1')).toBeInTheDocument();
      expect(screen.getByText('Test Vehicle 2')).toBeInTheDocument();
      expect(screen.getByText('Test Driver 1')).toBeInTheDocument();
    });
  });

  it('shows selection count badge', async () => {
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });
  });

  it('allows selecting listings', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Vehicle 1')).toBeInTheDocument();
    });

    // Click on the first vehicle checkbox
    const checkbox = screen.getAllByRole('checkbox')[0];
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });
  });

  it('allows selecting all vehicles', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Vehicle 1')).toBeInTheDocument();
    });

    // Click "Select All" for vehicles
    const selectAllButton = screen.getAllByText('Select All')[0];
    await user.click(selectAllButton);

    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });
  });

  it('displays the bulk block creation form', async () => {
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Block Dates')).toBeInTheDocument();
    });

    expect(screen.getByText(/Start Date/)).toBeInTheDocument();
    expect(screen.getByText(/End Date/)).toBeInTheDocument();
    expect(screen.getByText('Reason (Optional)')).toBeInTheDocument();
  });

  it('disables submit button when no listings are selected', async () => {
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Vehicle 1')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /Create Blocks for 0 Listing/i });
    expect(submitButton).toBeDisabled();
  });

  it('validates date range', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Vehicle 1')).toBeInTheDocument();
    });

    // Select a listing
    const checkbox = screen.getAllByRole('checkbox')[0];
    await user.click(checkbox);

    // Verify the submit button is enabled when a listing is selected
    const submitButton = screen.getByRole('button', { name: /Create Blocks for 1 Listing/i });
    expect(submitButton).not.toBeDisabled();

    // Verify date inputs are present
    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
  });

  it('shows clear selection button when listings are selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Vehicle 1')).toBeInTheDocument();
    });

    // Select a listing
    const checkbox = screen.getAllByRole('checkbox')[0];
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('Clear Selection')).toBeInTheDocument();
    });
  });

  it('clears selection when clear button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Vehicle 1')).toBeInTheDocument();
    });

    // Select a listing
    const checkbox = screen.getAllByRole('checkbox')[0];
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    // Click clear selection
    const clearButton = screen.getByText('Clear Selection');
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('0 selected')).toBeInTheDocument();
    });
  });

  it('displays empty state when no listings are available', async () => {
    vi.mocked(api.apiClient.get).mockImplementation(() => Promise.resolve([]));

    renderWithProviders(<BulkCalendarManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('No listings available')).toBeInTheDocument();
    });
  });
});
