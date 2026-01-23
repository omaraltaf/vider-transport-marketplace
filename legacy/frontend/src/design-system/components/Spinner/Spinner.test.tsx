import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders with loading status', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<Spinner size="sm" />);
    expect(container.firstChild).toHaveClass('sm');

    rerender(<Spinner size="md" />);
    expect(container.firstChild).toHaveClass('md');

    rerender(<Spinner size="lg" />);
    expect(container.firstChild).toHaveClass('lg');

    rerender(<Spinner size="xl" />);
    expect(container.firstChild).toHaveClass('xl');
  });

  it('applies color classes correctly', () => {
    const { container, rerender } = render(<Spinner color="primary" />);
    expect(container.firstChild).toHaveClass('primary');

    rerender(<Spinner color="secondary" />);
    expect(container.firstChild).toHaveClass('secondary');

    rerender(<Spinner color="white" />);
    expect(container.firstChild).toHaveClass('white');

    rerender(<Spinner color="current" />);
    expect(container.firstChild).toHaveClass('current');
  });

  it('applies custom className', () => {
    const { container } = render(<Spinner className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
