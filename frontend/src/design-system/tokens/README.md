# Design Tokens

Design tokens are the visual design atoms of the Vider Design System. They store visual design attributes like colors, typography, spacing, and more, ensuring consistency across the entire application.

## Table of Contents

- [Overview](#overview)
- [Colors](#colors)
- [Typography](#typography)
- [Spacing](#spacing)
- [Shadows](#shadows)
- [Borders](#borders)
- [Breakpoints](#breakpoints)
- [Usage Guidelines](#usage-guidelines)

---

## Overview

Design tokens provide a single source of truth for design decisions. They enable:

- **Consistency**: Same values used throughout the application
- **Maintainability**: Update once, change everywhere
- **Scalability**: Easy to extend and modify
- **Accessibility**: Built-in WCAG compliance

### Importing Tokens

```tsx
// Import all tokens
import { colors, typography, spacing, shadows, borders, breakpoints } from '@/design-system/tokens';

// Import specific tokens
import { colors } from '@/design-system/tokens/colors';
import { spacing } from '@/design-system/tokens/spacing';
```

---

## Colors

The color system is based on Norwegian Blue for a professional, trustworthy B2B marketplace aesthetic. All colors meet WCAG 2.1 AA contrast requirements.

### Primary Colors (Norwegian Blue)

Professional and trustworthy blue palette for brand identity.

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `colors.primary[50]` | Lightest | `#EFF6FF` | Backgrounds, hover states |
| `colors.primary[100]` | Very Light | `#DBEAFE` | Light backgrounds |
| `colors.primary[200]` | Light | `#BFDBFE` | Borders, dividers |
| `colors.primary[300]` | Light-Medium | `#93C5FD` | Disabled states |
| `colors.primary[400]` | Medium | `#60A5FA` | Hover states |
| `colors.primary[500]` | **Main Brand** | `#2563EB` | Primary buttons, links |
| `colors.primary[600]` | Medium-Dark | `#1D4ED8` | Active states |
| `colors.primary[700]` | Dark | `#1E40AF` | Text on light backgrounds |
| `colors.primary[800]` | Very Dark | `#1E3A8A` | Dark text |
| `colors.primary[900]` | Darkest | `#1E3A8A` | Headings, emphasis |

**Visual Swatches:**

```
█ 50  #EFF6FF  ░░░░░░░░░░
█ 100 #DBEAFE  ░░░░░░░░░
█ 200 #BFDBFE  ░░░░░░░░
█ 300 #93C5FD  ░░░░░░░
█ 400 #60A5FA  ░░░░░░
█ 500 #2563EB  ░░░░░  ← Main Brand Color
█ 600 #1D4ED8  ░░░░
█ 700 #1E40AF  ░░░
█ 800 #1E3A8A  ░░
█ 900 #1E3A8A  ░
```

### Neutral Colors (Grays)

Grayscale palette for text, backgrounds, and UI elements.

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `colors.gray[50]` | Lightest | `#F9FAFB` | Page backgrounds |
| `colors.gray[100]` | Very Light | `#F3F4F6` | Hover backgrounds |
| `colors.gray[200]` | Light | `#E5E7EB` | Borders, dividers |
| `colors.gray[300]` | Light-Medium | `#D1D5DB` | Disabled text |
| `colors.gray[400]` | Medium | `#9CA3AF` | Placeholder text |
| `colors.gray[500]` | Medium-Dark | `#6B7280` | Secondary text |
| `colors.gray[600]` | Dark | `#4B5563` | Body text |
| `colors.gray[700]` | Very Dark | `#374151` | Headings |
| `colors.gray[800]` | Darker | `#1F2937` | Dark headings |
| `colors.gray[900]` | Darkest | `#111827` | Emphasis text |

**Visual Swatches:**

```
█ 50  #F9FAFB  ░░░░░░░░░░
█ 100 #F3F4F6  ░░░░░░░░░
█ 200 #E5E7EB  ░░░░░░░░
█ 300 #D1D5DB  ░░░░░░░
█ 400 #9CA3AF  ░░░░░░
█ 500 #6B7280  ░░░░░
█ 600 #4B5563  ░░░░
█ 700 #374151  ░░░
█ 800 #1F2937  ░░
█ 900 #111827  ░
```

### Semantic Colors

Colors with specific meanings for status and feedback.

| Token | Value | Hex | Usage | Contrast |
|-------|-------|-----|-------|----------|
| `colors.semantic.success` | Green | `#047857` | Success states, confirmations | 4.5:1 ✓ |
| `colors.semantic.warning` | Amber | `#B45309` | Warnings, cautions | 4.5:1 ✓ |
| `colors.semantic.error` | Red | `#DC2626` | Errors, destructive actions | 4.5:1 ✓ |
| `colors.semantic.info` | Blue | `#2563EB` | Information, neutral notices | 4.5:1 ✓ |

**Visual Swatches:**

```
█ Success  #047857  ✓ Completed, Active
█ Warning  #B45309  ⚠ Pending, Caution
█ Error    #DC2626  ✗ Failed, Cancelled
█ Info     #2563EB  ℹ Information, New
```

### Background Colors

Pre-defined background colors for common use cases.

| Token | Value | Hex | Usage |
|-------|-------|-----|-------|
| `colors.background.page` | Gray 50 | `#F9FAFB` | Page backgrounds |
| `colors.background.card` | White | `#FFFFFF` | Card backgrounds |
| `colors.background.hover` | Gray 100 | `#F3F4F6` | Hover states |
| `colors.background.active` | Gray 200 | `#E5E7EB` | Active/pressed states |

### Common Colors

| Token | Value | Hex |
|-------|-------|-----|
| `colors.white` | White | `#FFFFFF` |
| `colors.black` | Black | `#000000` |

### Usage Examples

```tsx
import { colors } from '@/design-system/tokens';

// Primary button
const buttonStyle = {
  backgroundColor: colors.primary[500],
  color: colors.white,
};

// Success badge
const badgeStyle = {
  backgroundColor: colors.semantic.success,
  color: colors.white,
};

// Card with hover
const cardStyle = {
  backgroundColor: colors.background.card,
  '&:hover': {
    backgroundColor: colors.background.hover,
  },
};

// Text colors
const textStyle = {
  color: colors.gray[900], // Heading
  secondaryColor: colors.gray[600], // Body text
  mutedColor: colors.gray[400], // Placeholder
};
```

### Accessibility Notes

- All semantic colors meet WCAG 2.1 AA contrast ratio (4.5:1) when used with white text
- Primary color updated from `#3B82F6` to `#2563EB` for better contrast
- Test color combinations with a contrast checker before use
- Use semantic colors consistently (green for success, red for errors, etc.)

---

## Typography

Typography tokens define font families, sizes, weights, and line heights for consistent text styling.

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `typography.fontFamily.primary` | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | Body text, UI elements |
| `typography.fontFamily.mono` | `'Fira Code', 'Courier New', monospace` | Code, technical content |

**Features:**
- Inter: Modern, highly legible sans-serif optimized for UI
- System font fallbacks for performance
- Monospace for code and technical content

### Font Sizes

Font sizes use **fluid typography** with CSS `clamp()` for responsive scaling between mobile and desktop.

| Token | Min Size | Preferred | Max Size | Pixels (approx) | Usage |
|-------|----------|-----------|----------|-----------------|-------|
| `typography.fontSize.xs` | 0.7rem | 0.65rem + 0.25vw | 0.75rem | 11-12px | Fine print, captions |
| `typography.fontSize.sm` | 0.8rem | 0.75rem + 0.25vw | 0.875rem | 13-14px | Small text, labels |
| `typography.fontSize.base` | 0.9rem | 0.85rem + 0.25vw | 1rem | 14-16px | Body text (default) |
| `typography.fontSize.lg` | 1rem | 0.95rem + 0.25vw | 1.125rem | 16-18px | Large body text |
| `typography.fontSize.xl` | 1.1rem | 1rem + 0.5vw | 1.25rem | 18-20px | Small headings |
| `typography.fontSize['2xl']` | 1.25rem | 1.1rem + 0.75vw | 1.5rem | 20-24px | H4 headings |
| `typography.fontSize['3xl']` | 1.5rem | 1.3rem + 1vw | 1.875rem | 24-30px | H3 headings |
| `typography.fontSize['4xl']` | 1.75rem | 1.5rem + 1.25vw | 2.25rem | 28-36px | H2 headings |
| `typography.fontSize['5xl']` | 2rem | 1.75rem + 1.5vw | 3rem | 32-48px | H1 headings |

**Visual Scale:**

```
5xl  ████████████████████  H1 - Page Titles
4xl  ██████████████████    H2 - Section Titles
3xl  ████████████████      H3 - Subsection Titles
2xl  ██████████████        H4 - Card Titles
xl   ████████████          Small Headings
lg   ██████████            Large Body
base ████████              Body Text (Default)
sm   ██████                Labels, Small Text
xs   ████                  Captions, Fine Print
```

**Fluid Typography Benefits:**
- Smooth scaling between mobile and desktop
- No abrupt size changes at breakpoints
- Optimal readability at all screen sizes
- Supports text scaling up to 200% for accessibility

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `typography.fontWeight.regular` | 400 | Body text, paragraphs |
| `typography.fontWeight.medium` | 500 | Emphasized text, labels |
| `typography.fontWeight.semibold` | 600 | Subheadings, buttons |
| `typography.fontWeight.bold` | 700 | Headings, strong emphasis |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `typography.lineHeight.tight` | 1.25 | Headings, compact text |
| `typography.lineHeight.normal` | 1.5 | Body text (default) |
| `typography.lineHeight.relaxed` | 1.75 | Long-form content |

### Usage Examples

```tsx
import { typography } from '@/design-system/tokens';

// Heading styles
const h1Style = {
  fontFamily: typography.fontFamily.primary,
  fontSize: typography.fontSize['5xl'],
  fontWeight: typography.fontWeight.bold,
  lineHeight: typography.lineHeight.tight,
};

// Body text
const bodyStyle = {
  fontFamily: typography.fontFamily.primary,
  fontSize: typography.fontSize.base,
  fontWeight: typography.fontWeight.regular,
  lineHeight: typography.lineHeight.normal,
};

// Button text
const buttonStyle = {
  fontFamily: typography.fontFamily.primary,
  fontSize: typography.fontSize.base,
  fontWeight: typography.fontWeight.semibold,
};

// Code block
const codeStyle = {
  fontFamily: typography.fontFamily.mono,
  fontSize: typography.fontSize.sm,
};
```

### Accessibility Notes

- Fluid typography ensures readability at all screen sizes
- Supports text scaling up to 200% without breaking layouts
- Line heights provide adequate spacing for readability
- Use semantic HTML headings (h1-h6) with appropriate font sizes

---

## Spacing

Spacing tokens are based on an **8px grid system** for consistent and harmonious layouts.

### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `spacing[0]` | 0 | 0px | No spacing |
| `spacing[1]` | 0.25rem | 4px | Tight spacing, icon gaps |
| `spacing[2]` | 0.5rem | 8px | Base unit, small gaps |
| `spacing[3]` | 0.75rem | 12px | Compact spacing |
| `spacing[4]` | 1rem | 16px | Standard spacing |
| `spacing[5]` | 1.25rem | 20px | Medium spacing |
| `spacing[6]` | 1.5rem | 24px | Card padding, section gaps |
| `spacing[8]` | 2rem | 32px | Large spacing |
| `spacing[10]` | 2.5rem | 40px | Section spacing |
| `spacing[12]` | 3rem | 48px | Large section spacing |
| `spacing[16]` | 4rem | 64px | Extra large spacing |
| `spacing[20]` | 5rem | 80px | Page section spacing |

### Visual Scale

```
20  ████████████████████  80px  Page Sections
16  ████████████████      64px  Extra Large
12  ████████████          48px  Large Sections
10  ██████████            40px  Sections
8   ████████              32px  Large Gaps
6   ██████                24px  Card Padding
5   █████                 20px  Medium Gaps
4   ████                  16px  Standard Gaps
3   ███                   12px  Compact Gaps
2   ██                    8px   Base Unit
1   █                     4px   Tight Gaps
0                         0px   No Spacing
```

### 8px Grid System

All spacing values are multiples of 8px (except `spacing[1]` which is 4px for fine-tuning).

**Benefits:**
- Visual consistency and rhythm
- Easier to maintain and scale
- Aligns with common design practices
- Creates harmonious layouts

### Usage Examples

```tsx
import { spacing } from '@/design-system/tokens';

// Card padding
const cardStyle = {
  padding: spacing[6], // 24px
};

// Stack spacing
const stackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: spacing[4], // 16px
};

// Button padding
const buttonStyle = {
  paddingTop: spacing[2],    // 8px
  paddingBottom: spacing[2],  // 8px
  paddingLeft: spacing[4],    // 16px
  paddingRight: spacing[4],   // 16px
};

// Section margins
const sectionStyle = {
  marginTop: spacing[12],    // 48px
  marginBottom: spacing[12], // 48px
};

// Icon gap
const iconGapStyle = {
  marginRight: spacing[1], // 4px
};
```

### Common Spacing Patterns

| Pattern | Spacing | Usage |
|---------|---------|-------|
| Icon + Text | `spacing[1]` or `spacing[2]` | Small gap between icon and label |
| Form Fields | `spacing[4]` | Vertical spacing between inputs |
| Card Content | `spacing[6]` | Internal card padding |
| Button Group | `spacing[3]` | Gap between buttons |
| Section Divider | `spacing[8]` or `spacing[12]` | Space between page sections |
| Page Margins | `spacing[16]` or `spacing[20]` | Top/bottom page spacing |

---

## Shadows

Shadow tokens create depth and hierarchy through elevation.

### Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `shadows.none` | none | Flat elements, no elevation |
| `shadows.sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Subtle elevation, borders |
| `shadows.base` | `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)` | Cards, default elevation |
| `shadows.md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)` | Hover states, raised cards |
| `shadows.lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)` | Modals, dropdowns |
| `shadows.xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)` | Large modals, overlays |

### Visual Elevation

```
xl    ▓▓▓▓▓▓▓▓  Large Modals, Overlays
lg    ▓▓▓▓▓▓    Modals, Dropdowns
md    ▓▓▓▓      Hover States, Raised Cards
base  ▓▓        Cards, Default Elevation
sm    ▓         Subtle Elevation, Borders
none            Flat Elements
```

### Usage Examples

```tsx
import { shadows } from '@/design-system/tokens';

// Card
const cardStyle = {
  boxShadow: shadows.base,
  '&:hover': {
    boxShadow: shadows.md,
  },
};

// Modal
const modalStyle = {
  boxShadow: shadows.lg,
};

// Dropdown
const dropdownStyle = {
  boxShadow: shadows.lg,
};

// Navbar (on scroll)
const navbarStyle = {
  boxShadow: shadows.sm,
};
```

### Elevation Hierarchy

Use shadows to establish visual hierarchy:

1. **Level 0** (none): Flat elements, backgrounds
2. **Level 1** (sm): Subtle borders, dividers
3. **Level 2** (base): Cards, panels
4. **Level 3** (md): Hover states, active cards
5. **Level 4** (lg): Modals, dropdowns, popovers
6. **Level 5** (xl): Large overlays, important dialogs

---

## Borders

Border tokens define border radius and width for consistent rounded corners.

### Border Radius

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `borders.radius.sm` | 0.125rem | 2px | Tight corners, badges |
| `borders.radius.base` | 0.25rem | 4px | Default corners, inputs |
| `borders.radius.md` | 0.375rem | 6px | Medium corners, buttons |
| `borders.radius.lg` | 0.5rem | 8px | Large corners, cards |
| `borders.radius.xl` | 0.75rem | 12px | Extra large corners |
| `borders.radius['2xl']` | 1rem | 16px | Very large corners |
| `borders.radius.full` | 9999px | Pill | Pill-shaped, circles |

### Visual Radius Scale

```
full  ●●●●●●●●  Pill Shape, Circles
2xl   ╭────╮    Very Large Corners
xl    ╭───╮     Extra Large Corners
lg    ╭──╮      Large Corners (Cards)
md    ╭─╮       Medium Corners (Buttons)
base  ╭╮        Default Corners (Inputs)
sm    ╭         Tight Corners (Badges)
```

### Border Width

| Token | Value | Usage |
|-------|-------|-------|
| `borders.width.none` | 0 | No border |
| `borders.width.thin` | 1px | Default borders, dividers |
| `borders.width.base` | 2px | Emphasized borders, focus states |
| `borders.width.thick` | 4px | Strong emphasis |

### Usage Examples

```tsx
import { borders } from '@/design-system/tokens';

// Card
const cardStyle = {
  borderRadius: borders.radius.lg,
};

// Button
const buttonStyle = {
  borderRadius: borders.radius.md,
};

// Input
const inputStyle = {
  borderRadius: borders.radius.base,
  borderWidth: borders.width.thin,
};

// Badge
const badgeStyle = {
  borderRadius: borders.radius.full,
};

// Avatar
const avatarStyle = {
  borderRadius: borders.radius.full,
};
```

---

## Breakpoints

Breakpoint tokens define responsive design breakpoints for mobile-first layouts.

### Breakpoint Scale

| Token | Value | Device | Usage |
|-------|-------|--------|-------|
| `breakpoints.sm` | 640px | Small tablets | Single to multi-column transition |
| `breakpoints.md` | 768px | Tablets | Mobile to desktop transition |
| `breakpoints.lg` | 1024px | Laptops | Standard desktop layouts |
| `breakpoints.xl` | 1280px | Desktops | Large desktop layouts |
| `breakpoints['2xl']` | 1536px | Large desktops | Extra large layouts |

### Device Ranges

```
Mobile:        0px - 639px   (< sm)
Small Tablet:  640px - 767px (sm)
Tablet:        768px - 1023px (md)
Laptop:        1024px - 1279px (lg)
Desktop:       1280px - 1535px (xl)
Large Desktop: 1536px+        (2xl)
```

### Usage Examples

```tsx
import { breakpoints } from '@/design-system/tokens';

// CSS Modules
.container {
  padding: 1rem;
  
  @media (min-width: ${breakpoints.md}) {
    padding: 2rem;
  }
  
  @media (min-width: ${breakpoints.lg}) {
    padding: 3rem;
  }
}

// Styled components
const Container = styled.div`
  padding: 1rem;
  
  @media (min-width: ${breakpoints.md}) {
    padding: 2rem;
  }
`;

// JavaScript
const isMobile = window.innerWidth < parseInt(breakpoints.md);
```

### Mobile-First Approach

Always design for mobile first, then progressively enhance for larger screens:

```css
/* ✅ Good: Mobile-first */
.element {
  font-size: 14px; /* Mobile */
}

@media (min-width: 768px) {
  .element {
    font-size: 16px; /* Tablet+ */
  }
}

/* ❌ Bad: Desktop-first */
.element {
  font-size: 16px; /* Desktop */
}

@media (max-width: 767px) {
  .element {
    font-size: 14px; /* Mobile */
  }
}
```

---

## Usage Guidelines

### General Principles

1. **Always use tokens**: Never hard-code values
2. **Consistency**: Use the same token for the same purpose
3. **Semantic meaning**: Choose tokens based on their intended use
4. **Accessibility**: Tokens are designed for WCAG compliance
5. **Responsive**: Leverage breakpoints and fluid typography

### Do's and Don'ts

**✅ Do:**
```tsx
// Use design tokens
import { colors, spacing } from '@/design-system/tokens';

const style = {
  color: colors.primary[500],
  padding: spacing[4],
};
```

**❌ Don't:**
```tsx
// Hard-code values
const style = {
  color: '#3B82F6',
  padding: '16px',
};
```

**✅ Do:**
```tsx
// Use semantic colors
<Badge variant="success">Active</Badge>
<Badge variant="error">Failed</Badge>
```

**❌ Don't:**
```tsx
// Use arbitrary colors
<Badge color="#10B981">Active</Badge>
<Badge color="#EF4444">Failed</Badge>
```

### Token Selection Guide

**Colors:**
- Use `primary` for brand actions (buttons, links)
- Use `semantic` for status (success, warning, error, info)
- Use `gray` for text and UI elements
- Test contrast ratios for accessibility

**Typography:**
- Use `base` for body text
- Use `sm` for labels and captions
- Use `xl` to `5xl` for headings
- Use `semibold` or `bold` for emphasis

**Spacing:**
- Use `spacing[2]` (8px) as the base unit
- Use `spacing[4]` (16px) for standard gaps
- Use `spacing[6]` (24px) for card padding
- Use `spacing[8]` or higher for section spacing

**Shadows:**
- Use `base` for cards
- Use `md` for hover states
- Use `lg` for modals and dropdowns
- Use `none` for flat designs

**Borders:**
- Use `radius.base` for inputs
- Use `radius.md` for buttons
- Use `radius.lg` for cards
- Use `radius.full` for pills and avatars

### Extending Tokens

If you need to add new tokens:

1. Follow existing naming conventions
2. Maintain consistency with the scale
3. Document the new token
4. Update TypeScript types
5. Consider accessibility implications

---

## TypeScript Support

All tokens are fully typed for TypeScript:

```tsx
import type { Colors, Typography, Spacing, Shadows, Borders, Breakpoints } from '@/design-system/tokens';

// Type-safe token usage
const myColor: string = colors.primary[500];
const mySpacing: string = spacing[4];
```

---

## Additional Resources

- [Component Documentation](../README.md) - How to use tokens in components
- [Accessibility Guide](../ACCESSIBILITY.md) - Accessibility considerations
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Web accessibility standards

---

## Support

For questions about design tokens or to suggest improvements, please contact the development team or create an issue in the project repository.
