/**
 * Toast Component
 * Displays temporary notification messages
 * 
 * Features:
 * - Multiple variants (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss option
 * - Accessible with ARIA attributes
 * - Stacked positioning for multiple toasts
 */

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number; // milliseconds, 0 = no auto-dismiss
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'ds-bg-success-light ds-border-success ds-text-success-dark',
  error: 'ds-bg-error-light ds-border-error ds-text-error-dark',
  warning: 'ds-bg-warning-light ds-border-warning ds-text-warning-dark',
  info: 'ds-bg-info-light ds-border-info ds-text-info-dark',
};

const variantIcons: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 5000,
  onDismiss,
}) => {
  const Icon = variantIcons[variant];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <div
      className={`toast ${variantStyles[variant]}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="toast-content">
        <Icon className="toast-icon" aria-hidden="true" />
        <p className="toast-message">{message}</p>
        <button
          onClick={() => onDismiss(id)}
          className="toast-dismiss"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <style>{`
        .toast {
          display: flex;
          align-items: center;
          min-width: 300px;
          max-width: 500px;
          padding: 1rem;
          border-radius: 0.5rem;
          border: 1px solid;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideIn 0.3s ease-out;
          margin-bottom: 0.5rem;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
        }

        .toast-icon {
          flex-shrink: 0;
          width: 1.25rem;
          height: 1.25rem;
        }

        .toast-message {
          flex: 1;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0;
        }

        .toast-dismiss {
          flex-shrink: 0;
          padding: 0.25rem;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 0.25rem;
          transition: background-color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toast-dismiss:hover {
          background-color: rgba(0, 0, 0, 0.1);
        }

        .toast-dismiss:focus {
          outline: 2px solid currentColor;
          outline-offset: 2px;
        }

        /* Mobile optimizations */
        @media (max-width: 767px) {
          .toast {
            min-width: 280px;
            max-width: calc(100vw - 2rem);
          }

          .toast-message {
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
};
