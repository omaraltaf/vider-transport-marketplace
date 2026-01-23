import React from 'react';
import styles from './Grid.module.css';

export interface GridProps {
  children: React.ReactNode;
  columns?: number | { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  className?: string;
}

/**
 * Grid component
 * 
 * Provides a CSS Grid layout with responsive column configuration
 * and customizable gap spacing.
 * 
 * Features:
 * - CSS Grid layout
 * - Responsive column configuration
 * - Gap spacing based on design tokens (8px grid)
 * - Validates Requirements 4.3
 * 
 * @example
 * // Simple 3-column grid
 * <Grid columns={3} gap={4}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Grid>
 * 
 * @example
 * // Responsive grid: 1 col on mobile, 2 on tablet, 3 on desktop
 * <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={6}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Grid>
 */
export const Grid: React.FC<GridProps> = ({
  children,
  columns = 1,
  gap = 4,
  className = '',
}) => {
  // Build class names based on props
  const classNames = [styles.grid];
  
  if (typeof columns === 'number') {
    classNames.push(styles[`cols-${columns}`]);
  } else {
    if (columns.sm) classNames.push(styles[`cols-sm-${columns.sm}`]);
    if (columns.md) classNames.push(styles[`cols-md-${columns.md}`]);
    if (columns.lg) classNames.push(styles[`cols-lg-${columns.lg}`]);
    if (columns.xl) classNames.push(styles[`cols-xl-${columns.xl}`]);
  }
  
  classNames.push(styles[`gap-${gap}`]);
  
  if (className) {
    classNames.push(className);
  }
  
  return (
    <div className={classNames.join(' ')}>
      {children}
    </div>
  );
};
