/**
 * ToastContainer Component
 * Container for managing and displaying multiple toast notifications
 */

import React from 'react';
import { Toast } from './Toast';
import type { ToastProps } from './Toast';

export interface ToastContainerProps {
  toasts: ToastProps[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}

      <style>{`
        .toast-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          pointer-events: none;
        }

        .toast-container > * {
          pointer-events: auto;
        }

        /* Mobile optimizations */
        @media (max-width: 767px) {
          .toast-container {
            top: 0.5rem;
            right: 0.5rem;
            left: 0.5rem;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
};
