import React from 'react';
import styles from './Container.module.css';

export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'main';
}

/**
 * Container component
 * 
 * Provides a centered content container with max-width constraint
 * and responsive padding.
 * 
 * Features:
 * - Max-width of 1200px
 * - Responsive horizontal padding
 * - Centered horizontally
 * - Validates Requirements 4.5
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  className = '',
  as: Component = 'div',
}) => {
  return (
    <Component className={`${styles.container} ${className}`}>
      {children}
    </Component>
  );
};
