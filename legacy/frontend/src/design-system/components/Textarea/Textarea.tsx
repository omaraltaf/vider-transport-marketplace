import React, { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './Textarea.module.css';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
  autoResize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      success = false,
      helperText,
      value,
      onChange,
      autoResize = false,
      required = false,
      disabled = false,
      className = '',
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    
    const wrapperClasses = [
      styles.wrapper,
      error && styles.error,
      success && styles.success,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const textareaClasses = [
      styles.textarea,
      autoResize && styles.autoResize,
    ]
      .filter(Boolean)
      .join(' ');

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      
      // Auto-resize functionality
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    // Initialize auto-resize on mount
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [autoResize, value]);

    return (
      <div className={wrapperClasses}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}
        
        <textarea
          ref={textareaRef}
          id={textareaId}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          rows={rows}
          className={textareaClasses}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />
        
        {error && (
          <div id={`${textareaId}-error`} className={styles.errorMessage} role="alert">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        
        {!error && helperText && (
          <div id={`${textareaId}-helper`} className={styles.helperText}>
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
