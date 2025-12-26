import React, { useState, useMemo, memo, useCallback } from 'react';
import { AlertCircle, Calendar, Repeat, RefreshCw } from 'lucide-react';
import { Button } from '../../design-system/components/Button';
import { Card } from '../../design-system/components/Card';
import { Input } from '../../design-system/components/Input';
import { Textarea } from '../../design-system/components/Textarea';
import { Skeleton } from '../../design-system/components/Skeleton';
import { ErrorBoundary } from './ErrorBoundary';
import { apiClient } from '../../services/api';
import { tokenManager } from '../../services/error-handling/TokenManager';
import useRetry from '../../hooks/useRetry';
import styles from './RecurringBlockForm.module.css';

export interface RecurringBlock {
  id: string;
  listingId: string;
  listingType: 'vehicle' | 'driver';
  daysOfWeek: number[];
  startDate: string;
  endDate?: string;
  reason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringBlockFormProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  existingBlock?: RecurringBlock;
  mode?: 'create' | 'edit';
  onBlockCreated?: (block: RecurringBlock) => void;
  onBlockUpdated?: (block: RecurringBlock) => void;
  onCancel: () => void;
  className?: string;
  loading?: boolean;
}

interface FormErrors {
  daysOfWeek?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  general?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const RecurringBlockFormComponent: React.FC<RecurringBlockFormProps> = ({
  listingId,
  listingType,
  existingBlock,
  mode = 'create',
  onBlockCreated,
  onBlockUpdated,
  onCancel,
  className = '',
  loading = false,
}) => {
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    existingBlock?.daysOfWeek || []
  );
  const [startDate, setStartDate] = useState(
    existingBlock?.startDate ? existingBlock.startDate.split('T')[0] : ''
  );
  const [endDate, setEndDate] = useState(
    existingBlock?.endDate ? existingBlock.endDate.split('T')[0] : ''
  );
  const [hasEndDate, setHasEndDate] = useState(!!existingBlock?.endDate);
  const [reason, setReason] = useState(existingBlock?.reason || '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateScope, setUpdateScope] = useState<'all' | 'future'>('future');
  const [deleteScope, setDeleteScope] = useState<'all' | 'future'>('future');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { retry, isRetrying, canRetry, reset: resetRetry } = useRetry({ maxAttempts: 3 });

  // Get today's date in YYYY-MM-DD format for min attribute
  const today = new Date().toISOString().split('T')[0];

  // Toggle day of week selection - memoized for performance
  const toggleDayOfWeek = useCallback((day: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
    if (errors.daysOfWeek) {
      setErrors((prev) => ({ ...prev, daysOfWeek: undefined }));
    }
  }, [errors.daysOfWeek]);

  // Generate preview of recurring instances - optimized for performance
  const previewInstances = useMemo(() => {
    if (daysOfWeek.length === 0 || !startDate) {
      return [];
    }

    const instances: Date[] = [];
    const start = new Date(startDate);
    const end = hasEndDate && endDate ? new Date(endDate) : new Date(start);
    
    // Show next 4 weeks or until end date (limit to 20 instances for performance)
    const previewEnd = new Date(start);
    previewEnd.setDate(previewEnd.getDate() + 28);
    
    const finalEnd = hasEndDate && endDate ? new Date(Math.min(end.getTime(), previewEnd.getTime())) : previewEnd;

    let currentDate = new Date(start);
    const maxInstances = 20; // Limit for performance
    
    while (currentDate <= finalEnd && instances.length < maxInstances) {
      if (daysOfWeek.includes(currentDate.getDay())) {
        instances.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return instances;
  }, [daysOfWeek, startDate, endDate, hasEndDate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (daysOfWeek.length === 0) {
      newErrors.daysOfWeek = 'Select at least one day of the week';
    }

    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (hasEndDate && !endDate) {
      newErrors.endDate = 'End date is required when enabled';
    }

    if (startDate && hasEndDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        newErrors.endDate = 'End date must be after or equal to start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const validToken = await tokenManager.getValidToken();

      const payload = {
        listingId,
        listingType,
        daysOfWeek,
        startDate,
        endDate: hasEndDate && endDate ? endDate : undefined,
        reason: reason.trim() || undefined,
      };

      if (mode === 'create') {
        const response = await apiClient.post<{ recurringBlock: RecurringBlock }>(
          '/availability/recurring',
          payload,
          validToken
        );

        if (onBlockCreated) {
          onBlockCreated(response.recurringBlock);
        }
      } else if (mode === 'edit' && existingBlock) {
        const response = await apiClient.put<{ recurringBlock: RecurringBlock }>(
          `/availability/recurring/${existingBlock.id}`,
          {
            ...payload,
            updateScope,
          },
          token
        );

        if (onBlockUpdated) {
          onBlockUpdated(response.recurringBlock);
        }
      }

      // Reset form
      setDaysOfWeek([]);
      setStartDate('');
      setEndDate('');
      setHasEndDate(false);
      setReason('');
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to save recurring block' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingBlock) return;

    setIsSubmitting(true);

    try {
      const validToken = await tokenManager.getValidToken();

      await apiClient.delete(
        `/availability/recurring/${existingBlock.id}?scope=${deleteScope}`,
        validToken
      );

      onCancel();
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to delete recurring block' });
      }
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Format date - memoized for performance
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Show loading skeleton
  if (loading) {
    return (
      <Card className={`${styles.recurringForm} ${className}`} padding="lg">
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <Skeleton variant="circle" width={24} height={24} />
            <div>
              <Skeleton variant="text" width={200} height={24} />
              <Skeleton variant="text" width="80%" height={16} />
            </div>
          </div>
        </div>
        <div className={styles.form}>
          <div className={styles.fieldGroup}>
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="text" width="60%" height={14} />
            <div className={styles.daysGrid}>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} variant="rectangle" width={60} height={40} />
              ))}
            </div>
          </div>
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
            <Skeleton variant="rectangle" width={160} height={40} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Card className={`${styles.recurringForm} ${className}`} padding="lg">
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <Repeat size={24} className={styles.icon} />
            <div>
              <h3 className={styles.title}>
                {mode === 'create' ? 'Create Recurring Block' : 'Edit Recurring Block'}
              </h3>
              <p className={styles.description}>
                Block specific days of the week on a recurring schedule
              </p>
            </div>
          </div>
        </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Days of Week Selector */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            Days of Week <span className={styles.required}>*</span>
          </label>
          <p className={styles.helperText}>
            Select which days of the week should be blocked
          </p>
          <div className={styles.daysGrid}>
            {DAYS_OF_WEEK.map((day) => (
              <label
                key={day.value}
                className={`${styles.dayCheckbox} ${
                  daysOfWeek.includes(day.value) ? styles.checked : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={daysOfWeek.includes(day.value)}
                  onChange={() => toggleDayOfWeek(day.value)}
                  disabled={isSubmitting}
                  className={styles.hiddenCheckbox}
                />
                <span className={styles.dayLabel}>{day.short}</span>
                <span className={styles.dayLabelFull}>{day.label}</span>
              </label>
            ))}
          </div>
          {errors.daysOfWeek && (
            <span className={styles.error}>{errors.daysOfWeek}</span>
          )}
        </div>

        {/* Date Range */}
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
          />

          <div className={styles.endDateField}>
            <div className={styles.endDateToggle}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => {
                    setHasEndDate(e.target.checked);
                    if (!e.target.checked) {
                      setEndDate('');
                      setErrors((prev) => ({ ...prev, endDate: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  className={styles.checkbox}
                />
                <span>Set end date (optional)</span>
              </label>
            </div>
            {hasEndDate && (
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
                required={hasEndDate}
                min={startDate || today}
                disabled={isSubmitting}
                helperText="Leave unchecked for indefinite recurrence"
              />
            )}
          </div>
        </div>

        {/* Reason */}
        <Textarea
          label="Reason (Optional)"
          value={reason}
          onChange={setReason}
          error={errors.reason}
          placeholder="e.g., Weekly maintenance, Weekend unavailability, etc."
          rows={3}
          disabled={isSubmitting}
          helperText="Provide a reason for this recurring block (visible only to you)"
        />

        {/* Preview */}
        {previewInstances.length > 0 && (
          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <Calendar size={18} />
              <h4 className={styles.previewTitle}>Preview (Next 4 weeks)</h4>
            </div>
            <div className={styles.previewDates}>
              {previewInstances.map((date, index) => (
                <span key={index} className={styles.previewDate}>
                  {formatDate(date)}
                </span>
              ))}
              {previewInstances.length >= 20 && (
                <span className={styles.previewMore}>+ more...</span>
              )}
            </div>
          </div>
        )}

        {/* Update Scope (Edit Mode) */}
        {mode === 'edit' && (
          <div className={styles.scopeSelector}>
            <label className={styles.label}>Update Scope</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="updateScope"
                  value="future"
                  checked={updateScope === 'future'}
                  onChange={(e) => setUpdateScope(e.target.value as 'all' | 'future')}
                  disabled={isSubmitting}
                  className={styles.radio}
                />
                <span>Future instances only</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="updateScope"
                  value="all"
                  checked={updateScope === 'all'}
                  onChange={(e) => setUpdateScope(e.target.value as 'all' | 'future')}
                  disabled={isSubmitting}
                  className={styles.radio}
                />
                <span>All instances</span>
              </label>
            </div>
          </div>
        )}

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
                  onClick={() => handleSubmit(new Event('submit') as any)}
                  leftIcon={<RefreshCw size={14} />}
                  className={styles.retryButton}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {mode === 'edit' && !showDeleteConfirm && (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSubmitting}
            >
              Delete
            </Button>
          )}
          <div className={styles.primaryActions}>
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
              {isSubmitting || isRetrying
                ? mode === 'create'
                  ? 'Creating...'
                  : 'Updating...'
                : mode === 'create'
                ? 'Create Recurring Block'
                : 'Update Recurring Block'}
            </Button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className={styles.deleteConfirm}>
            <h4 className={styles.deleteTitle}>Delete Recurring Block?</h4>
            <p className={styles.deleteMessage}>
              Choose which instances to delete:
            </p>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="deleteScope"
                  value="future"
                  checked={deleteScope === 'future'}
                  onChange={(e) => setDeleteScope(e.target.value as 'all' | 'future')}
                  disabled={isSubmitting}
                  className={styles.radio}
                />
                <span>Future instances only</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="deleteScope"
                  value="all"
                  checked={deleteScope === 'all'}
                  onChange={(e) => setDeleteScope(e.target.value as 'all' | 'future')}
                  disabled={isSubmitting}
                  className={styles.radio}
                />
                <span>All instances</span>
              </label>
            </div>
            <div className={styles.deleteActions}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting || isRetrying}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                loading={isSubmitting || isRetrying}
                disabled={isSubmitting || isRetrying}
              >
                {isSubmitting || isRetrying ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Card>
    </ErrorBoundary>
  );
};

// Memoized RecurringBlockForm component for performance
export const RecurringBlockForm = memo(RecurringBlockFormComponent, (prevProps, nextProps) => {
  return (
    prevProps.listingId === nextProps.listingId &&
    prevProps.listingType === nextProps.listingType &&
    prevProps.mode === nextProps.mode &&
    prevProps.loading === nextProps.loading &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.existingBlock) === JSON.stringify(nextProps.existingBlock)
  );
});

RecurringBlockForm.displayName = 'RecurringBlockForm';
