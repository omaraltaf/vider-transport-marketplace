/**
 * Color Design Tokens
 * Based on Norwegian Blue theme for professional B2B marketplace
 */

export const colors = {
  // Primary Colors (Norwegian Blue)
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB', // Main brand color - updated for WCAG AA compliance
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#1E3A8A',
  },

  // Neutral Colors (Grays)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic Colors - updated for WCAG AA compliance
  semantic: {
    success: '#047857', // Darker green for better contrast (4.5:1)
    warning: '#B45309', // Darker amber for better contrast (4.5:1)
    error: '#DC2626', // Darker red for better contrast
    info: '#2563EB', // Darker blue for better contrast
  },

  // Background Colors
  background: {
    page: '#F9FAFB', // gray-50
    card: '#FFFFFF',
    hover: '#F3F4F6', // gray-100
    active: '#E5E7EB', // gray-200
  },

  // Common colors
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type ColorScale = typeof colors.primary;
export type Colors = typeof colors;
