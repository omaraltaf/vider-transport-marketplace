import React from 'react';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'current';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const classNames = [
    styles.spinner,
    styles[size],
    styles[color],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} role="status" aria-label="Loading">
      <span className={styles.visuallyHidden}>Loading...</span>
    </div>
  );
};

Spinner.displayName = 'Spinner';
