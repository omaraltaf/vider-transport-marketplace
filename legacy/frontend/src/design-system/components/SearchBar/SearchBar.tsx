import React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import styles from './SearchBar.module.css';

export interface SearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onClear,
      loading = false,
      placeholder = 'Search...',
      disabled = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleClear = () => {
      onChange('');
      if (onClear) {
        onClear();
      }
    };

    const wrapperClasses = [
      styles.wrapper,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        <div className={styles.inputContainer}>
          <span className={styles.searchIcon}>
            <Search size={20} />
          </span>
          
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={styles.input}
            aria-label="Search"
            {...props}
          />
          
          {loading && (
            <span className={styles.loadingIcon}>
              <Loader2 size={20} className={styles.spinner} />
            </span>
          )}
          
          {!loading && value && (
            <button
              type="button"
              onClick={handleClear}
              className={styles.clearButton}
              aria-label="Clear search"
              disabled={disabled}
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
