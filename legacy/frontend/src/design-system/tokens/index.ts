/**
 * Design Tokens
 * Central export for all design tokens
 */

import { colors as colorsImport } from './colors';
import { typography as typographyImport } from './typography';
import { spacing as spacingImport } from './spacing';
import { shadows as shadowsImport } from './shadows';
import { borders as bordersImport } from './borders';
import { breakpoints as breakpointsImport } from './breakpoints';

export const colors = colorsImport;
export const typography = typographyImport;
export const spacing = spacingImport;
export const shadows = shadowsImport;
export const borders = bordersImport;
export const breakpoints = breakpointsImport;

export type { Colors, ColorScale } from './colors';
export type { Typography } from './typography';
export type { Spacing } from './spacing';
export type { Shadows } from './shadows';
export type { Borders } from './borders';
export type { Breakpoints } from './breakpoints';

// Combined theme type
export interface Theme {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  borders: typeof borders;
  breakpoints: typeof breakpoints;
}

// Default theme export
export const theme: Theme = {
  colors,
  typography,
  spacing,
  shadows,
  borders,
  breakpoints,
};
