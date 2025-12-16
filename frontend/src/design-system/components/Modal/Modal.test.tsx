import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  beforeEach(() => {
    // Reset body overflow before each test
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up after each test
    document.body.style.overflow = '';
  });

  describe('open/close functionality', () => {
    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('escape key handler', () => {
    it('closes modal when Escape key is pressed', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Modal content</p>
        </Modal>
      );

      await user.keyboard('{Escape}');

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when other keys are pressed', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={handleClose} showCloseButton={false}>
          <input type="text" placeholder="Test input" />
        </Modal>
      );

      const input = screen.getByPlaceholderText('Test input');
      input.focus();

      await user.keyboard('{Enter}');
      await user.keyboard('a');
      await user.keyboard('b');

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('click outside to close', () => {
    it('closes modal when clicking on backdrop', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Modal content</p>
        </Modal>
      );

      const overlay = screen.getByRole('dialog');
      await user.click(overlay);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside modal content', async () => {
      const handleClose = vi.fn();
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={handleClose}>
          <p>Modal content</p>
        </Modal>
      );

      const content = screen.getByText('Modal content');
      await user.click(content);

      expect(handleClose).not.toHaveBeenCalled();
    });
  });

  describe('focus trap', () => {
    it('focuses first focusable element when opened', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      );

      // The close button in the header should be focused first
      const closeButton = screen.getByRole('button', { name: /close modal/i });
      expect(document.activeElement).toBe(closeButton);
    });

    it('traps focus within modal', async () => {
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      const firstButton = screen.getByRole('button', { name: /first button/i });
      const secondButton = screen.getByRole('button', { name: /second button/i });

      // Tab through elements
      await user.tab();
      expect(document.activeElement).toBe(firstButton);

      await user.tab();
      expect(document.activeElement).toBe(secondButton);

      // Tab from last element should cycle back to first
      await user.tab();
      expect(document.activeElement).toBe(closeButton);
    });

    it('supports shift+tab for reverse navigation', async () => {
      const user = userEvent.setup();

      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      );

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      const secondButton = screen.getByRole('button', { name: /second button/i });

      // Shift+Tab from first element should go to last
      await user.tab({ shift: true });
      expect(document.activeElement).toBe(secondButton);
    });
  });

  describe('size variants', () => {
    it('renders small size correctly', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="sm">
          <p>Small modal</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('[class*="modal"]');
      expect(modalContent?.className).toContain('size-sm');
    });

    it('renders medium size correctly', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="md">
          <p>Medium modal</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('[class*="modal"]');
      expect(modalContent?.className).toContain('size-md');
    });

    it('renders large size correctly', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="lg">
          <p>Large modal</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('[class*="modal"]');
      expect(modalContent?.className).toContain('size-lg');
    });

    it('renders extra large size correctly', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} size="xl">
          <p>Extra large modal</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      const modalContent = dialog.querySelector('[class*="modal"]');
      expect(modalContent?.className).toContain('size-xl');
    });
  });

  describe('title and close button', () => {
    it('renders title when provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Test Title">
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /test title/i })).toBeInTheDocument();
    });

    it('does not render title when not provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('shows close button by default', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} showCloseButton={false}>
          <p>Content</p>
        </Modal>
      );

      expect(screen.queryByRole('button', { name: /close modal/i })).not.toBeInTheDocument();
    });
  });

  describe('body scroll prevention', () => {
    it('prevents body scroll when modal is open', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <Modal isOpen={false} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()} title="Accessible Modal">
          <p>Content</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('does not have aria-labelledby when no title is provided', () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Content</p>
        </Modal>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).not.toHaveAttribute('aria-labelledby');
    });
  });
});
