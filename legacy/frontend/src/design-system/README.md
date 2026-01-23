# Vider Design System

A comprehensive, accessible, and mobile-first design system for the Vider Transport Marketplace. Built with React, TypeScript, and CSS Modules.

## Table of Contents

- [Getting Started](#getting-started)
- [Design Tokens](#design-tokens)
- [Components](#components)
  - [Atomic Components](#atomic-components)
  - [Molecule Components](#molecule-components)
  - [Organism Components](#organism-components)
  - [Layout Components](#layout-components)
  - [Utility Components](#utility-components)
- [Responsive Design](#responsive-design)
- [Accessibility](#accessibility)
- [Best Practices](#best-practices)

## Getting Started

### Installation

The design system is already integrated into the project. Import components as needed:

```tsx
import { Button, Input, Card, Modal } from '@/design-system/components';
import { colors, spacing, typography } from '@/design-system/tokens';
```

### Basic Usage

```tsx
import { Button, Card, Stack } from '@/design-system/components';

function MyComponent() {
  return (
    <Card>
      <Stack spacing={4}>
        <h2>Welcome to Vider</h2>
        <Button variant="primary" size="md">
          Get Started
        </Button>
      </Stack>
    </Card>
  );
}
```

## Design Tokens

Design tokens are the visual design atoms of the design system. They define colors, typography, spacing, and other visual properties.

### Colors

```tsx
import { colors } from '@/design-system/tokens';

// Primary colors (Norwegian Blue)
colors.primary[500] // '#2563EB' - Main brand color
colors.primary[600] // '#1D4ED8' - Darker shade

// Semantic colors
colors.semantic.success // '#047857' - Green
colors.semantic.warning // '#B45309' - Amber
colors.semantic.error   // '#DC2626' - Red
colors.semantic.info    // '#2563EB' - Blue

// Neutral colors
colors.gray[50]  // '#F9FAFB' - Lightest
colors.gray[900] // '#111827' - Darkest
```

**Color Palette:**
- **Primary**: Norwegian Blue - professional and trustworthy
- **Semantic**: Success (green), Warning (amber), Error (red), Info (blue)
- **Neutral**: Gray scale from 50 to 900
- All colors meet WCAG 2.1 AA contrast requirements

### Typography

```tsx
import { typography } from '@/design-system/tokens';

// Font families
typography.fontFamily.primary // 'Inter', sans-serif
typography.fontFamily.mono    // 'Fira Code', monospace

// Font sizes (fluid typography with clamp)
typography.fontSize.xs   // ~11-12px
typography.fontSize.base // ~14-16px
typography.fontSize['2xl'] // ~20-24px

// Font weights
typography.fontWeight.regular  // 400
typography.fontWeight.semibold // 600
typography.fontWeight.bold     // 700
```

**Features:**
- Fluid typography using CSS `clamp()` for responsive scaling
- Scales smoothly from mobile to desktop
- Supports text scaling up to 200% for accessibility

### Spacing

```tsx
import { spacing } from '@/design-system/tokens';

// Based on 8px grid system
spacing[2]  // '0.5rem' (8px)
spacing[4]  // '1rem' (16px)
spacing[8]  // '2rem' (32px)
spacing[16] // '4rem' (64px)
```

**8px Grid System:**
All spacing values are multiples of 8px for visual consistency.

### Other Tokens

```tsx
import { shadows, borders, breakpoints } from '@/design-system/tokens';

// Shadows (elevation)
shadows.sm   // Subtle shadow
shadows.base // Default shadow
shadows.lg   // Prominent shadow

// Border radius
borders.radius.sm   // 2px
borders.radius.base // 4px
borders.radius.lg   // 8px
borders.radius.full // Pill shape

// Responsive breakpoints
breakpoints.sm  // 640px
breakpoints.md  // 768px
breakpoints.lg  // 1024px
breakpoints.xl  // 1280px
```

## Components

### Atomic Components

#### Button

A versatile button component with multiple variants, sizes, and states.

**Props:**
```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}
```

**Examples:**

```tsx
// Primary button
<Button variant="primary" size="md">
  Save Changes
</Button>

// Button with icon
<Button variant="primary" leftIcon={<Icon name="plus" />}>
  Add Item
</Button>

// Loading state
<Button variant="primary" loading>
  Processing...
</Button>

// Full width button
<Button variant="primary" fullWidth>
  Continue
</Button>

// Danger button
<Button variant="danger" leftIcon={<Icon name="trash" />}>
  Delete
</Button>
```

**Variants:**
- `primary`: Solid blue background (main actions)
- `secondary`: Solid gray background (secondary actions)
- `outline`: Border with transparent background
- `ghost`: No border, transparent background (subtle actions)
- `danger`: Red background (destructive actions)

**Sizes:**
- `sm`: 32px height, compact padding
- `md`: 40px height, standard padding (default)
- `lg`: 48px height, generous padding

**States:**
- Hover: Darkens by 10%
- Active: Darkens by 15%
- Disabled: 50% opacity, cursor not-allowed
- Loading: Shows spinner, disabled

**Responsive Behavior:**
- Touch targets meet 44x44px minimum on mobile
- Full width option for mobile layouts

---

#### Input

A flexible input component with validation states and icon support.

**Props:**
```tsx
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
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' | 'url';
}
```

**Examples:**

```tsx
// Basic input
<Input
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="you@example.com"
/>

// Input with error
<Input
  label="Password"
  type="password"
  value={password}
  onChange={setPassword}
  error="Password must be at least 8 characters"
/>

// Input with icon
<Input
  label="Search"
  leftIcon={<Icon name="search" />}
  value={search}
  onChange={setSearch}
/>

// Required field
<Input
  label="Company Name"
  value={name}
  onChange={setName}
  required
  helperText="This field is required"
/>
```

**Validation States:**
- `default`: Normal state
- `error`: Red border, shows error message
- `success`: Green border
- `disabled`: Gray background, cursor not-allowed

**Responsive Behavior:**
- Full width on mobile
- Appropriate input types trigger mobile keyboards (email, tel, number)

---

#### Icon

A wrapper component for Lucide React icons with consistent sizing.

**Props:**
```tsx
interface IconProps {
  name?: IconName;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
  'aria-label'?: string;
}
```

**Examples:**

```tsx
// By name
<Icon name="search" size="md" />

// Custom icon
<Icon icon={CustomIcon} size="lg" />

// With color
<Icon name="check" size="sm" color="#10B981" />

// With aria-label for accessibility
<Icon name="trash" aria-label="Delete item" />
```

**Available Icons:**
- **Navigation**: menu, x, chevron-left, chevron-right, chevron-down
- **Actions**: plus, edit, trash, save, download, upload
- **Status**: check, alert-circle, info, alert-triangle
- **Content**: search, filter, calendar, clock, map-pin
- **User**: user, users, building, truck, package
- **Communication**: mail, phone, message-square, bell

**Sizes:**
- `sm`: 16px
- `md`: 20px (default)
- `lg`: 24px
- `xl`: 32px

---

#### Textarea

A multi-line text input with auto-resize functionality.

**Props:**
```tsx
interface TextareaProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  maxLength?: number;
}
```

**Examples:**

```tsx
<Textarea
  label="Description"
  value={description}
  onChange={setDescription}
  placeholder="Enter a detailed description..."
  rows={4}
  maxLength={500}
/>
```

---

#### Select

A styled native select dropdown.

**Props:**
```tsx
interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

interface SelectOption {
  value: string;
  label: string;
}
```

**Examples:**

```tsx
<Select
  label="Vehicle Type"
  value={vehicleType}
  onChange={setVehicleType}
  options={[
    { value: 'van', label: 'Van' },
    { value: 'truck', label: 'Truck' },
    { value: 'trailer', label: 'Trailer' },
  ]}
  placeholder="Select a vehicle type"
/>
```

---

### Molecule Components

#### Card

A container component for grouped content with elevation.

**Props:**
```tsx
interface CardProps {
  children: React.ReactNode;
  hoverable?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Examples:**

```tsx
// Basic card
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

// Hoverable card (interactive)
<Card hoverable onClick={() => navigate('/details')}>
  <h3>Click me</h3>
</Card>

// Custom padding
<Card padding="lg">
  <h3>Spacious Card</h3>
</Card>
```

**Features:**
- White background with shadow
- Hover state increases shadow (if hoverable)
- Responsive padding

---

#### FormField

Combines Input with label and error handling for forms.

**Props:**
```tsx
interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  helperText?: string;
  placeholder?: string;
}
```

**Examples:**

```tsx
<FormField
  label="Email Address"
  name="email"
  type="email"
  value={formData.email}
  onChange={(value) => setFormData({ ...formData, email: value })}
  error={errors.email}
  required
/>
```

---

#### SearchBar

A specialized input for search functionality.

**Props:**
```tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  loading?: boolean;
}
```

**Examples:**

```tsx
<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  onClear={() => setSearchQuery('')}
  placeholder="Search vehicles..."
  loading={isSearching}
/>
```

**Features:**
- Search icon on the left
- Clear button (X) when value is present
- Loading spinner state

---

### Organism Components

#### Modal

A dialog component with overlay and focus management.

**Props:**
```tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}
```

**Examples:**

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <Stack direction="horizontal" spacing={4}>
    <Button variant="outline" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </Stack>
</Modal>
```

**Features:**
- Overlay backdrop (click to close)
- Escape key to close
- Focus trap for accessibility
- Smooth fade-in animation
- Multiple size options

**Sizes:**
- `sm`: 400px max width
- `md`: 600px max width (default)
- `lg`: 800px max width
- `xl`: 1000px max width

**Responsive Behavior:**
- Full width on mobile with padding
- Scrollable content if too tall

---

#### Table

A responsive table that transforms to cards on mobile.

**Props:**
```tsx
interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}
```

**Examples:**

```tsx
const columns = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'status', header: 'Status', render: (row) => (
    <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
      {row.status}
    </Badge>
  )},
];

<Table
  columns={columns}
  data={vehicles}
  loading={isLoading}
  emptyMessage="No vehicles found"
  onRowClick={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
/>
```

**Features:**
- Sortable columns
- Loading skeleton state
- Empty state message
- Row click handler

**Responsive Behavior:**
- Desktop: Traditional table layout
- Mobile: Card-based layout with stacked rows
- Transforms at 768px breakpoint

---

#### Navbar

A responsive navigation bar with mobile hamburger menu.

**Props:**
```tsx
interface NavbarProps {
  logo?: React.ReactNode;
  links: NavLink[];
  userMenu?: React.ReactNode;
}

interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}
```

**Examples:**

```tsx
<Navbar
  logo={<img src="/logo.svg" alt="Vider" />}
  links={[
    { label: 'Dashboard', href: '/dashboard', active: true },
    { label: 'Listings', href: '/listings' },
    { label: 'Bookings', href: '/bookings' },
  ]}
  userMenu={<UserDropdown />}
/>
```

**Features:**
- Sticky positioning
- Shadow on scroll
- Mobile hamburger menu
- Slide-in drawer on mobile

**Responsive Behavior:**
- Desktop: Horizontal layout
- Mobile: Hamburger menu with drawer

---

#### Drawer

A slide-in panel (used by Navbar on mobile).

**Props:**
```tsx
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
}
```

**Examples:**

```tsx
<Drawer
  isOpen={isDrawerOpen}
  onClose={() => setIsDrawerOpen(false)}
  position="left"
>
  <nav>
    <a href="/dashboard">Dashboard</a>
    <a href="/listings">Listings</a>
  </nav>
</Drawer>
```

---

### Layout Components

#### Container

Centers content with max-width constraint.

**Props:**
```tsx
interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}
```

**Examples:**

```tsx
<Container maxWidth="lg">
  <h1>Page Content</h1>
  <p>Centered with max-width of 1200px</p>
</Container>
```

**Max Widths:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px (default)
- `xl`: 1280px
- `full`: 100%

---

#### Grid

A CSS Grid layout component.

**Props:**
```tsx
interface GridProps {
  children: React.ReactNode;
  columns?: number | { sm?: number; md?: number; lg?: number };
  gap?: number;
  className?: string;
}
```

**Examples:**

```tsx
// Fixed columns
<Grid columns={3} gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>

// Responsive columns
<Grid columns={{ sm: 1, md: 2, lg: 3 }} gap={6}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

**Responsive Behavior:**
- Automatically adjusts columns based on breakpoints
- Gap spacing uses design tokens

---

#### Stack

A flexbox layout for vertical or horizontal stacking.

**Props:**
```tsx
interface StackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  spacing?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  wrap?: boolean;
  className?: string;
}
```

**Examples:**

```tsx
// Vertical stack
<Stack direction="vertical" spacing={4}>
  <h2>Title</h2>
  <p>Content</p>
  <Button>Action</Button>
</Stack>

// Horizontal stack with alignment
<Stack direction="horizontal" spacing={2} align="center">
  <Icon name="check" />
  <span>Completed</span>
</Stack>

// Responsive button group
<Stack direction="horizontal" spacing={3} wrap>
  <Button>Save</Button>
  <Button variant="outline">Cancel</Button>
</Stack>
```

---

### Utility Components

#### Badge

A small label for status or categories.

**Props:**
```tsx
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}
```

**Examples:**

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Cancelled</Badge>
<Badge variant="info">New</Badge>
<Badge variant="neutral">Draft</Badge>
```

**Variants:**
- `success`: Green (active, completed)
- `warning`: Amber (pending, in progress)
- `error`: Red (cancelled, failed)
- `info`: Blue (new, information)
- `neutral`: Gray (default, inactive)

---

#### Spinner

A loading spinner animation.

**Props:**
```tsx
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}
```

**Examples:**

```tsx
<Spinner size="md" />
<Spinner size="lg" color="#2563EB" />
```

---

#### Skeleton

A loading placeholder with shimmer animation.

**Props:**
```tsx
interface SkeletonProps {
  variant?: 'text' | 'circle' | 'rectangle';
  width?: string | number;
  height?: string | number;
  count?: number;
}
```

**Examples:**

```tsx
// Text skeleton
<Skeleton variant="text" count={3} />

// Circle skeleton (avatar)
<Skeleton variant="circle" width={48} height={48} />

// Rectangle skeleton (image)
<Skeleton variant="rectangle" width="100%" height={200} />
```

---

## Responsive Design

### Mobile-First Approach

All components are designed mobile-first with progressive enhancement for larger screens.

**Breakpoints:**
- `sm`: 640px (small tablets)
- `md`: 768px (tablets)
- `lg`: 1024px (laptops)
- `xl`: 1280px (desktops)
- `2xl`: 1536px (large desktops)

### Responsive Patterns

**Single Column on Mobile:**
```tsx
// Automatically stacks on mobile
<Grid columns={{ sm: 1, md: 2, lg: 3 }}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

**Touch Targets:**
All interactive elements meet the 44x44px minimum touch target size on mobile.

**Table to Cards:**
Tables automatically transform to card-based layouts on mobile for better usability.

**Hamburger Menu:**
Navigation collapses to a hamburger menu on mobile with a slide-in drawer.

---

## Accessibility

### WCAG 2.1 AA Compliance

All components meet WCAG 2.1 AA standards:

- **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Indicators**: Visible focus states on all interactive elements
- **ARIA Labels**: Proper labels for screen readers
- **Semantic HTML**: Correct HTML elements for structure

### Keyboard Navigation

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and drawers
- **Arrow Keys**: Navigate within components (where applicable)

### Screen Reader Support

- Semantic HTML elements (`<button>`, `<nav>`, `<main>`, etc.)
- ARIA labels for icon-only buttons
- Live regions for dynamic content
- Proper heading hierarchy

### Text Scaling

All components support text scaling up to 200% without breaking layouts, using:
- Fluid typography with `clamp()`
- Relative units (rem, em)
- Flexible layouts (flexbox, grid)

---

## Best Practices

### Component Usage

**Do:**
- Use semantic variants (`primary`, `danger`) instead of custom colors
- Leverage design tokens for consistency
- Use the appropriate component for the task
- Follow responsive patterns
- Test with keyboard navigation

**Don't:**
- Override component styles with inline styles
- Use fixed pixel widths
- Ignore accessibility requirements
- Create custom components when design system components exist

### Performance

- Components use CSS Modules for optimal performance
- Icons are tree-shakeable (only imported icons are bundled)
- Lazy load heavy components (Modal, Drawer) when possible
- Use React.memo for expensive components

### Styling

```tsx
// ✅ Good: Use design tokens
import { colors, spacing } from '@/design-system/tokens';

const styles = {
  container: {
    padding: spacing[4],
    backgroundColor: colors.background.card,
  },
};

// ❌ Bad: Hard-coded values
const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#FFFFFF',
  },
};
```

### Composition

```tsx
// ✅ Good: Compose components
<Card>
  <Stack spacing={4}>
    <h2>Title</h2>
    <p>Content</p>
    <Button variant="primary">Action</Button>
  </Stack>
</Card>

// ❌ Bad: Custom layout
<div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
  <h2>Title</h2>
  <p>Content</p>
  <button>Action</button>
</div>
```

---

## Additional Resources

- [Accessibility Guide](./ACCESSIBILITY.md) - Detailed accessibility guidelines
- [Design Tokens](./tokens/README.md) - Complete token documentation
- [Component API](./components/README.md) - Detailed component API reference

---

## Support

For questions or issues with the design system, please contact the development team or create an issue in the project repository.
