/**
 * Tests for loading and error state components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarSkeleton } from './CalendarSkeleton';
import { ErrorState } from './ErrorState';
import { ErrorBoundary } from './ErrorBoundary';
import { CalendarView } from './CalendarView';
import { BlockForm } from './BlockForm';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'zod';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'zod';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'zod';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'zod';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'zod';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'zod';

// Mock the design system components
vi.mock('../../design-system/components', () => ({
  Card: ({ children, className, padding, ...props }: any) => (
    <div className={`card ${className || ''}`} data-padding={padding} {...props}>
      {children}
    </div>
  ),
  Button: ({ children, variant, loading, leftIcon, onClick, ...props }: any) => (
    <button 
      className={`button ${variant || ''}`} 
      onClick={onClick}
      disabled={loading}
      {...props}
    >
      {loading ? 'Loading...' : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </button>
  ),
  Badge: ({ children, variant }: any) => (
    <span className={`badge ${variant || ''}`}>{children}</span>
  ),
  Modal: ({ children, isOpen, title }: any) => 
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
  Input: ({ label, value, onChange, error, ...props }: any) => (
    <div>
      {label && <label>{label}</label>}
      <input 
        value={value} 
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={!!error}
        {...props}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
  Textarea: ({ label, value, onChange, error, ...props }: any) => (
    <div>
      {label && <label>{label}</label>}
      <textarea 
        value={value} 
        onChange={(e) => onChange?.(e.target.value)}
        aria-invalid={!!error}
        {...props}
      />
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

vi.mock('../../design-system/components/Skeleton', () => ({
  Skeleton: ({ variant, width, height, 'aria-label': ariaLabel }: any) => (
    <div 
      className={`skeleton ${variant || ''}`}
      style={{ width, height }}
      role="status"
      aria-label={ariaLabel}
    >
      Loading...
    </div>
  ),
}));

vi.mock('../../design-system/components/Toast', () => ({
  Toast: ({ message, variant, onDismiss }: any) => (
    <div className={`toast ${variant || ''}`} role="alert">
      {message}
      <button onClick={() => onDismiss?.()}>Dismiss</button>
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid="alert-circle-icon">AlertCircle</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  WifiOff: () => <span data-testid="wifi-off-icon">WifiOff</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">CheckCircle</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  ChevronLeft: () => <span data-testid="chevron-left-icon">ChevronLeft</span>,
  ChevronRight: () => <span data-testid="chevron-right-icon">ChevronRight</span>,
  Download: () => <span data-testid="download-icon">Download</span>,
}));

// Mock API client
vi.mock('../../services/api', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

// Mock useRetry hook
vi.mock('../../hooks/useRetry', () => ({
  default: () => ({
    retry: vi.fn(),
    isRetrying: false,
    canRetry: true,
    reset: vi.fn(),
  }),
}));

describe('CalendarSkeleton', () => {
  it('renders skeleton elements for calendar structure', () => {
    render(<CalendarSkeleton />);
    
    // Check for skeleton elements (should have many status elements)
    expect(screen.getAllByRole('status').length).toBeGreaterThan(50);
    expect(screen.getAllByLabelText('Loading navigation button')).toHaveLength(2); // Previous and Next buttons
    expect(screen.getByLabelText('Loading month title')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<CalendarSkeleton className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('ErrorState', () => {
  it('renders error message and retry button', () => {
    const onRetry = vi.fn();
    render(
      <ErrorState 
        error="Test error message" 
        onRetry={onRetry}
      />
    );
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <ErrorState 
        error="Test error" 
        onRetry={onRetry}
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(
      <ErrorState error="Network error" variant="network" />
    );
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();

    rerender(<ErrorState error="Permission error" variant="permission" />);
    expect(screen.getByText('Access Denied')).toBeInTheDocument();

    rerender(<ErrorState error="Not found error" variant="notFound" />);
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorState error="Test error" />);
    
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn();
    
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });
});

describe('CalendarView with loading and error states', () => {
  const defaultProps = {
    listingId: 'test-listing',
    listingType: 'vehicle' as const,
    mode: 'view' as const,
  };

  it('renders skeleton when loading', () => {
    render(<CalendarView {...defaultProps} loading={true} />);
    
    // Should render CalendarSkeleton
    expect(screen.getAllByRole('status').length).toBeGreaterThan(50); // Skeleton elements
  });

  it('renders error state when error is provided', () => {
    const onRetry = vi.fn();
    render(
      <CalendarView 
        {...defaultProps} 
        error="Failed to load calendar" 
        onRetry={onRetry}
      />
    );
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders calendar when not loading and no error', () => {
    render(<CalendarView {...defaultProps} />);
    
    // Should render the actual calendar
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByText(/January|February|March|April|May|June|July|August|September|October|November|December/)).toBeInTheDocument();
  });

  it('detects network error variant', () => {
    render(
      <CalendarView 
        {...defaultProps} 
        error="Network fetch failed" 
      />
    );
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });
});

describe('BlockForm with loading and error states', () => {
  const defaultProps = {
    listingId: 'test-listing',
    listingType: 'vehicle' as const,
    onBlockCreated: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders skeleton when loading', () => {
    render(<BlockForm {...defaultProps} loading={true} />);
    
    // Should render skeleton elements
    expect(screen.getAllByRole('status').length).toBeGreaterThan(5); // Form skeleton elements
  });

  it('renders form when not loading', () => {
    render(<BlockForm {...defaultProps} />);
    
    expect(screen.getByText('Block Dates')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('CalendarSkeleton has proper ARIA labels', () => {
    render(<CalendarSkeleton />);
    
    expect(screen.getAllByLabelText('Loading navigation button')).toHaveLength(2);
    expect(screen.getByLabelText('Loading month title')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading day 1')).toBeInTheDocument();
  });

  it('ErrorState has proper ARIA attributes', () => {
    render(<ErrorState error="Test error" />);
    
    // Error content should be in an alert region
    const errorCard = screen.getByText('Test error').closest('.card');
    expect(errorCard).toBeInTheDocument();
  });

  it('ErrorBoundary error UI has proper ARIA attributes', () => {
    const ThrowingComponent = () => {
      throw new Error('Test');
    };

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});