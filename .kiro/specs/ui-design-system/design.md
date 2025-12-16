# Design System Design Document

## Overview

This design system establishes a professional, modern visual language for the Vider Transport Marketplace. It provides a comprehensive set of design tokens, components, and patterns optimized for B2B logistics with excellent mobile responsiveness.

## Architecture

### Design Token Structure

```
tokens/
├── colors.ts       # Color palette and semantic colors
├── typography.ts   # Font families, sizes, weights, line heights
├── spacing.ts      # Spacing scale based on 8px grid
├── shadows.ts      # Elevation system
├── borders.ts      # Border radius and widths
└── breakpoints.ts  # Responsive breakpoints
```

### Component Architecture

```
components/
├── atoms/          # Basic building blocks (Button, Input, Icon)
├── molecules/      # Simple combinations (FormField, SearchBar)
├── organisms/      # Complex components (Navbar, DataTable, Modal)
└── layouts/        # Page layouts (Container, Grid, Stack)
```

## Design Tokens

### Color System

**Primary Colors** (Norwegian Blue - professional, trustworthy)
- Primary 50: `#EFF6FF`
- Primary 100: `#DBEAFE`
- Primary 200: `#BFDBFE`
- Primary 300: `#93C5FD`
- Primary 400: `#60A5FA`
- Primary 500: `#3B82F6` (Main brand color)
- Primary 600: `#2563EB`
- Primary 700: `#1D4ED8`
- Primary 800: `#1E40AF`
- Primary 900: `#1E3A8A`

**Neutral Colors** (Grays for text and backgrounds)
- Gray 50: `#F9FAFB`
- Gray 100: `#F3F4F6`
- Gray 200: `#E5E7EB`
- Gray 300: `#D1D5DB`
- Gray 400: `#9CA3AF`
- Gray 500: `#6B7280`
- Gray 600: `#4B5563`
- Gray 700: `#374151`
- Gray 800: `#1F2937`
- Gray 900: `#111827`

**Semantic Colors**
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Amber)
- Error: `#EF4444` (Red)
- Info: `#3B82F6` (Blue)

**Background Colors**
- Page Background: Gray 50
- Card Background: White
- Hover Background: Gray 100
- Active Background: Gray 200

### Typography

**Font Families**
- Primary: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Monospace: `'Fira Code', 'Courier New', monospace`

**Font Sizes** (rem-based for accessibility)
- xs: `0.75rem` (12px)
- sm: `0.875rem` (14px)
- base: `1rem` (16px)
- lg: `1.125rem` (18px)
- xl: `1.25rem` (20px)
- 2xl: `1.5rem` (24px)
- 3xl: `1.875rem` (30px)
- 4xl: `2.25rem` (36px)
- 5xl: `3rem` (48px)

**Font Weights**
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

**Line Heights**
- Tight: 1.25
- Normal: 1.5
- Relaxed: 1.75

### Spacing Scale (8px grid)

- 0: `0`
- 1: `0.25rem` (4px)
- 2: `0.5rem` (8px)
- 3: `0.75rem` (12px)
- 4: `1rem` (16px)
- 5: `1.25rem` (20px)
- 6: `1.5rem` (24px)
- 8: `2rem` (32px)
- 10: `2.5rem` (40px)
- 12: `3rem` (48px)
- 16: `4rem` (64px)
- 20: `5rem` (80px)

### Shadows (Elevation)

- sm: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- base: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)`
- md: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- lg: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- xl: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`

### Border Radius

- sm: `0.125rem` (2px)
- base: `0.25rem` (4px)
- md: `0.375rem` (6px)
- lg: `0.5rem` (8px)
- xl: `0.75rem` (12px)
- 2xl: `1rem` (16px)
- full: `9999px` (pill shape)

### Breakpoints

- sm: `640px`
- md: `768px`
- lg: `1024px`
- xl: `1280px`
- 2xl: `1536px`

## Components and Interfaces

### Button Component

**Variants:**
- Primary: Solid background with primary color
- Secondary: Solid background with gray color
- Outline: Border with transparent background
- Ghost: No border, transparent background
- Danger: Solid background with error color

**Sizes:**
- sm: Height 32px, padding 8px 12px, text sm
- md: Height 40px, padding 10px 16px, text base
- lg: Height 48px, padding 12px 24px, text lg

**States:**
- Default
- Hover (darken 10%)
- Active (darken 15%)
- Disabled (opacity 50%, cursor not-allowed)
- Loading (spinner icon, disabled)

