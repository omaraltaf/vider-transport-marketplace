import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with loading label', () => {
    render(<Skeleton />);
    expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { container, rerender } = render(<Skeleton variant="text" />);
    expect(container.firstChild).toHaveClass('text');

    rerender(<Skeleton variant="circle" />);
    expect(container.firstChild).toHaveClass('circle');

    rerender(<Skeleton variant="rectangle" />);
    expect(container.firstChild).toHaveClass('rectangle');
  });

  it('applies custom width and height', () => {
    const { container } = render(<Skeleton width={200} height={100} />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.width).toBe('200px');
    expect(skeleton.style.height).toBe('100px');
  });

  it('accepts string values for width and height', () => {
    const { container } = render(<Skeleton width="50%" height="2rem" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton.style.width).toBe('50%');
    expect(skeleton.style.height).toBe('2rem');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
