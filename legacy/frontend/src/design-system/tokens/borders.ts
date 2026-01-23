/**
 * Border Design Tokens
 * Border radius values for consistent rounded corners
 */

export const borders = {
  radius: {
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    full: '9999px',   // pill shape
  },
  width: {
    none: '0',
    thin: '1px',
    base: '2px',
    thick: '4px',
  },
} as const;

export type Borders = typeof borders;
