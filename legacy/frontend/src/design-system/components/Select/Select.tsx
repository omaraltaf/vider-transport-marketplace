import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      success = false,
      helperText,
      options,
      value,
      onChange,
      placeholder,
      required = false,
      disabled = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    
    const wrapperClasses = [
      styles.wrapper,
      error && styles.error,
      success && styles.success,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    };

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        
        <div className={styles.selectContainer}>
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            className={styles.select}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <span className={styles.icon}>
            <ChevronDown size={20} />
          </span>
        </div>
        
        {error && (
          <div id={`${selectId}-error`} className={styles.errorMessage} role="alert">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        
        {!error && helperText && (
          <div id={`${selectId}-helper`} className={styles.helperText}>
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
