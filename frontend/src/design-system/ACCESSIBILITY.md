# Accessibility Guidelines

This document outlines the accessibility features and best practices implemented in the Vider Design System to ensure WCAG 2.1 AA compliance.

## Requirements Coverage

- **6.1**: Color contrast ratios meet WCAG 2.1 AA standards
- **6.2**: Focus indicators for keyboard navigation
- **6.3**: ARIA labels for interactive elements
- **6.4**: Screen reader support with semantic HTML
- **6.5**: Text scaling up to 200% without breaking layouts

## Color Contrast (Requirement 6.1)

All text and background color combinations meet WCAG 2.1 AA standards:

- **Normal text**: Minimum contrast ratio of 4.5:1
- **Large text** (18pt+ or 14pt+ bold): Minimum contrast ratio of 3:1

### Updated Colors for Compliance

The following colors have been updated to meet contrast requirements:

- **Primary**: `#2563EB` (was `#3B82F6`) - 4.5:1 contrast on white
- **Success**: `#047857` (was `#10B981`) - 4.5:1 contrast on white
- **Warning**: `#B45309` (was `#F59E0B`) - 4.5:1 contrast on white
- **Error**: `#DC2626` (was `#EF4444`) - 4.5:1 contrast on white
- **Placeholder text**: `#6B7280` (was `#9CA3AF`) - 4.5:1 contrast on white

### Testing

Run color contrast tests:
```bash
npm test -- src/design-system/utils/colorContrast.test.ts
```

## Keyboard Navigation (Requirement 6.2)

### Focus Indicators

All interactive elements have visible focus indicators:

- **Outline**: 2px solid `#2563EB`
- **Outline offset**: 2px
- **Box shadow**: `0 0 0 4px rgba(37, 99, 235, 0.1)`

Focus indicators are applied to:
- Buttons
- Links
- Form inputs
- Interactive elements with `tabindex`

### Skip to Content Link

A skip link is provided at the top of every page to allow keyboard users to bypass navigation:

```tsx
import { SkipLink } from './design-system/components/SkipLink/SkipLink';

<SkipLink targetId="main-content" />
<main id="main-content">
  {/* Page content */}
</main>
```

### Tab Order

- Tab order follows the visual order of elements
- Disabled elements are excluded from tab order
- Modal dialogs trap focus within the modal

### Keyboard Shortcuts

- **Enter/Space**: Activate buttons
- **Escape**: Close modals and dropdowns
- **Tab**: Navigate forward
- **Shift+Tab**: Navigate backward

### Testing

Run keyboard navigation tests:
```bash
npm test -- src/design-system/utils/keyboardNavigation.test.tsx
```

## ARIA Labels (Requirements 6.3, 6.4)

### Icon-Only Buttons

Always provide `aria-label` for icon-only buttons:

```tsx
<Button aria-label="Delete item">
  <Icon name="trash" />
</Button>
```

Or use visually hidden text:

```tsx
<Button>
  <Icon name="plus" />
  <span className="sr-only">Add new item</span>
</Button>
```

### Form Inputs

All form inputs must have associated labels:

```tsx
<Input
  label="Email address"
  value={email}
  onChange={setEmail}
  required
  error={emailError}
  helperText="We'll never share your email"
/>
```

This automatically provides:
- `<label>` element associated with input
- `aria-describedby` for error messages and helper text
- `required` attribute for required fields

### Icons

Decorative icons should have `aria-hidden`:

```tsx
<Icon name="check" /> {/* Automatically has aria-hidden="true" */}
```

Meaningful icons should have `aria-label`:

```tsx
<Icon name="check" aria-label="Success" />
```

### Modals

Modals automatically include proper ARIA attributes:

```tsx
<Modal isOpen={isOpen} onClose={onClose} title="Confirm Action">
  <p>Are you sure?</p>
</Modal>
```

This provides:
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` pointing to the title
- Focus trap within modal
- Escape key to close

### Live Regions

Use ARIA live regions for dynamic content:

```tsx
{/* Error messages */}
<div role="alert" aria-live="assertive">
  {errorMessage}
</div>

{/* Success messages */}
<div role="status" aria-live="polite">
  {successMessage}
</div>

{/* Loading states */}
<div role="status" aria-label="Loading">
  <Spinner />
</div>
```

### Navigation

Main navigation should have proper ARIA:

```tsx
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

Main content should be marked:

```tsx
<main role="main" id="main-content">
  {/* Page content */}
</main>
```

### Testing

Run ARIA labels tests:
```bash
npm test -- src/design-system/utils/ariaLabels.test.tsx
```

## Screen Reader Support (Requirement 6.4)

### Semantic HTML

Use semantic HTML elements:

- `<header>` for page headers
- `<nav>` for navigation
- `<main>` for main content
- `<article>` for independent content
- `<section>` for thematic grouping
- `<aside>` for sidebars
- `<footer>` for page footers

### Headings Hierarchy

Maintain proper heading hierarchy:

```tsx
<h1>Page Title</h1>
  <h2>Section Title</h2>
    <h3>Subsection Title</h3>
```

Never skip heading levels.

### Lists

Use proper list markup:

```tsx
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### Tables

Use proper table markup with headers:

```tsx
<table>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
    </tr>
  </tbody>
</table>
```

### Screen Reader Only Text

Use the `.sr-only` utility class for screen reader only text:

```tsx
<span className="sr-only">Additional context for screen readers</span>
```

## Text Scaling (Requirement 6.5)

The design system supports text scaling up to 200% without breaking layouts:

### Fluid Typography

Typography uses `clamp()` for fluid scaling:

```css
--font-size-base: clamp(0.9rem, 0.85rem + 0.25vw, 1rem);
```

### Responsive Containers

All containers adapt to text scaling:

```css
* {
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

### Mobile Optimizations

On mobile devices (≤768px):
- Single-column layouts
- Increased touch target sizes (minimum 44x44px)
- Responsive padding and spacing
- No horizontal scrolling

### Testing Text Scaling

1. In your browser, go to Settings > Appearance
2. Increase text size to 200%
3. Verify all content remains readable and layouts don't break

## Testing Checklist

### Automated Tests

- [ ] Color contrast tests pass
- [ ] Keyboard navigation tests pass
- [ ] ARIA labels tests pass
- [ ] Component unit tests pass

### Manual Testing

- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Test text scaling up to 200%
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Verify no horizontal scrolling on mobile
- [ ] Test modal focus traps
- [ ] Test skip to content link

### Browser Testing

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] iOS Safari
- [ ] Android Chrome

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## Support

For accessibility questions or issues, please:
1. Check this documentation
2. Review the test files for examples
3. Consult the WCAG 2.1 guidelines
4. Contact the design system team
