# Design Document

## Overview

This design outlines the integration of the existing UI design system into the Vider Transport Marketplace application. The design system has been fully implemented with components, tokens, and utilities, but is not yet applied to any application pages. This integration will systematically replace legacy UI implementations with design system components, apply the new color palette, and ensure visual consistency across all pages.

The integration follows a phased approach, starting with core components (buttons, inputs, cards) and progressing to complex components (tables, modals, navigation). Each page will be migrated incrementally to minimize risk and allow for testing at each stage.

## Architecture

### Integration Strategy

The integration follows a **component replacement pattern** where existing UI elements are systematically replaced with design system equivalents:

1. **Import Layer**: Update imports to reference design system components
2. **Props Mapping**: Map existing component props to design system component APIs
3. **Style Migration**: Remove inline styles and custom CSS in favor of design tokens
4. **Testing**: Verify functionality and visual consistency after each migration

### Component Mapping

| Legacy Pattern | Design System Component | Notes |
|---------------|------------------------|-------|
| Custom `<button>` with Tailwind | `<Button>` | Map variant, size, loading states |
| Custom `<input>` elements | `<Input>`, `<Select>`, `<Textarea>` | Use FormField wrapper for labels/errors |
| Custom card divs | `<Card>` | Standardize padding, shadows, borders |
| Custom table markup | `<Table>` | Migrate to structured Table component |
| Custom modal implementations | `<Modal>` | Replace with accessible Modal component |
| Headless UI Menu | `<Drawer>` for mobile nav | Consistent navigation pattern |
| Custom search inputs | `<SearchBar>` | Standardized search interface |
| Layout divs | `<Container>`, `<Stack>`, `<Grid>` | Consistent spacing and responsive behavior |

### File Organization

```
frontend/src/
├── design-system/          # Design system (already exists)
│   ├── components/         # Reusable components
│   ├── tokens/            # Design tokens
│   └── utils/             # Utilities
├── components/            # Legacy components (to be updated/removed)
│   ├── Navbar.tsx         # Update to use design system
│   ├── Layout.tsx         # Update to use Container
│   └── ...
└── pages/                 # Application pages (to be migrated)
    ├── HomePage.tsx
    ├── LoginPage.tsx
    └── ...
```

## Components and Interfaces

### Design System Component APIs

The design system components are already implemented with the following APIs:

#### Button Component
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}
```

#### Input Component
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  autoComplete?: string;
}
```

#### FormField Component
```typescript
interface FormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: ReactNode; // Input, Select, or Textarea
}
```

#### Card Component
```typescript
interface CardProps {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: ReactNode;
}
```

#### Table Component
```typescript
interface TableProps {
  columns: Array<{
    key: string;
    header: string;
    sortable?: boolean;
    render?: (value: any, row: any) => ReactNode;
  }>;
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
}
```

### Migration Patterns

#### Pattern 1: Button Migration
**Before:**
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Submit
</button>
```

**After:**
```tsx
<Button variant="primary" size="md">
  Submit
</Button>
```

#### Pattern 2: Form Input Migration
**Before:**
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700">Email</label>
  <input
    type="email"
    className="mt-1 block w-full rounded-md border-gray-300"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
</div>
```

**After:**
```tsx
<FormField label="Email" error={error} required>
  <Input
    type="email"
    value={email}
    onChange={setEmail}
    leftIcon={<Mail />}
  />
</FormField>
```

#### Pattern 3: Card Migration
**Before:**
```tsx
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl">
  {content}
</div>
```

**After:**
```tsx
<Card variant="elevated" padding="lg" hoverable>
  {content}
</Card>
```

#### Pattern 4: Layout Migration
**Before:**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="space-y-6">
    {content}
  </div>
</div>
```

**After:**
```tsx
<Container maxWidth="7xl">
  <Stack spacing="lg">
    {content}
  </Stack>
