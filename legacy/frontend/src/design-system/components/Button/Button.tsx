import React from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classNames}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className={styles.spinner} size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
        ) : (
          <>
            {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
            {children}
            {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
