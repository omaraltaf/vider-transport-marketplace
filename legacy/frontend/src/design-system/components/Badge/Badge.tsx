import React from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  children,
  className = '',
}) => {
  const classNames = [
    styles.badge,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames}>
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';
