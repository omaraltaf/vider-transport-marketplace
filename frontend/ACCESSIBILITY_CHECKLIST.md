# Accessibility Checklist for Developers

This checklist helps ensure that new features and components maintain WCAG AA accessibility standards.

## Quick Reference

### ✅ Keyboard Navigation
- [ ] All interactive elements are focusable with Tab
- [ ] Elements activate with Enter or Space (buttons)
- [ ] Focus order is logical and follows visual layout
- [ ] No keyboard traps (user can always navigate away)
- [ ] Skip links provided for long content sections

### ✅ ARIA Labels and Semantics
- [ ] All form inputs have associated labels
- [ ] Required fields marked with `required` attribute
- [ ] Error messages use `role="alert"`
- [ ] Error messages associated with inputs via `aria-describedby`
- [ ] Buttons have descriptive text or `aria-label`
- [ ] Icons have `aria-hidden="true"` or descriptive labels
- [ ] Modals have `role="dialog"` and `aria-modal="true"`
- [ ] Modal titles use `aria-labelledby`

### ✅ Color and Contrast
- [ ] Text has minimum 4.5:1 contrast ratio (WCAG AA)
- [ ] Large text (18pt+) has minimum 3:1 contrast ratio
- [ ] Use design system color tokens (pre-validated)
- [ ] Don't rely on color alone to convey information
- [ ] Interactive elements have visible focus indicators

### ✅ Forms
- [ ] All inputs have visible labels
- [ ] Required fields clearly marked
- [ ] Validation errors announced to screen readers
- [ ] Error messages are specific and helpful
- [ ] Form submission provides feedback
- [ ] Multi-step forms indicate progress

### ✅ Images and Media
- [ ] Images have descriptive `alt` text
- [ ] Decorative images have `alt=""` or `aria-hidden="true"`
- [ ] Videos have captions
- [ ] Audio content has transcripts

### ✅ Responsive and Mobile
- [ ] Touch targets are at least 44x44px
- [ ] Content reflows at 320px width
- [ ] No horizontal scrolling required
- [ ] Pinch-to-zoom is not disabled

## Design System Component Usage

### Button
```tsx
// ✅ Good - Descriptive text
<Button variant="primary">Save Changes</Button>

// ✅ Good - Icon with aria-label
<Button variant="ghost" aria-label="Close dialog">
  <X />
</Button>

// ❌ Bad - Icon without label
<Button variant="ghost">
  <X />
</Button>
```

### Input
```tsx
// ✅ Good - Label, error handling
<Input
  label="Email Address"
  value={email}
  onChange={setEmail}
  error={errors.email}
  required
/>

// ❌ Bad - No label
<Input
  placeholder="Enter email"
  value={email}
  onChange={setEmail}
/>
```

### FormField
```tsx
// ✅ Good - Complete form field
<FormField
  type="email"
  label="Email Address"
  value={email}
  onChange={setEmail}
  error={errors.email}
  helperText="We'll never share your email"
  required
/>
```

### Modal
```tsx
// ✅ Good - Accessible modal
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
>
  <p>Are you sure you want to proceed?</p>
  <Button onClick={handleConfirm}>Confirm</Button>
  <Button variant="outline" onClick={handleClose}>Cancel</Button>
</Modal>

// ❌ Bad - No title
<Modal isOpen={isOpen} onClose={handleClose}>
  <p>Are you sure?</p>
</Modal>
```

## Testing Your Changes

### Automated Tests
```bash
# Run accessibility tests
npm test accessibility.test.tsx

# Run all tests
npm test
```

### Manual Testing

#### Keyboard Navigation
1. Unplug your mouse
2. Use Tab to navigate forward
3. Use Shift+Tab to navigate backward
4. Use Enter/Space to activate buttons
5. Use Escape to close modals/dialogs

#### Screen Reader Testing

**macOS (VoiceOver):**
```
Cmd + F5 to toggle VoiceOver
Ctrl + Option + Arrow keys to navigate
```

**Windows (NVDA):**
```
Ctrl + Alt + N to start NVDA
Arrow keys to navigate
```

#### Color Contrast
1. Open Chrome DevTools
2. Inspect element
3. Check "Accessibility" panel
4. Verify contrast ratio is at least 4.5:1

## Common Accessibility Issues and Fixes

### Issue: Button without accessible name
```tsx
// ❌ Problem
<button onClick={handleDelete}>
  <TrashIcon />
</button>

// ✅ Solution 1: Add text
<Button onClick={handleDelete}>
  <TrashIcon />
  Delete
</Button>

// ✅ Solution 2: Add aria-label
<Button onClick={handleDelete} aria-label="Delete item">
  <TrashIcon />
</Button>
```

### Issue: Form input without label
```tsx
// ❌ Problem
<input
  type="text"
  placeholder="Enter name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// ✅ Solution: Use Input component with label
<Input
  label="Name"
  placeholder="Enter name"
  value={name}
  onChange={setName}
/>
```

### Issue: Error message not announced
```tsx
// ❌ Problem
{error && <div className="text-red-600">{error}</div>}

// ✅ Solution: Use role="alert" and aria-describedby
<Input
  label="Email"
  value={email}
  onChange={setEmail}
  error={error} // Input component handles aria-describedby
/>
```

### Issue: Modal not keyboard accessible
```tsx
// ❌ Problem
<div className="modal-overlay" onClick={handleClose}>
  <div className="modal-content">
    {children}
  </div>
</div>

// ✅ Solution: Use Modal component
<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
  {children}
</Modal>
```

### Issue: Low color contrast
```tsx
// ❌ Problem
<p className="text-gray-400">Important information</p>

// ✅ Solution: Use darker color
<p className="ds-text-gray-700">Important information</p>
```

## Resources

### WCAG Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools

### Screen Readers
- **macOS:** VoiceOver (built-in)
- **Windows:** [NVDA](https://www.nvaccess.org/) (free)
- **Windows:** [JAWS](https://www.freedomscientific.com/products/software/jaws/) (commercial)

### Design System Documentation
- See `frontend/src/design-system/` for component documentation
- All design system components are pre-validated for accessibility
- Use design system components instead of custom implementations

## Questions?

If you're unsure about accessibility requirements:
1. Check this checklist
2. Review the design system component documentation
3. Run the accessibility test suite
4. Test with keyboard navigation
5. Ask the team for guidance

Remember: Accessibility is not optional - it's a requirement for all features!
