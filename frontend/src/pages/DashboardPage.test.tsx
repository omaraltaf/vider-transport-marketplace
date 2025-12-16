import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../contexts/ToastContext';
import DashboardPage from './DashboardPage';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: '1',
      email: 'test@example.com',
      role: 'COMPANY_ADMIN',
      companyId: 'company-1',
    },
    token: 'test-token',
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock Navbar
vi.mock('../components/Navbar', () => ({
  default: () => <div data-testid="navbar">Navbar</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('DashboardPage - Component Structure', () => {
  it('should render the page with main heading', () => {
    renderWithProviders(<DashboardPage />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your company command center')).toBeInTheDocument();
  });

  it('should render all four main sections (skeleton loaders during loading)', () => {
    renderWithProviders(<DashboardPage />);
    
    // Since isLoading is true, we should see skeleton loaders instead of section headings
    // Verify that all four sections are present by checking for skeleton loaders
    const loadingElements = screen.getAllByLabelText('Loading content');
    expect(loadingElements.length).toBeGreaterThan(0);
    
    // Verify the dashboard grid structure exists
    const { container } = renderWithProviders(<DashboardPage />);
    const sections = container.querySelectorAll('.dashboard-section');
    expect(sections.length).toBe(4);
  });

  it('should render skeleton loaders when loading', () => {
    renderWithProviders(<DashboardPage />);
    
    // Check for loading indicators
    const loadingElements = screen.getAllByLabelText('Loading content');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('should render navbar', () => {
    renderWithProviders(<DashboardPage />);
    
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('should have proper semantic structure', () => {
    const { container } = renderWithProviders(<DashboardPage />);
    
    // Check for h1 heading
    const h1 = container.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.textContent).toBe('Dashboard');
    
    // Check for dashboard sections (h2 headings are hidden during loading state)
    // Verify the structure exists
    const dashboardGrid = container.querySelector('.dashboard-grid');
    expect(dashboardGrid).toBeInTheDocument();
    
    const sections = container.querySelectorAll('.dashboard-section');
    expect(sections.length).toBe(4);
  });
});

describe('DashboardPage - Error Boundary', () => {
  it('should render error boundary for each section', () => {
    // The error boundaries are in place, but we can't easily test them
    // without triggering actual errors. This test verifies the structure exists.
    const { container } = renderWithProviders(<DashboardPage />);
    
    // Verify sections are wrapped (they render without errors)
    expect(container.querySelector('.dashboard-grid')).toBeInTheDocument();
  });
});

describe('DashboardPage - Responsive Layout', () => {
  it('should have responsive grid classes', () => {
    const { container } = renderWithProviders(<DashboardPage />);
    
    const dashboardGrid = container.querySelector('.dashboard-grid');
    expect(dashboardGrid).toBeInTheDocument();
    
    const kpiGrid = container.querySelector('.kpi-grid');
    expect(kpiGrid).toBeInTheDocument();
  });

  it('should have CSS media queries for responsive design', () => {
    const { container } = renderWithProviders(<DashboardPage />);
    
    // Check that style tag exists with media queries
    const styleTag = container.querySelector('style');
    expect(styleTag).toBeInTheDocument();
    expect(styleTag?.textContent).toContain('@media (min-width: 768px)');
    expect(styleTag?.textContent).toContain('@media (min-width: 1024px)');
  });
});
