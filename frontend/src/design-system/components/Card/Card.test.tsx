import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies padding variants correctly', () => {
    const { container, rerender } = render(<Card padding="sm">Content</Card>);
    expect(container.firstChild).toHaveClass('padding-sm');

    rerender(<Card padding="md">Content</Card>);
    expect(container.firstChild).toHaveClass('padding-md');

    rerender(<Card padding="lg">Content</Card>);
    expect(container.firstChild).toHaveClass('padding-lg');
  });

  it('applies hoverable class when hoverable prop is true', () => {
    const { container } = render(<Card hoverable>Content</Card>);
    expect(container.firstChild).toHaveClass('hoverable');
  });

  it('handles click events when onClick is provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable Card</Card>);
    
    const card = screen.getByRole('button');
    await user.click(card);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard events when onClick is provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable Card</Card>);
    
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-class">Content</Card>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
