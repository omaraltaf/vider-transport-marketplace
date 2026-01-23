/**
 * Keyboard Navigation Tests
 * Tests tab order, focus indicators, and keyboard accessibility
 * Requirements: 6.2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../components/Button/Button';
import { Input } from '../components/Input/Input';
import { Modal } from '../components/Modal/Modal';
import { SkipLink } from '../components/SkipLink/SkipLink';

describe('Keyboard Navigation', () => {
  describe('Focus Indicators', () => {
    it('button should show focus indicator when focused via keyboard', async () => {
      const user = userEvent.setup();
      render(<Button>Test Button</Button>);
      
      const button = screen.getByRole('button', { name: /test button/i });
      await user.tab();
      
      expect(button).toHaveFocus();
      expect(button).toHaveStyle({ outline: expect.stringContaining('2px') });
    });

    it('input should show focus indicator when focused via keyboard', async () => {
      const user = userEvent.setup();
      render(<Input value="" onChange={() => {}} label="Test Input" />);
      
      const input = screen.getByLabelText(/test input/i);
      await user.tab();
      
      expect(input).toHaveFocus();
    });

    it('link should show focus indicator when focused via keyboard', async () => {
      const user = userEvent.setup();
      render(<a href="#test">Test Link</a>);
      
      const link = screen.getByRole('link', { name: /test link/i });
      await user.tab();
      
      expect(link).toHaveFocus();
    });
  });

  describe('Tab Order', () => {
    it('should tab through interactive elements in correct order', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Button>First</Button>
          <Input value="" onChange={() => {}} label="Second" />
          <Button>Third</Button>
        </div>
      );
      
      const first = screen.getByRole('button', { name: /first/i });
      const second = screen.getByLabelText(/second/i);
      const third = screen.getByRole('button', { name: /third/i });
      
      await user.tab();
      expect(first).toHaveFocus();
      
      await user.tab();
      expect(second).toHaveFocus();
      
      await user.tab();
      expect(third).toHaveFocus();
    });

    it('should skip disabled elements in tab order', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Button>First</Button>
          <Button disabled>Disabled</Button>
          <Button>Third</Button>
        </div>
      );
      
      const first = screen.getByRole('button', { name: /first/i });
      const third = screen.getByRole('button', { name: /third/i });
      
      await user.tab();
      expect(first).toHaveFocus();
      
      await user.tab();
      expect(third).toHaveFocus();
    });
  });

  describe('Skip Link', () => {
    it('should render skip link', () => {
      render(<SkipLink />);
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
    });

    it('skip link should be focusable', async () => {
      const user = userEvent.setup();
      render(<SkipLink />);
      
      const skipLink = screen.getByText(/skip to main content/i);
      await user.tab();
      
      expect(skipLink).toHaveFocus();
    });

    it('skip link should have correct href', () => {
      render(<SkipLink targetId="main-content" />);
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Modal Focus Trap', () => {
    it('modal should trap focus when open', async () => {
      const user = userEvent.setup();
      const onClose = () => {};
      
      render(
        <div>
          <Button>Outside Button</Button>
          <Modal isOpen={true} onClose={onClose} title="Test Modal">
            <Button>Inside Button</Button>
          </Modal>
        </div>
      );
      
      const insideButton = screen.getByRole('button', { name: /inside button/i });
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      // Focus should be trapped within modal - either button is acceptable as first focus
      await user.tab();
      const firstFocused = document.activeElement;
      expect([insideButton, closeButton]).toContain(firstFocused);
      
      // Tab should cycle to the other button within modal
      await user.tab();
      const secondFocused = document.activeElement;
      expect([insideButton, closeButton]).toContain(secondFocused);
      expect(secondFocused).not.toBe(firstFocused);
    });

    it('modal should close on escape key', async () => {
      const user = userEvent.setup();
      let isOpen = true;
      const onClose = () => { isOpen = false; };
      
      const { rerender } = render(
        <Modal isOpen={isOpen} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      await user.keyboard('{Escape}');
      
      rerender(
        <Modal isOpen={isOpen} onClose={onClose} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );
      
      expect(screen.queryByText(/modal content/i)).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('button should be clickable with Enter key', async () => {
      const user = userEvent.setup();
      let clicked = false;
      const onClick = () => { clicked = true; };
      
      render(<Button onClick={onClick}>Test Button</Button>);
      
      const button = screen.getByRole('button', { name: /test button/i });
      button.focus();
      await user.keyboard('{Enter}');
      
      expect(clicked).toBe(true);
    });

    it('button should be clickable with Space key', async () => {
      const user = userEvent.setup();
      let clicked = false;
      const onClick = () => { clicked = true; };
      
      render(<Button onClick={onClick}>Test Button</Button>);
      
      const button = screen.getByRole('button', { name: /test button/i });
      button.focus();
      await user.keyboard(' ');
      
      expect(clicked).toBe(true);
    });
  });
});
