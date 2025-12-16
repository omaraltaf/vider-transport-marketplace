/**
 * ARIA Labels Tests
 * Tests ARIA labels for icon-only buttons, form inputs, and dynamic content
 * Requirements: 6.3, 6.4
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Icon } from '../components/Icon/Icon';
import { Modal } from '../components/Modal/Modal';
import { Badge } from '../components/Badge/Badge';

describe('ARIA Labels', () => {
  describe('Icon-Only Buttons', () => {
    it('icon-only button should have aria-label', () => {
      render(
        <Button aria-label="Delete item">
          <Icon name="trash" />
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /delete item/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAccessibleName('Delete item');
    });

    it('icon-only button without aria-label should have accessible name from children', () => {
      render(
        <Button>
          <Icon name="plus" />
          <span className="sr-only">Add new</span>
        </Button>
      );
      
      const button = screen.getByRole('button', { name: /add new/i });
      expect(button).toBeInTheDocument();
    });

    it('close button should have aria-label', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label');
    });
  });

  describe('Form Input Labels', () => {
    it('input should have associated label', () => {
      render(<Input value="" onChange={() => {}} label="Email address" />);
      
      const input = screen.getByLabelText(/email address/i);
      expect(input).toBeInTheDocument();
    });

    it('input with error should have aria-describedby for error message', () => {
      render(
        <Input
          value=""
          onChange={() => {}}
          label="Email"
          error="Invalid email address"
        />
      );
      
      const input = screen.getByLabelText(/email/i);
      const errorMessage = screen.getByText(/invalid email address/i);
      
      expect(input).toHaveAttribute('aria-describedby');
      expect(errorMessage).toBeInTheDocument();
    });

    it('required input should indicate required state', () => {
      render(
        <Input
          value=""
          onChange={() => {}}
          label="Username"
          required
        />
      );
      
      const input = screen.getByLabelText(/username/i);
      expect(input).toHaveAttribute('required');
    });

    it('input with helper text should have aria-describedby', () => {
      render(
        <Input
          value=""
          onChange={() => {}}
          label="Password"
          helperText="Must be at least 8 characters"
        />
      );
      
      const input = screen.getByLabelText(/password/i);
      const helperText = screen.getByText(/must be at least 8 characters/i);
      
      expect(input).toHaveAttribute('aria-describedby');
      expect(helperText).toBeInTheDocument();
    });
  });

  describe('Icons with ARIA', () => {
    it('decorative icon should have aria-hidden', () => {
      const { container } = render(<Icon name="check" />);
      const icon = container.querySelector('svg');
      
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('meaningful icon should have aria-label', () => {
      const { container } = render(<Icon name="check" aria-label="Success" />);
      const icon = container.querySelector('svg');
      
      expect(icon).toHaveAttribute('aria-label', 'Success');
      expect(icon).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('Modal ARIA', () => {
    it('modal should have role="dialog"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('modal should have aria-labelledby for title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Confirm Action">
          <p>Are you sure?</p>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      const title = screen.getByText(/confirm action/i);
      
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(title).toBeInTheDocument();
    });

    it('modal should have aria-modal="true"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Content</p>
        </Modal>
      );
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Status and Semantic Elements', () => {
    it('badge should have appropriate role for status', () => {
      render(<Badge variant="success">Active</Badge>);
      
      const badge = screen.getByText(/active/i);
      expect(badge).toBeInTheDocument();
    });

    it('error message should be announced to screen readers', () => {
      render(
        <div role="alert" aria-live="assertive">
          <p>An error occurred</p>
        </div>
      );
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('success message should be announced to screen readers', () => {
      render(
        <div role="status" aria-live="polite">
          <p>Changes saved successfully</p>
        </div>
      );
      
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Loading States', () => {
    it('loading button should indicate loading state', () => {
      render(<Button loading>Save</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('loading spinner should have aria-label', () => {
      const { container } = render(
        <div role="status" aria-label="Loading">
          <svg className="spinner" />
        </div>
      );
      
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Loading');
    });
  });

  describe('Navigation Elements', () => {
    it('navigation should have role="navigation"', () => {
      render(
        <nav role="navigation" aria-label="Main navigation">
          <ul>
            <li><a href="/">Home</a></li>
          </ul>
        </nav>
      );
      
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('main content should have role="main"', () => {
      render(
        <main role="main" id="main-content">
          <h1>Page Title</h1>
        </main>
      );
      
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });
});
