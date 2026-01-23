/**
 * Toast Context
 * Provides global toast notification management
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../design-system/components/Toast';
import type { ToastProps, ToastVariant } from '../design-system/components/Toast';

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info', duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastProps = {
      id,
      message,
      variant,
      duration,
      onDismiss: dismissToast,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};
