import React from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      hoverable = false,
      padding = 'md',
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.card,
      styles[`padding-${padding}`],
      hoverable && styles.hoverable,
      onClick && styles.clickable,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        ref={ref}
        className={classNames}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(e as any);
                }
              }
            : undefined
        }
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
