import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { container, rerender } = render(<Badge variant="success">Success</Badge>);
    expect(container.firstChild).toHaveClass('success');

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(container.firstChild).toHaveClass('warning');

    rerender(<Badge variant="error">Error</Badge>);
    expect(container.firstChild).toHaveClass('error');

    rerender(<Badge variant="info">Info</Badge>);
    expect(container.firstChild).toHaveClass('info');

    rerender(<Badge variant="neutral">Neutral</Badge>);
    expect(container.firstChild).toHaveClass('neutral');
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(<Badge size="sm">Small</Badge>);
    expect(container.firstChild).toHaveClass('sm');

    rerender(<Badge size="md">Medium</Badge>);
    expect(container.firstChild).toHaveClass('md');

    rerender(<Badge size="lg">Large</Badge>);
    expect(container.firstChild).toHaveClass('lg');
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Badge</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
