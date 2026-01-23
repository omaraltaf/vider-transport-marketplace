import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mail, Lock } from 'lucide-react';
import { Input } from './Input';

describe('Input', () => {
  describe('input types', () => {
    it('renders text input correctly', () => {
      const handleChange = vi.fn();
      render(<Input type="text" value="" onChange={handleChange} placeholder="Enter text" />);
      
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders email input correctly', () => {
      const handleChange = vi.fn();
      render(<Input type="email" value="" onChange={handleChange} placeholder="Enter email" />);
      
      const input = screen.getByPlaceholderText('Enter email');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('renders password input correctly', () => {
      const handleChange = vi.fn();
      render(<Input type="password" value="" onChange={handleChange} placeholder="Enter password" />);
      
      const input = screen.getByPlaceholderText('Enter password');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('renders number input correctly', () => {
      const handleChange = vi.fn();
      render(<Input type="number" value="" onChange={handleChange} placeholder="Enter number" />);
      
      const input = screen.getByPlaceholderText('Enter number');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('renders date input correctly', () => {
      const handleChange = vi.fn();
      const { container } = render(<Input type="date" value="" onChange={handleChange} />);
      
      const input = container.querySelector('input[type="date"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });
  });

  describe('validation states', () => {
    it('renders default state correctly', () => {
      const handleChange = vi.fn();
      render(<Input value="" onChange={handleChange} placeholder="Default input" />);
      
      const input = screen.getByPlaceholderText('Default input');
      expect(input).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('renders error state correctly', () => {
      const handleChange = vi.fn();
      render(
        <Input
          value=""
          onChange={handleChange}
          error="This field is required"
          placeholder="Error input"
        />
      );
      
      const input = screen.getByPlaceholderText('Error input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('renders success state correctly', () => {
      const handleChange = vi.fn();
      render(<Input value="valid@email.com" onChange={handleChange} success placeholder="Success input" />);
      
      const input = screen.getByPlaceholderText('Success input');
      expect(input).toBeInTheDocument();
    });
  });

  describe('error message display', () => {
    it('displays error message when error prop is provided', () => {
      const handleChange = vi.fn();
      render(
        <Input
          value=""
          onChange={handleChange}
          error="This field is required"
          placeholder="Input with error"
        />
      );
      
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('does not display error message when error prop is not provided', () => {
      const handleChange = vi.fn();
      render(<Input value="" onChange={handleChange} placeholder="Input without error" />);
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('displays helper text when no error', () => {
      const handleChange = vi.fn();
      render(
        <Input
          value=""
          onChange={handleChange}
          helperText="This is helper text"
          placeholder="Input with helper"
        />
      );
      
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });

    it('hides helper text when error is present', () => {
      const handleChange = vi.fn();
      render(
        <Input
          value=""
          onChange={handleChange}
          error="Error message"
          helperText="This is helper text"
          placeholder="Input with both"
        />
      );
      
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('This is helper text')).not.toBeInTheDocument();
    });
  });

  describe('icon rendering', () => {
    it('renders left icon correctly', () => {
      const handleChange = vi.fn();
      render(
        <Input
          value=""
          onChange={handleChange}
          leftIcon={<Mail data-testid="left-icon" />}
          placeholder="Input with left icon"
        />
      );
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders right icon correctly', () => {
      const handleChange = vi.fn();
      render(
        <Input
          value=""
          onChange={handleChange}
          rightIcon={<Lock data-testid="right-icon" />}
          placeholder="Input with right icon"
        />
      );
      
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders both left and right icons', () => {
      const handleChange = vi.fn();
      render(
        <Input
          value=""
          onChange={handleChange}
          leftIcon={<Mail data-testid="left-icon" />}
          rightIcon={<Lock data-testid="right-icon" />}
          placeholder="Input with both icons"
        />
      );
      
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('label and required indicator', () => {
    it('renders label when provided', () => {
      const handleChange = vi.fn();
      render(<Input label="Email Address" value="" onChange={handleChange} />);
      
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('shows required indicator when required prop is true', () => {
      const handleChange = vi.fn();
      render(<Input label="Email Address" value="" onChange={handleChange} required />);
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not show required indicator when required prop is false', () => {
      const handleChange = vi.fn();
      render(<Input label="Email Address" value="" onChange={handleChange} />);
      
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('user interaction', () => {
    it('calls onChange handler when user types', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      
      render(<Input value="" onChange={handleChange} placeholder="Type here" />);
      
      const input = screen.getByPlaceholderText('Type here');
      await user.type(input, 'hello');
      
      expect(handleChange).toHaveBeenCalled();
      // onChange is called for each character typed
      expect(handleChange).toHaveBeenCalledTimes(5);
      expect(handleChange).toHaveBeenLastCalledWith('o');
    });

    it('displays the current value', () => {
      const handleChange = vi.fn();
      render(<Input value="current value" onChange={handleChange} placeholder="Input" />);
      
      const input = screen.getByPlaceholderText('Input') as HTMLInputElement;
      expect(input.value).toBe('current value');
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      const handleChange = vi.fn();
      render(<Input value="" onChange={handleChange} disabled placeholder="Disabled input" />);
      
      const input = screen.getByPlaceholderText('Disabled input');
      expect(input).toBeDisabled();
    });

    it('does not call onChange when disabled', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      
      render(<Input value="" onChange={handleChange} disabled placeholder="Disabled input" />);
      
      const input = screen.getByPlaceholderText('Disabled input');
      await user.type(input, 'test');
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