**Props Interface:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  children: ReactNode;
}
```

### Input Component

**Variants:**
- Text
- Email
- Password
- Number
- Date
- Textarea
- Select

**States:**
- Default
- Focus (primary border, shadow)
- Error (error border, error message)
- Success (success border)
- Disabled (gray background, cursor not-allowed)

**Props Interface:**
```typescript
interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
}
```

### Card Component

**Purpose:** Container for grouped content with elevation

**Features:**
- White background
- Border radius lg
- Shadow base
- Padding 6 (24px)
- Hover state (shadow md)

**Props Interface:**
```typescript
interface CardProps {
  children: ReactNode;
  hoverable?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

### Modal Component

**Features:**
- Overlay with backdrop (rgba(0,0,0,0.5))
- Centered content card
- Close button (X icon)
- Escape key to close
- Click outside to close
- Smooth fade-in animation
- Focus trap for accessibility

**Props Interface:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}
```

### Icon System

**Library:** Lucide React (tree-shakeable, consistent style)

**Standard Icons:**
- Navigation: Menu, X, ChevronLeft, ChevronRight, ChevronDown
- Actions: Plus, Edit, Trash2, Save, Download, Upload
- Status: Check, X, AlertCircle, Info, AlertTriangle
- Content: Search, Filter, Calendar, Clock, MapPin
- User: User, Users, Building, Truck, Package
- Communication: Mail, Phone, MessageSquare, Bell

**Icon Sizes:**
- sm: 16px
- md: 20px
- lg: 24px
- xl: 32px

### Responsive Table Component

**Desktop:** Traditional table layout
**Mobile:** Card-based layout with stacked rows

**Features:**
- Sortable columns
- Pagination
- Row selection
- Loading skeleton
- Empty state
- Responsive transformation

### Navigation Component

**Desktop:**
- Horizontal navbar with logo left, links center, user menu right
- Sticky positioning
- Shadow on scroll

**Mobile:**
- Hamburger menu button
- Slide-in drawer from left
- Overlay backdrop
- Logo and menu button in header

## Data Models

### Theme Configuration

```typescript
interface Theme {
  colors: {
    primary: ColorScale;
    gray: ColorScale;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: {
      primary: string;
      mono: string;
    };
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
    lineHeight: Record<string, number>;
  };
  spacing: Record<number, string>;
  shadows: Record<string, string>;
  borderRadius: Record<string, string>;
  breakpoints: Record<string, string>;
}

interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Color contrast compliance
*For any* text and background color combination used in the system, the contrast ratio should meet WCAG 2.1 AA standards (4.5:1 for normal text, 3:1 for large text)
**Validates: Requirements 6.1**

### Property 2: Touch target sizing
*For any* interactive element on mobile viewports, the minimum touch target size should be 44x44 pixels
**Validates: Requirements 2.2**

### Property 3: Responsive breakpoint consistency
*For any* component with responsive behavior, breakpoint values should match the defined breakpoint tokens
**Validates: Requirements 2.1, 2.3**

### Property 4: Spacing grid adherence
*For any* spacing value used in components, it should be a multiple of the base 8px grid unit
**Validates: Requirements 1.3**

### Property 5: Icon size consistency
*For any* icon used in the system, its size should match one of the defined icon sizes (16px, 20px, 24px, 32px)
**Validates: Requirements 5.4**

### Property 6: Component variant completeness
*For any* component with variants, all defined variants (primary, secondary, outline, ghost, danger) should be implemented
**Validates: Requirements 3.1**

### Property 7: Animation duration limits
*For any* CSS transition or animation, the duration should not exceed 300ms
**Validates: Requirements 7.5**

### Property 8: Focus indicator visibility
*For any* interactive element, a visible focus indicator should appear when focused via keyboard navigation
**Validates: Requirements 6.2**

## Error Handling

### Invalid Props
- Components should validate props and log warnings for invalid values
- Fallback to default values when invalid props are provided
- TypeScript types should prevent most invalid prop combinations

### Missing Icons
- Fallback to a default icon if specified icon is not found
- Log warning in development mode

### Responsive Breakpoints
- Use mobile-first approach with min-width media queries
- Gracefully degrade on very small screens (<320px)

### Theme Context Missing
- Provide default theme values if ThemeProvider is not present
- Log warning in development mode

## Testing Strategy

### Visual Regression Testing
- Use Chromatic or Percy for visual regression testing
- Test all component variants and states
- Test responsive breakpoints

### Unit Testing
- Test component prop handling
- Test state management
- Test event handlers
- Test accessibility attributes

### Integration Testing
- Test component composition
- Test theme provider integration
- Test responsive behavior

### Accessibility Testing
- Automated testing with axe-core
- Manual keyboard navigation testing
- Screen reader testing

### Property-Based Testing
- Use fast-check library for property-based tests
- Test color contrast ratios
- Test spacing grid adherence
- Test touch target sizes
- Test animation durations

## Implementation Notes

### CSS-in-JS vs CSS Modules
- Use CSS Modules for better performance and smaller bundle size
- Co-locate styles with components
- Use design tokens via CSS custom properties

### Icon Implementation
- Install lucide-react package
- Create Icon wrapper component for consistent sizing
- Tree-shake unused icons

### Responsive Strategy
- Mobile-first CSS with min-width media queries
- Use CSS Grid and Flexbox for layouts
- Avoid fixed widths, use max-width instead

### Performance Considerations
- Lazy load heavy components (Modal, Drawer)
- Use CSS transforms for animations (GPU-accelerated)
- Minimize re-renders with React.memo
- Use CSS custom properties for theme switching

### Accessibility Checklist
- Semantic HTML elements
- ARIA labels for icon-only buttons
- Focus management in modals
- Keyboard navigation support
- Color contrast compliance
- Text scaling support
