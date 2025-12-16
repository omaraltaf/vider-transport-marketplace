import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import { ProfileStatus } from './ProfileStatus';
import type { ProfileStatus as ProfileStatusType } from '../../hooks/useDashboardData';

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'COMPANY_ADMIN',
      companyId: 'test-company-id',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ProfileStatus Component', () => {
  it('should render profile completeness with progress bar', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 75,
      missingFields: ['Business Address', 'Description'],
      verified: true,
      allDriversVerified: true,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    expect(screen.getByText('Profile & Settings')).toBeInTheDocument();
    expect(screen.getByText('Profile Completeness')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should display missing fields when profile is incomplete', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 60,
      missingFields: ['Business Address', 'Description', 'Postal Code'],
      verified: true,
      allDriversVerified: true,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    expect(screen.getByText('Missing Required Fields:')).toBeInTheDocument();
    expect(screen.getByText('Business Address')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Postal Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete your profile/i })).toBeInTheDocument();
  });

  it('should show complete badge when profile is 100% complete', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 100,
      missingFields: [],
      verified: true,
      allDriversVerified: true,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.queryByText('Missing Required Fields:')).not.toBeInTheDocument();
  });

  it('should display company verification status', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 100,
      missingFields: [],
      verified: true,
      allDriversVerified: true,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    expect(screen.getByText('Verification Status')).toBeInTheDocument();
    expect(screen.getByText('Company Verified')).toBeInTheDocument();
    expect(screen.getAllByText('Verified')[0]).toBeInTheDocument();
  });

  it('should display driver verification status', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 100,
      missingFields: [],
      verified: true,
      allDriversVerified: false,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    expect(screen.getByText('All Drivers Verified')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should show verification notice when verification is pending', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 100,
      missingFields: [],
      verified: false,
      allDriversVerified: false,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    expect(screen.getByText(/verification is pending/i)).toBeInTheDocument();
  });

  it('should render quick action buttons', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 100,
      missingFields: [],
      verified: true,
      allDriversVerified: true,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /notification preferences/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /account settings/i })).toBeInTheDocument();
  });

  it('should have proper ARIA labels for accessibility', () => {
    const mockProfile: ProfileStatusType = {
      completeness: 75,
      missingFields: ['Business Address'],
      verified: true,
      allDriversVerified: true,
    };

    renderWithRouter(<ProfileStatus profile={mockProfile} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });
});
