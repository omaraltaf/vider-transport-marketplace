/**
 * Permission Denied Component
 * Displays user-friendly permission denied messages
 */

import React from 'react';
import type { PermissionError } from '../../services/error-handling/utils/permissionUtils';

interface PermissionDeniedProps {
  error: PermissionError;
  onContactAdmin?: () => void;
  onGoBack?: () => void;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  error,
  onContactAdmin,
  onGoBack,
}) => {
  return (
    <div className="permission-denied-container" role="alert" aria-live="polite">
      <div className="permission-denied-content">
        <div className="permission-denied-icon">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="permission-denied-title">Access Denied</h2>

        <p className="permission-denied-message">{error.message}</p>

        {error.suggestedAction && (
          <p className="permission-denied-suggestion">{error.suggestedAction}</p>
        )}

        <div className="permission-denied-details">
          <p>
            <strong>Your Role:</strong> {error.userRole}
          </p>
          <p>
            <strong>Required Permission:</strong> {error.requiredPermission}
          </p>
        </div>

        <div className="permission-denied-actions">
          {onGoBack && (
            <button
              onClick={onGoBack}
              className="btn btn-secondary"
              aria-label="Go back to previous page"
            >
              Go Back
            </button>
          )}
          {onContactAdmin && (
            <button
              onClick={onContactAdmin}
              className="btn btn-primary"
              aria-label="Contact administrator for access"
            >
              Contact Administrator
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .permission-denied-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          padding: 2rem;
        }

        .permission-denied-content {
          max-width: 500px;
          text-align: center;
        }

        .permission-denied-icon {
          color: #dc2626;
          margin-bottom: 1.5rem;
        }

        .permission-denied-icon svg {
          margin: 0 auto;
        }

        .permission-denied-title {
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1rem;
        }

        .permission-denied-message {
          font-size: 1rem;
          color: #6b7280;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .permission-denied-suggestion {
          font-size: 0.875rem;
          color: #4b5563;
          margin-bottom: 1.5rem;
          padding: 0.75rem;
          background-color: #f3f4f6;
          border-radius: 0.375rem;
        }

        .permission-denied-details {
          text-align: left;
          padding: 1rem;
          background-color: #f9fafb;
          border-radius: 0.375rem;
          margin-bottom: 1.5rem;
        }

        .permission-denied-details p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          color: #374151;
        }

        .permission-denied-details strong {
          font-weight: 600;
        }

        .permission-denied-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .btn {
          padding: 0.625rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 0.375rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
        }

        .btn-primary {
          background-color: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background-color: #2563eb;
        }

        .btn-secondary {
          background-color: #e5e7eb;
          color: #374151;
        }

        .btn-secondary:hover {
          background-color: #d1d5db;
        }
      `}</style>
    </div>
  );
};

export default PermissionDenied;
