import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';

describe('Button', () => {
  describe('variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary Button</Button>);
      const button = screen.getByRole('button', { name: /primary button/i });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain('primary');
    });

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      const button = screen.getByRole('button', { name: /secondary button/i });
      expect(button.className).toContain('secondary');
    });

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline Button</Button>);
      const button = screen.getByRole('button', { name: /outline button/i });
      expect(button.className).toContain('outline');
    });

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost Button</Button>);
      const button = screen.getByRole('button', { name: /ghost button/i });
      expect(button.className).toContain('ghost');
    });

    it('renders danger variant correctly', () => {
      render(<Button variant="danger">Danger Button</Button>);
      const button = screen.getByRole('button', { name: /danger button/i });
      expect(button.className).toContain('danger');
    });
  });

  describe('sizes', () => {
    it('renders small size correctly', () => {
      render(<Button size="sm">Small Button</Button>);
      const button = screen.getByRole('button', { name: /small button/i });
      expect(button.className).toContain('sm');
    });

    it('renders medium size correctly', () => {
      render(<Button size="md">Medium Button</Button>);
      const button = screen.getByRole('button', { name: /medium button/i });
      expect(button.className).toContain('md');
    });

    it('renders large size correctly', () => {
      render(<Button size="lg">Large Button</Button>);
      const button = screen.getByRole('button', { name: /large button/i });
      expect(button.className).toContain('lg');
    });
  });

  describe('disabled state', () => {
    it('prevents clicks when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /disabled button/i });
      expect(button).toBeDisabled();
      
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('shows spinner when loading', () => {
      render(<Button loading>Loading Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toContain('loading');
    });

    it('prevents clicks when loading', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(
        <Button loading onClick={handleClick}>
          Loading Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('icon rendering', () => {
    it('renders left icon correctly', () => {
      render(
        <Button leftIcon={<Plus data-testid="left-icon" />}>
          With Left Icon
        </Button>
      );
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByText('With Left Icon')).toBeInTheDocument();
    });

    it('renders right icon correctly', () => {
      render(
        <Button rightIcon={<Trash2 data-testid="right-icon" />}>
          With Right Icon
        </Button>
      );
      
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
      expect(screen.getByText('With Right Icon')).toBeInTheDocument();
    });

    it('renders both left and right icons', () => {
      render(
        <Button
          leftIcon={<Plus data-testid="left-icon" />}
          rightIcon={<Trash2 data-testid="right-icon" />}
        >
          With Both Icons
        </Button>
      );
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('fullWidth prop', () => {
    it('applies fullWidth class when prop is true', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      const button = screen.getByRole('button', { name: /full width button/i });
      expect(button.className).toContain('fullWidth');
    });
  });

  describe('click handling', () => {
    it('calls onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      const button = screen.getByRole('button', { name: /click me/i });
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
