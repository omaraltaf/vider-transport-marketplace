/**
 * Skeleton Component
 * Displays loading placeholders with shimmer animation
 * 
 * Features:
 * - Multiple variants (text, rectangle, circle)
 * - Configurable dimensions
 * - Shimmer animation
 * - Accessible with proper ARIA attributes
 */

import React from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
  variant?: 'text' | 'rectangle' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
  'aria-label'?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  'aria-label': ariaLabel = 'Loading content',
}) => {
  const style: React.CSSProperties = {};
  
  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }

  const classNames = [
    styles.skeleton,
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={style}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <span className={styles.visuallyHidden}>Loading...</span>
    </div>
  );
};

Skeleton.displayName = 'Skeleton';