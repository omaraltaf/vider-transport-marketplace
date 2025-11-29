# Accessibility Quick Reference Guide

## Quick Checklist for Developers

### Before Committing Code

- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] All buttons have descriptive text or aria-label
- [ ] Color contrast meets 4.5:1 ratio
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] No TypeScript/ESLint errors

### Common Patterns

#### Images

```tsx
// ✅ Good - descriptive alt text
<img src="logo.png" alt="Vider logo" />

// ✅ Good - decorative image
<img src="decoration.png" alt="" aria-hidden="true" />

// ❌ Bad - missing alt text
<img src="logo.png" />
```

#### Buttons

```tsx
// ✅ Good - text button
<button>Save Changes</button>

// ✅ Good - icon button with label
<button aria-label="Close dialog">
  <XIcon aria-hidden="true" />
</button>

// ❌ Bad - icon button without label
<button><XIcon /></button>
```

#### Form Inputs

```tsx
// ✅ Good - label associated with input
<label htmlFor="email">Email</label>
<input 
  id="email" 
  type="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && <p id="email-error" role="alert">{error}</p>}

// ❌ Bad - no label
<input type="email" placeholder="Email" />
```

#### Links

```tsx
// ✅ Good - descriptive link text
<Link to="/dashboard">Go to Dashboard</Link>

// ✅ Good - link with context
<Link to={`/listings/${id}`} aria-label={`View ${title} listing`}>
  View Details
</Link>

// ❌ Bad - generic link text
<Link to="/dashboard">Click here</Link>
```

#### Headings

```tsx
// ✅ Good - proper hierarchy
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>

// ❌ Bad - skipping levels
<h1>Page Title</h1>
<h3>Section Title</h3>
```

#### Semantic HTML

```tsx
// ✅ Good - semantic structure
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><Link to="/">Home</Link></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>Article Title</h1>
    <p>Content...</p>
  </article>
</main>
<footer>
  <p>&copy; 2024 Vider</p>
</footer>

// ❌ Bad - divs everywhere
<div className="header">
  <div className="nav">
    <div><a href="/">Home</a></div>
  </div>
</div>
```

#### ARIA Attributes

```tsx
// ✅ Good - proper ARIA usage
<button 
  aria-expanded={isOpen}
  aria-controls="menu"
  aria-label="Toggle menu"
>
  Menu
</button>
<div id="menu" role="menu" hidden={!isOpen}>
  {/* Menu items */}
</div>

// ✅ Good - live region for dynamic content
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// ❌ Bad - redundant ARIA
<button role="button">Click me</button>
```

#### Responsive Design

```tsx
// ✅ Good - responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

// ✅ Good - responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Heading
</h1>

// ✅ Good - responsive visibility
<div className="hidden lg:block">Desktop only</div>
<div className="block lg:hidden">Mobile only</div>
```

#### Focus Management

```tsx
// ✅ Good - visible focus indicator (already in CSS)
// No need to add anything, focus-visible is handled globally

// ✅ Good - focus trap in modal
import { Dialog } from '@headlessui/react';

<Dialog open={isOpen} onClose={onClose}>
  <Dialog.Panel>
    {/* Content - focus is automatically trapped */}
  </Dialog.Panel>
</Dialog>

// ❌ Bad - removing focus outline
<button className="focus:outline-none">
  Click me
</button>
```

### Testing Commands

```bash
# Build the project
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Run dev server
npm run dev
```

### Browser Testing

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Verify focus is visible
   - Test Escape key on modals/dropdowns

2. **Screen Reader** (Optional but recommended)
   - macOS: Cmd+F5 to enable VoiceOver
   - Windows: Download NVDA (free)

3. **Responsive Design**
   - Open DevTools (F12)
   - Toggle device toolbar (Cmd+Shift+M)
   - Test at 375px, 768px, 1024px, 1920px

4. **Color Contrast**
   - Use Chrome DevTools
   - Inspect element
   - Check contrast ratio in Styles panel

### Common Mistakes to Avoid

❌ **Don't:**
- Use divs for buttons or links
- Remove focus outlines without replacement
- Use color alone to convey information
- Skip heading levels
- Use placeholder as label
- Create keyboard traps
- Use generic link text ("click here")
- Forget alt text on images
- Use fixed pixel widths that break on mobile

✅ **Do:**
- Use semantic HTML elements
- Provide visible focus indicators
- Use multiple cues (color + icon + text)
- Follow heading hierarchy
- Use proper labels for form inputs
- Allow keyboard navigation everywhere
- Use descriptive link text
- Provide alt text for all images
- Use responsive units (rem, %, vw)

### Resources

- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Headless UI](https://headlessui.com/) - Accessible components

### Getting Help

- Check `frontend/ACCESSIBILITY_TESTING.md` for detailed testing guide
- Check `frontend/RESPONSIVE_DESIGN_TESTING.md` for responsive testing
- Check `TASK_39_IMPLEMENTATION.md` for implementation details
- Ask team members for code review
- Use automated tools (axe DevTools, WAVE, Lighthouse)

### Quick Wins

1. **Add alt text to images** - 2 minutes
2. **Associate labels with inputs** - 2 minutes
3. **Add aria-label to icon buttons** - 2 minutes
4. **Test keyboard navigation** - 5 minutes
5. **Check color contrast** - 5 minutes
6. **Test responsive design** - 5 minutes

Total time to make your feature accessible: ~20 minutes

### Remember

> Accessibility is not a feature, it's a requirement. 
> Building accessible software from the start is easier than retrofitting it later.

Every user deserves equal access to our platform, regardless of their abilities or the device they use.
