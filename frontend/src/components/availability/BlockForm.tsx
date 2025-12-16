import React, { useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { Input } from '../../design-system/components/Input';
import { Textarea } from '../../design-system/components/Textarea';
import { Skeleton } from '../../design-system/components/Skeleton';
import { ErrorBoundary } from './ErrorBoundary';
import { apiClient } from '../../services/api';
import useRetry from '../../hooks/useRetry';
import styles from './BlockForm.module.css';

export interface AvailabilityBlock {
  id: string;
  listingId: string;
  listingType: 'vehicle' | 'driver';
  startDate: string;
  endDate: string;
  reason?: string;
  isRecurring: boolean;
  recurringBlockId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlockFormProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  onBlockCreated: (block: AvailabilityBlock) => void;
  onCancel: () => void;
  className?: string;
  loading?: boolean;
}

interface ConflictError {
  type: 'block' | 'booking';
  startDate: string;
  endDate: string;
  reason?: string;
  bookingNumber?: string;
}

interface FormErrors {
  startDate?: string;
  endDate?: string;
  reason?: string;
  general?: string;
}

export const BlockForm: React.FC<BlockFormProps> = ({
  listingId,
  listingType,
  onBlockCreated,
  onCancel,
  className = '',
  loading = false,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [conflicts, setConflicts] = useState<ConflictError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { retry, isRetrying, canRetry, reset: resetRetry } = useRetry({ maxAttempts: 3 });

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        newErrors.endDate = 'End date must be after or equal to start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitBlock = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await apiClient.post<{ block: AvailabilityBlock }>(
      '/availability/blocks',
      {
        listingId,
        listingType,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      },
      token
    );

    return response.block;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors and conflicts
    setErrors({});
    setConflicts([]);
    resetRetry();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const block = await retry(submitBlock);
      onBlockCreated(block);
      
      // Reset form
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a conflict error
        if (error.message.includes('conflict')) {
          try {
            // Try to parse conflict details from error message
            const errorData = JSON.parse(error.message);
            if (errorData.conflicts) {
              setConflicts(errorData.conflicts);
              setErrors({
                general: 'Cannot create block due to conflicts with existing bookings',
              });
            } else {
              setErrors({ general: error.message });
            }
          } catch {
            setErrors({ general: error.message });
          }
        } else {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'Failed to create availability block' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!canRetry) return;
    
    setErrors({});
    setConflicts([]);
    await handleSubmit(new Event('submit') as any);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Show loading skeleton
  if (loading) {
    return (
      <Card className={`${styles.blockForm} ${className}`} padding="lg">
        <Skeleton variant="text" width={150} height={24} aria-label="Loading form title" />
        <Skeleton variant="text" width="80%" height={16} aria-label="Loading form description" />
        <div className={styles.form}>
          <div className={styles.dateFields}>
            <div>
              <Skeleton variant="text" width={80} height={16} />
              <Skeleton variant="rectangle" width="100%" height={40} />
            </div>
            <div>
              <Skeleton variant="text" width={70} height={16} />
              <Skeleton variant="rectangle" width="100%" height={40} />
            </div>
          </div>
          <div>
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="rectangle" width="100%" height={80} />
          </div>
          <div className={styles.actions}>
            <Skeleton variant="rectangle" width={80} height={40} />
            <Skeleton variant="rectangle" width={120} height={40} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Card className={`${styles.blockForm} ${className}`} padding="lg">
        <h3 className={styles.title}>Block Dates</h3>
        <p className={styles.description}>
          Select dates to make this listing unavailable for booking.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.dateFields}>
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(value) => {
              setStartDate(value);
              if (errors.startDate) {
                setErrors((prev) => ({ ...prev, startDate: undefined }));
              }
            }}
            error={errors.startDate}
            required
            min={today}
            disabled={isSubmitting}
            className={styles.dateInput}
          />

          <Input
            type="date"
            label="End Date"
            value={endDate}
            onChange={(value) => {
              setEndDate(value);
              if (errors.endDate) {
                setErrors((prev) => ({ ...prev, endDate: undefined }));
              }
            }}
            error={errors.endDate}
            required
            min={startDate || today}
            disabled={isSubmitting}
            className={styles.dateInput}
          />
        </div>

        <Textarea
          label="Reason (Optional)"
          value={reason}
          onChange={setReason}
          error={errors.reason}
          placeholder="e.g., Maintenance, Holiday, etc."
          rows={3}
          disabled={isSubmitting}
          helperText="Provide a reason for blocking these dates (visible only to you)"
        />

        {/* General error message */}
        {errors.general && (
          <div className={styles.errorAlert} role="alert">
            <AlertCircle size={20} />
            <div className={styles.errorContent}>
              <span>{errors.general}</span>
              {canRetry && !isSubmitting && !isRetrying && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRetry}
                  leftIcon={<RefreshCw size={14} />}
                  className={styles.retryButton}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Conflict details */}
        {conflicts.length > 0 && (
          <div className={styles.conflictsContainer}>
            <h4 className={styles.conflictsTitle}>Conflicts Detected:</h4>
            <ul className={styles.conflictsList}>
              {conflicts.map((conflict, index) => (
                <li key={index} className={styles.conflictItem}>
                  <strong>
                    {conflict.type === 'booking' ? 'Booking' : 'Block'}:
                  </strong>{' '}
                  {formatDate(conflict.startDate)} - {formatDate(conflict.endDate)}
                  {conflict.bookingNumber && (
                    <span className={styles.bookingNumber}>
                      {' '}
                      (Booking #{conflict.bookingNumber})
                    </span>
                  )}
                  {conflict.reason && (
                    <span className={styles.conflictReason}>
                      {' '}
                      - {conflict.reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className={styles.conflictHelp}>
              You cannot block dates that have accepted or active bookings. Please
              choose different dates or cancel the conflicting bookings first.
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting || isRetrying}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={isSubmitting || isRetrying}
            disabled={isSubmitting || isRetrying}
          >
            {isSubmitting || isRetrying ? 'Creating...' : 'Create Block'}
          </Button>
        </div>
      </form>
    </Card>
    </ErrorBoundary>
  );
};

BlockForm.displayName = 'BlockForm';
