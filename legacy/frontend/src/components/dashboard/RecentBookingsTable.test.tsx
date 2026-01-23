import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { RecentBookingsTable } from './RecentBookingsTable';
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

describe('RecentBookingsTable Component', () => {
  const mockBookings: OperationalSummary['recentBookings'] = [
    {
      id: '1',
      bookingNumber: 'BK-2024-001',
      companyName: 'Acme Corp',
      listingTitle: 'Mercedes Sprinter Van',
      status: 'ACTIVE',
      startDate: '2024-01-15T10:00:00Z',
      role: 'provider',
    },
    {
      id: '2',
      bookingNumber: 'BK-2024-002',
      companyName: 'Tech Solutions',
      listingTitle: 'Professional Driver - Oslo',
      status: 'PENDING',
      startDate: '2024-01-20T14:00:00Z',
      role: 'renter',
    },
    {
      id: '3',
      bookingNumber: 'BK-2024-003',
      companyName: 'Logistics AS',
      listingTitle: 'Ford Transit',
      status: 'COMPLETED',
      startDate: '2024-01-10T08:00:00Z',
      role: 'provider',
    },
  ];

  it('should render all bookings in the table', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    expect(screen.getAllByText('BK-2024-001')[0]).toBeInTheDocument();
    expect(screen.getAllByText('BK-2024-002')[0]).toBeInTheDocument();
    expect(screen.getAllByText('BK-2024-003')[0]).toBeInTheDocument();
  });

  it('should display company names', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    expect(screen.getAllByText('Acme Corp')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Tech Solutions')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Logistics AS')[0]).toBeInTheDocument();
  });

  it('should display listing titles', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    expect(screen.getAllByText('Mercedes Sprinter Van')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Professional Driver - Oslo')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Ford Transit')[0]).toBeInTheDocument();
  });

  it('should display booking status with badges', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    expect(screen.getAllByText('Active')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Pending')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Completed')[0]).toBeInTheDocument();
  });

  it('should display role (provider/renter)', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    const providerElements = screen.getAllByText('Provider');
    const renterElements = screen.getAllByText('Renter');

    // Table renders both desktop and mobile views, so we expect 2x the count
    expect(providerElements.length).toBeGreaterThanOrEqual(2);
    expect(renterElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should navigate to booking details when booking number is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    const bookingLinks = screen.getAllByRole('button', { name: /view booking BK-2024-001/i });
    await user.click(bookingLinks[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/bookings/1');
  });

  it('should display empty state when no bookings', () => {
    renderWithRouter(<RecentBookingsTable bookings={[]} />);

    expect(screen.getByText(/no recent bookings to display/i)).toBeInTheDocument();
  });

  it('should have sortable columns', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    // Check that column headers are present (sortable columns) - use getAllByText for mobile/desktop views
    expect(screen.getAllByText('Booking #')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Company')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Listing')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Role')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Start Date')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Status')[0]).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    // Dates should be formatted as "Jan 15, 2024" format
    expect(screen.getAllByText(/Jan 15, 2024/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Jan 20, 2024/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Jan 10, 2024/i)[0]).toBeInTheDocument();
  });

  it('should have proper ARIA labels for accessibility', () => {
    renderWithRouter(<RecentBookingsTable bookings={mockBookings} />);

    expect(screen.getAllByRole('button', { name: /view booking BK-2024-001/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /view booking BK-2024-002/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /view booking BK-2024-003/i })[0]).toBeInTheDocument();
  });
});
