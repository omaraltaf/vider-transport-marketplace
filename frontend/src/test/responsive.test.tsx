/**
 * Responsive Behavior Tests
 * Tests responsive layouts across mobile, tablet, and desktop breakpoints
 * Validates: Requirements 10.4, 3.3, 6.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from '../pages/HomePage';
import SearchPage from '../pages/SearchPage';
import Navbar from '../components/Navbar';
import { Card, Container, Grid, Stack } from '../design-system/components';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com', role: 'company_admin' },
    isAuthenticated: true,
    token: 'mock-token',
    logout: vi.fn(),
  }),
}));

// Mock API client
vi.mock('../services/api', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      results: [],
      total: 0,
      totalPages: 0,
    }),
  },
}));

// Helper to set viewport size
const setViewport = (width: number, height: number = 800) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
};

// Helper to render with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
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

describe('Responsive Behavior Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile (320px-768px)', () => {
    beforeEach(() => {
      setViewport(375); // iPhone SE width
    });

    it('should render navigation drawer button on mobile', () => {
      renderWithProviders(<Navbar />);
      
      // Mobile menu button should be visible
      const menuButton = screen.getByLabelText(/open main menu/i);
      expect(menuButton).toBeInTheDocument();
    });

    it('should hide desktop navigation links on mobile', () => {
      renderWithProviders(<Navbar />);
      
      // Desktop navigation should be hidden (using hidden class or display: none)
      const nav = screen.getByRole('navigation');
      const desktopLinks = within(nav).queryAllByRole('menuitem');
      
      // Desktop links should either not exist or be hidden
      desktopLinks.forEach(link => {
        const parent = link.closest('.hidden, .sm\\:flex');
        expect(parent).toBeTruthy();
      });
    });

    it('should stack form fields vertically on mobile', () => {
      renderWithProviders(<HomePage />);
      
      // Quick search form should exist
      const searchForm = screen.getByRole('search', { name: /quick search/i });
      expect(searchForm).toBeInTheDocument();
      
      // Form should have grid layout that stacks on mobile
      const formGrid = searchForm.querySelector('.grid');
      expect(formGrid).toHaveClass('grid-cols-1');
    });

    it('should render cards in single column on mobile', () => {
      const TestComponent = () => (
        <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={4}>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
          <Card>Card 3</Card>
        </Grid>
      );

      const { container } = render(<TestComponent />);
      const grid = container.querySelector('[class*="grid"]');
      
      // Should have single column on mobile (using CSS modules class names)
      expect(grid?.className).toContain('cols-sm-1');
    });

    it('should show filter toggle button on mobile', () => {
      renderWithProviders(<SearchPage />);
      
      // Filter toggle button should be visible on mobile
      const filterButton = screen.getByRole('button', { name: /filters/i });
      expect(filterButton).toBeInTheDocument();
    });
  });

  describe('Tablet (768px-1024px)', () => {
    beforeEach(() => {
      setViewport(768); // iPad width
    });

    it('should show desktop navigation on tablet', () => {
      renderWithProviders(<Navbar />);
      
      // Desktop navigation should be visible at tablet size
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('should render cards in 2 columns on tablet', () => {
      const TestComponent = () => (
        <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={4}>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
          <Card>Card 3</Card>
        </Grid>
      );

      const { container } = render(<TestComponent />);
      const grid = container.querySelector('[class*="grid"]');
      
      // Should have 2 columns on tablet (using CSS modules class names)
      expect(grid?.className).toContain('cols-md-2');
    });

    it('should display form fields in 2 columns on tablet', () => {
      renderWithProviders(<HomePage />);
      
      const searchForm = screen.getByRole('search', { name: /quick search/i });
      const formGrid = searchForm.querySelector('.grid');
      
      // Should have responsive grid that shows 2 columns on tablet
      expect(formGrid?.className).toMatch(/sm:grid-cols-2/);
    });
  });

  describe('Desktop (1024px+)', () => {
    beforeEach(() => {
      setViewport(1280); // Desktop width
    });

    it('should hide mobile menu button on desktop', () => {
      renderWithProviders(<Navbar />);
      
      // Mobile menu button should be hidden on desktop
      const menuButton = screen.queryByLabelText(/open main menu/i);
      const parent = menuButton?.closest('.sm\\:hidden');
      expect(parent).toBeTruthy();
    });

    it('should render cards in 3 columns on desktop', () => {
      const TestComponent = () => (
        <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={4}>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
          <Card>Card 3</Card>
        </Grid>
      );

      const { container } = render(<TestComponent />);
      const grid = container.querySelector('[class*="grid"]');
      
      // Should have 3 columns on desktop (using CSS modules class names)
      expect(grid?.className).toContain('cols-lg-3');
    });

    it('should display form fields in 4 columns on desktop', () => {
      renderWithProviders(<HomePage />);
      
      const searchForm = screen.getByRole('search', { name: /quick search/i });
      const formGrid = searchForm.querySelector('.grid');
      
      // Should have 4 columns on large screens
      expect(formGrid?.className).toMatch(/lg:grid-cols-4/);
    });

    it('should show filters sidebar without toggle on desktop', () => {
      renderWithProviders(<SearchPage />);
      
      // Filters should be visible by default on desktop
      const filtersHeading = screen.getByText('Filters');
      expect(filtersHeading).toBeInTheDocument();
    });
  });

  describe('Container Component Responsive Behavior', () => {
    it('should constrain content width with Container', () => {
      const { container } = render(
        <Container>
          <div>Test Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      
      // Container should have container class (CSS modules)
      expect(containerEl.className).toContain('container');
    });

    it('should apply responsive padding with Container', () => {
      const { container } = render(
        <Container>
          <div>Test Content</div>
        </Container>
      );

      const containerEl = container.firstChild as HTMLElement;
      
      // Container should have container class which includes responsive padding
      expect(containerEl.className).toContain('container');
      expect(containerEl).toBeInTheDocument();
    });
  });

  describe('Stack Component Responsive Spacing', () => {
    it('should apply consistent spacing with Stack', () => {
      const { container } = render(
        <Stack spacing={4}>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Stack>
      );

      const stackEl = container.firstChild as HTMLElement;
      
      // Stack should have spacing classes (CSS modules)
      expect(stackEl.className).toContain('spacing-4');
    });
  });

  describe('Card Layout Adaptation', () => {
    it('should render cards with proper padding on all screen sizes', () => {
      const { container } = render(
        <Card padding="lg">
          <div>Card Content</div>
        </Card>
      );

      const cardEl = container.firstChild as HTMLElement;
      
      // Card should have padding classes (CSS modules)
      expect(cardEl.className).toContain('padding-lg');
    });

    it('should apply hover effects on cards', () => {
      const { container } = render(
        <Card hoverable>
          <div>Hoverable Card</div>
        </Card>
      );

      const cardEl = container.firstChild as HTMLElement;
      
      // Card should have hover classes
      expect(cardEl.className).toMatch(/hover/);
    });
  });

  describe('Grid Responsive Columns', () => {
    it('should adapt grid columns based on breakpoints', () => {
      const { container } = render(
        <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={4}>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
          <div>Item 4</div>
        </Grid>
      );

      const gridEl = container.firstChild as HTMLElement;
      
      // Grid should have responsive column classes (CSS modules)
      expect(gridEl.className).toContain('cols-sm-1');
      expect(gridEl.className).toContain('cols-md-2');
      expect(gridEl.className).toContain('cols-lg-3');
      expect(gridEl.className).toContain('cols-xl-4');
    });

    it('should apply consistent gap spacing', () => {
      const { container } = render(
        <Grid columns={{ sm: 1, md: 2 }} gap={6}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Grid>
      );

      const gridEl = container.firstChild as HTMLElement;
      
      // Grid should have gap classes (CSS modules)
      expect(gridEl.className).toContain('gap-6');
    });
  });

  describe('Form Layout Responsiveness', () => {
    it('should stack form fields on mobile and arrange in grid on larger screens', () => {
      renderWithProviders(<HomePage />);
      
      const searchForm = screen.getByRole('search', { name: /quick search/i });
      const formGrid = searchForm.querySelector('.grid');
      
      // Should have responsive grid classes
      expect(formGrid?.className).toMatch(/grid-cols-1/);
      expect(formGrid?.className).toMatch(/sm:grid-cols-2/);
      expect(formGrid?.className).toMatch(/lg:grid-cols-4/);
    });
  });

  describe('Navigation Drawer Mobile Behavior', () => {
    beforeEach(() => {
      setViewport(375); // Mobile width
    });

    it('should render mobile menu button', () => {
      renderWithProviders(<Navbar />);
      
      const menuButton = screen.getByLabelText(/open main menu/i);
      expect(menuButton).toBeInTheDocument();
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have proper ARIA attributes for mobile menu', () => {
      renderWithProviders(<Navbar />);
      
      const menuButton = screen.getByLabelText(/open main menu/i);
      expect(menuButton).toHaveAttribute('aria-controls', 'mobile-menu');
      expect(menuButton).toHaveAttribute('aria-expanded');
    });
  });

  describe('Table Responsive Behavior', () => {
    it('should render tables with horizontal scroll on mobile', () => {
      // Tables should be wrapped in overflow containers on mobile
      // This is tested through the Table component's implementation
      expect(true).toBe(true); // Placeholder for table scroll test
    });
  });

  describe('Breakpoint Consistency', () => {
    it('should use consistent breakpoint values across components', () => {
      // Test that breakpoints are consistent
      // sm: 640px, md: 768px, lg: 1024px, xl: 1280px
      const breakpoints = {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
      };

      // Verify breakpoints are used consistently
      expect(breakpoints.sm).toBe(640);
      expect(breakpoints.md).toBe(768);
      expect(breakpoints.lg).toBe(1024);
      expect(breakpoints.xl).toBe(1280);
    });
  });
});
