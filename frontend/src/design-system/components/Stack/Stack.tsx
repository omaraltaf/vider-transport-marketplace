import React from 'react';
import styles from './Stack.module.css';

export interface StackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  spacing?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'nav' | 'ul' | 'ol';
}

/**
 * Stack component
 * 
 * Provides a flexbox-based layout for stacking elements vertically or horizontally
 * with consistent spacing and alignment options.
 * 
 * Features:
 * - Flexbox vertical/horizontal stacking
 * - Spacing between children based on design tokens (8px grid)
 * - Alignment and justification options
 * - Optional wrapping
 * - Validates Requirements 4.3
 * 
 * @example
 * // Vertical stack with 16px spacing
 * <Stack direction="vertical" spacing={4}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Stack>
 * 
 * @example
 * // Horizontal stack with center alignment
 * <Stack direction="horizontal" spacing={2} align="center" justify="between">
 *   <button>Cancel</button>
 *   <button>Save</button>
 * </Stack>
 */
export const Stack: React.FC<StackProps> = ({
  children,
  direction = 'vertical',
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
  as: Component = 'div',
}) => {
  const classNames = [
    styles.stack,
    styles[`direction-${direction}`],
    styles[`spacing-${spacing}`],
    styles[`align-${align}`],
    styles[`justify-${justify}`],
  ];
  
  if (wrap) {
    classNames.push(styles.wrap);
  }
  
  if (className) {
    classNames.push(className);
  }
  
  return (
    <Component className={classNames.join(' ')}>
      {children}
    </Component>
  );
};