</Container>
```

## Data Models

No new data models are required. The integration works with existing application data structures.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Component Consistency
*For any* page in the application, all buttons should use the design system Button component with consistent variants and sizes
**Validates: Requirements 1.2, 2.1**

### Property 2: Form Field Consistency
*For any* form in the application, all input fields should use design system Input/Select/Textarea components wrapped in FormField components
**Validates: Requirements 2.2, 4.1**

### Property 3: Color Token Usage
*For any* styled element in the application, colors should be applied using design system color tokens rather than hardcoded values
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 4: Accessibility Preservation
*For any* migrated component, ARIA labels, keyboard navigation, and focus indicators should be maintained or improved
**Validates: Requirements 8.1, 8.2, 8.3, 8.4**

### Property 5: Layout Component Usage
*For any* page layout, content width constraints should use Container components and spacing should use Stack or Grid components
**Validates: Requirements 10.1, 10.2, 10.3**

### Property 6: Import Elimination
*For any* page that has been migrated, there should be no imports of legacy component implementations that have design system equivalents
**Validates: Requirements 9.2**

## Error Handling

### Migration Errors

1. **Component API Mismatch**: If a legacy component has props that don't map to design system components, create a thin wrapper or extend the design system component
2. **Style Conflicts**: If Tailwind classes conflict with design system styles, remove Tailwind classes in favor of component props
3. **Functionality Loss**: If a legacy component has functionality not present in the design system, either add it to the design system or create a composed component

### Runtime Errors

1. **Missing Props**: Ensure all required props are provided when migrating to design system components
2. **Type Errors**: Update TypeScript types to match design system component interfaces
3. **Event Handler Changes**: Update event handlers to match design system component APIs (e.g., `onChange` receiving value vs event)

## Testing Strategy

### Unit Testing

Unit tests will verify that migrated pages:
- Render without errors
- Display correct content
- Handle user interactions properly
- Maintain existing functionality

Example unit test structure:
```typescript
describe('LoginPage', () => {
  it('renders login form with design system components', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays validation errors using FormField error prop', async () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });
});
```

### Visual Regression Testing

Visual regression tests will ensure:
- Components render with correct styling
- Color palette is applied consistently
- Spacing and layout match design specifications
- Responsive behavior works across breakpoints

### Integration Testing

Integration tests will verify:
- Navigation flows work correctly
- Form submissions function properly
- Data fetching and display work as expected
- User interactions trigger correct behaviors

### Manual Testing Checklist

For each migrated page:
- [ ] Visual appearance matches design system
- [ ] All interactive elements work correctly
- [ ] Keyboard navigation functions properly
- [ ] Screen reader announces elements correctly
- [ ] Responsive behavior works on mobile/tablet/desktop
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] No console errors or warnings

## Implementation Phases

### Phase 1: Core Components (Foundation)
- Migrate Button usage across all pages
- Migrate Input, Select, Textarea usage in forms
- Migrate Card usage for content containers
- Update color references to use design tokens

### Phase 2: Navigation and Layout
- Migrate Navbar component to use design system
- Implement Drawer for mobile navigation
- Migrate Layout component to use Container
- Apply Stack and Grid for consistent spacing

### Phase 3: Complex Components
- Migrate tables to use Table component
- Migrate modals to use Modal component
- Migrate search interfaces to use SearchBar component
- Implement Skeleton loading states

### Phase 4: Page-by-Page Migration
- Migrate authentication pages (Login, Register)
- Migrate listing pages (Create, Edit, List, Detail)
- Migrate booking pages
- Migrate admin pages
- Migrate settings pages

### Phase 5: Cleanup and Optimization
- Remove unused legacy components
- Remove redundant CSS
- Optimize bundle size
- Document migration patterns

## Performance Considerations

1. **Bundle Size**: Design system components are already tree-shakeable; only imported components will be included in bundles
2. **CSS-in-JS**: Design system uses CSS Modules for scoped styling with minimal runtime overhead
3. **Component Reusability**: Shared components reduce code duplication and improve caching
4. **Lazy Loading**: Continue using React lazy loading for routes; design system components are lightweight

## Accessibility Considerations

The design system already implements:
- WCAG AA contrast ratios
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators
- ARIA labels and roles

During migration, ensure:
- Existing accessibility features are preserved
- ARIA labels are maintained or improved
- Keyboard shortcuts continue to work
- Focus management is correct in modals and drawers

## Browser Compatibility

The design system supports:
- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Android)

No additional compatibility concerns for the integration.
