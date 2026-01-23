/**
 * Calendar Skeleton Component
 * Displays loading placeholder for calendar view
 */

import React from 'react';
import { Skeleton } from '../../design-system/components/Skeleton';
import styles from './CalendarSkeleton.module.css';

export interface CalendarSkeletonProps {
  className?: string;
}

export const CalendarSkeleton: React.FC<CalendarSkeletonProps> = ({
  className = '',
}) => {
  // Generate skeleton for 6 weeks (42 days)
  const skeletonDays = Array.from({ length: 42 }, (_, index) => index);

  return (
    <div className={`${styles.calendarSkeleton} ${className}`}>
      {/* Header skeleton */}
      <div className={styles.header}>
        <Skeleton variant="rectangle" width={80} height={36} aria-label="Loading navigation button" />
        <Skeleton variant="text" width={200} height={32} aria-label="Loading month title" />
        <div className={styles.headerActions}>
          <Skeleton variant="rectangle" width={80} height={36} aria-label="Loading navigation button" />
          <Skeleton variant="rectangle" width={100} height={36} aria-label="Loading export button" />
        </div>
      </div>

      {/* Legend skeleton */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <Skeleton variant="rectangle" width={16} height={16} />
          <Skeleton variant="text" width={60} height={16} />
        </div>
        <div className={styles.legendItem}>
          <Skeleton variant="rectangle" width={16} height={16} />
          <Skeleton variant="text" width={50} height={16} />
        </div>
        <div className={styles.legendItem}>
          <Skeleton variant="rectangle" width={16} height={16} />
          <Skeleton variant="text" width={50} height={16} />
        </div>
      </div>

      {/* Day headers skeleton */}
      <div className={styles.dayHeaders}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className={styles.dayHeader}>
            <Skeleton variant="text" width={30} height={16} aria-label={`Loading ${day} header`} />
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton */}
      <div className={styles.daysGrid}>
        {skeletonDays.map((index) => (
          <div key={index} className={styles.dayCell}>
            <Skeleton 
              variant="rectangle" 
              width="100%" 
              height="100%" 
              aria-label={`Loading day ${index + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

CalendarSkeleton.displayName = 'CalendarSkeleton';