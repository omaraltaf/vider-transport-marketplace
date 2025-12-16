/**
 * Typography Design Tokens
 * Font families, sizes, weights, and line heights
 * 
 * Font sizes use fluid typography with CSS clamp() for smooth scaling
 * between mobile and desktop viewports. This ensures optimal readability
 * at all screen sizes and supports text scaling up to 200% for accessibility.
 */

export const typography = {
  // Font Families
  fontFamily: {
    primary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'Fira Code', 'Courier New', monospace",
  },

  // Font Sizes (fluid typography with clamp for responsive scaling)
  // Format: clamp(min, preferred, max)
  fontSize: {
    xs: 'clamp(0.7rem, 0.65rem + 0.25vw, 0.75rem)',    // ~11-12px
    sm: 'clamp(0.8rem, 0.75rem + 0.25vw, 0.875rem)',   // ~13-14px
    base: 'clamp(0.9rem, 0.85rem + 0.25vw, 1rem)',     // ~14-16px
    lg: 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)',     // ~16-18px
    xl: 'clamp(1.1rem, 1rem + 0.5vw, 1.25rem)',        // ~18-20px
    '2xl': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',  // ~20-24px
    '3xl': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',    // ~24-30px
    '4xl': 'clamp(1.75rem, 1.5rem + 1.25vw, 2.25rem)', // ~28-36px
    '5xl': 'clamp(2rem, 1.75rem + 1.5vw, 3rem)',       // ~32-48px
  },

  // Font Weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export type Typography = typeof typography;
