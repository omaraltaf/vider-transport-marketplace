import React from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './Input.module.css';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success = false,
      helperText,
      leftIcon,
      rightIcon,
      value,
      onChange,
      required = false,
      disabled = false,
      className = '',
      type = 'text',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    const wrapperClasses = [
      styles.wrapper,
      error && styles.error,
      success && styles.success,
      leftIcon && styles.withLeftIcon,
      rightIcon && styles.withRightIcon,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        
        <div className={styles.inputContainer}>
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          
          <input
            ref={ref}
            id={inputId}
            type={type}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            className={styles.input}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          
          {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        </div>
        
        {error && (
          <div id={`${inputId}-error`} className={styles.errorMessage} role="alert">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        
        {!error && helperText && (
          <div id={`${inputId}-helper`} className={styles.helperText}>
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
