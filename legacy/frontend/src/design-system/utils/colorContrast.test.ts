/**
 * Color Contrast Audit Tests
 * Tests all text/background combinations for WCAG 2.1 AA compliance
 * Requirements: 6.1
 */

import { describe, it, expect } from 'vitest';

// WCAG 2.1 AA Standards
const WCAG_AA_NORMAL_TEXT = 4.5; // 4.5:1 for normal text
const WCAG_AA_LARGE_TEXT = 3.0; // 3:1 for large text (18pt+ or 14pt+ bold)

/**
 * Calculate relative luminance of a color
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Color Contrast Audit - WCAG 2.1 AA Compliance', () => {
  describe('Button Component Contrast', () => {
    it('primary button should have sufficient contrast', () => {
      const ratio = getContrastRatio('#2563EB', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('secondary button should have sufficient contrast', () => {
      const ratio = getContrastRatio('#6B7280', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('danger button should have sufficient contrast', () => {
      const ratio = getContrastRatio('#DC2626', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('outline button should have sufficient contrast', () => {
      const ratio = getContrastRatio('#2563EB', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('ghost button should have sufficient contrast', () => {
      const ratio = getContrastRatio('#374151', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });
  });

  describe('Badge Component Contrast', () => {
    it('success badge should have sufficient contrast', () => {
      const ratio = getContrastRatio('#065F46', '#D1FAE5');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('warning badge should have sufficient contrast', () => {
      const ratio = getContrastRatio('#92400E', '#FEF3C7');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('error badge should have sufficient contrast', () => {
      const ratio = getContrastRatio('#991B1B', '#FEE2E2');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('info badge should have sufficient contrast', () => {
      const ratio = getContrastRatio('#1E40AF', '#DBEAFE');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('neutral badge should have sufficient contrast', () => {
      const ratio = getContrastRatio('#374151', '#F3F4F6');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });
  });

  describe('Input Component Contrast', () => {
    it('input text should have sufficient contrast', () => {
      const ratio = getContrastRatio('#1F2937', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('input label should have sufficient contrast', () => {
      const ratio = getContrastRatio('#374151', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('input placeholder should have sufficient contrast', () => {
      const ratio = getContrastRatio('#6B7280', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('error message should have sufficient contrast', () => {
      const ratio = getContrastRatio('#DC2626', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('helper text should have sufficient contrast', () => {
      const ratio = getContrastRatio('#6B7280', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });
  });

  describe('Semantic Colors Contrast', () => {
    it('success color on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#047857', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('warning color on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#B45309', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('error color on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#DC2626', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('info color on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#2563EB', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });
  });

  describe('Gray Scale Contrast', () => {
    it('gray-900 on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#111827', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('gray-800 on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#1F2937', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('gray-700 on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#374151', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('gray-600 on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#4B5563', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('gray-500 on white should have sufficient contrast', () => {
      const ratio = getContrastRatio('#6B7280', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });
  });

  describe('Link Colors Contrast', () => {
    it('primary link color should have sufficient contrast on white', () => {
      const ratio = getContrastRatio('#2563EB', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });

    it('primary link hover color should have sufficient contrast on white', () => {
      const ratio = getContrastRatio('#1D4ED8', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
    });
  });
});
