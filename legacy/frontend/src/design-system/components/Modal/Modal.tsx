import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../Button/Button';
import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Handle focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Get all focusable elements within the modal
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus the first element
      firstElement?.focus();

      const handleTabKey = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);

      return () => {
        document.removeEventListener('keydown', handleTabKey);
        // Restore focus to the previously focused element
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle click outside
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalClasses = [
    styles.modal,
    styles[`size-${size}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={styles.overlay}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div ref={modalRef} className={modalClasses}>
        {(title || showCloseButton) && (
          <div className={styles.header}>
            {title && (
              <h2 id="modal-title" className={styles.title}>
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close modal"
              >
                <X size={20} />
              </Button>
            )}
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';
