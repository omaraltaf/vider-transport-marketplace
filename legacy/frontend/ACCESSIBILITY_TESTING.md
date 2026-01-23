# Accessibility Testing Guide

## Overview
This document provides a comprehensive guide for testing the accessibility features implemented in the Vider platform.

## Automated Testing Tools

### Browser Extensions
1. **axe DevTools** (Chrome/Firefox)
   - Install from browser extension store
   - Run on each page
   - Fix all violations and warnings

2. **WAVE** (Web Accessibility Evaluation Tool)
   - Install from browser extension store
   - Check for errors, alerts, and contrast issues

3. **Lighthouse** (Chrome DevTools)
   - Open DevTools > Lighthouse
   - Run accessibility audit
   - Aim for 100% score

### Command Line Tools
```bash
# Install pa11y for automated testing
npm install -g pa11y

# Test a page
pa11y http://localhost:5173

# Test multiple pages
pa11y-ci --sitemap http://localhost:5173/sitemap.xml
```

## Manual Testing Checklist

### Keyboard Navigation
Test all pages with keyboard only (no mouse):

#### General Navigation
- [ ] Tab key moves focus forward through interactive elements
- [ ] Shift+Tab moves focus backward
- [ ] Focus indicator is clearly visible on all elements
- [ ] Focus order is logical and follows visual layout
- [ ] No keyboard traps (can always move focus away)

#### Specific Elements
- [ ] Enter/Space activates buttons and links
- [ ] Escape closes modals, dropdowns, and menus
- [ ] Arrow keys navigate within menus and lists
- [ ] Home/End keys work in text inputs
- [ ] Skip navigation link appears on Tab and works

#### Forms
- [ ] All form fields are keyboard accessible
- [ ] Tab order through form is logical
- [ ] Error messages are announced
- [ ] Required fields are indicated
- [ ] Submit button is keyboard accessible

### Screen Reader Testing

#### NVDA (Windows - Free)
1. Download from https://www.nvaccess.org/
2. Install and start NVDA
3. Navigate through pages using:
   - Tab: Move through interactive elements
   - H: Jump between headings
   - L: Jump between links
   - F: Jump between form fields
   - B: Jump between buttons

#### VoiceOver (macOS - Built-in)
1. Enable: System Preferences > Accessibility > VoiceOver
2. Keyboard shortcut: Cmd+F5
3. Navigate using:
   - VO+Right Arrow: Next item
   - VO+Left Arrow: Previous item
   - VO+U: Rotor menu
   - VO+H: Next heading

#### Testing Checklist
- [ ] All images have appropriate alt text
- [ ] Decorative images have empty alt=""
- [ ] Form labels are announced correctly
- [ ] Error messages are announced
- [ ] Dynamic content changes are announced (aria-live)
- [ ] Button purposes are clear
- [ ] Link destinations are clear
- [ ] Headings create logical document outline
- [ ] Landmark regions are identified (header, nav, main, footer)
- [ ] Tables have proper headers
- [ ] Lists are properly structured

### Color Contrast Testing

#### Tools
1. **WebAIM Contrast Checker**
   - https://webaim.org/resources/contrastchecker/
   - Test all text/background combinations

2. **Chrome DevTools**
   - Inspect element
   - Check "Contrast ratio" in Styles panel
   - Look for ✓ or ✗ indicators

#### Requirements
- Normal text (< 18pt): 4.5:1 minimum
- Large text (≥ 18pt or 14pt bold): 3:1 minimum
- UI components and graphics: 3:1 minimum
- Focus indicators: 3:1 minimum

#### Test Cases
- [ ] Body text on white background
- [ ] Link text (default, hover, visited)
- [ ] Button text on colored backgrounds
- [ ] Error messages
- [ ] Success messages
- [ ] Disabled state text
- [ ] Placeholder text
- [ ] Icon-only buttons with focus

### Responsive Design Testing

#### Breakpoints to Test
1. **Mobile (< 640px)**
   - iPhone SE: 375x667
   - iPhone 12: 390x844
   - Samsung Galaxy: 360x800

2. **Tablet (640-1024px)**
   - iPad: 768x1024
   - iPad Pro: 1024x1366

3. **Desktop (> 1024px)**
   - Laptop: 1366x768
   - Desktop: 1920x1080

#### Testing Checklist
- [ ] No horizontal scrolling at any breakpoint
- [ ] All content is readable without zooming
- [ ] Touch targets are at least 44x44px on mobile
- [ ] Navigation menu works on mobile (hamburger)
- [ ] Forms are usable on mobile
- [ ] Images scale appropriately
- [ ] Tables are responsive (scroll or stack)
- [ ] Modals work on mobile
- [ ] Text doesn't overflow containers

### Mobile Accessibility

#### iOS VoiceOver
1. Settings > Accessibility > VoiceOver > On
2. Triple-click home button to toggle
3. Swipe right/left to navigate
4. Double-tap to activate

#### Android TalkBack
1. Settings > Accessibility > TalkBack > On
2. Swipe right/left to navigate
3. Double-tap to activate

#### Testing Checklist
- [ ] All interactive elements are large enough (44x44px)
- [ ] Gestures work with screen reader on
- [ ] Form inputs work with virtual keyboard
- [ ] Pinch-to-zoom is not disabled
- [ ] Orientation changes work correctly
- [ ] Touch targets don't overlap

## Page-Specific Tests

### Home Page
- [ ] Hero section is accessible
- [ ] Search form is keyboard accessible
- [ ] Featured listings have proper alt text
- [ ] Trust indicators are announced correctly
- [ ] CTA buttons are accessible

### Search Page
- [ ] Filter panel is keyboard accessible
- [ ] Checkboxes and selects work with keyboard
- [ ] Search results are announced
- [ ] Pagination is keyboard accessible
- [ ] Sort controls are accessible

### Login/Register Pages
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced
- [ ] Required fields are indicated
- [ ] Password visibility toggle is accessible
- [ ] Submit button is keyboard accessible

### Dashboard
- [ ] Navigation is keyboard accessible
- [ ] Cards/tiles are accessible
- [ ] Action buttons are accessible
- [ ] Data tables are accessible

### Booking Flow
- [ ] Date pickers are keyboard accessible
- [ ] Cost breakdown is announced
- [ ] Confirmation is accessible
- [ ] Error states are announced

## Common Issues and Fixes

### Missing Alt Text
```tsx
// Bad
<img src="logo.png" />

// Good
<img src="logo.png" alt="Vider logo" />

// Decorative
<img src="decoration.png" alt="" />
```

### Missing Form Labels
```tsx
// Bad
<input type="text" placeholder="Email" />

// Good
<label htmlFor="email">Email</label>
<input id="email" type="text" />
```

### Poor Focus Indicators
```css
/* Bad - removes focus outline */
*:focus {
  outline: none;
}

/* Good - custom focus style */
*:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
}
```

### Keyboard Traps
```tsx
// Bad - modal without focus management
<div className="modal">
  <button>Close</button>
</div>

// Good - modal with focus trap
<Dialog onClose={handleClose}>
  <button ref={closeButtonRef}>Close</button>
</Dialog>
```

### Missing ARIA Labels
```tsx
// Bad - icon button without label
<button><SearchIcon /></button>

// Good - icon button with label
<button aria-label="Search">
  <SearchIcon aria-hidden="true" />
</button>
```

## Compliance Checklist

### WCAG 2.1 Level AA

#### Perceivable
- [x] 1.1.1 Non-text Content (A)
- [x] 1.3.1 Info and Relationships (A)
- [x] 1.3.2 Meaningful Sequence (A)
- [x] 1.3.3 Sensory Characteristics (A)
- [x] 1.4.1 Use of Color (A)
- [x] 1.4.3 Contrast (Minimum) (AA)
- [x] 1.4.4 Resize Text (AA)
- [x] 1.4.5 Images of Text (AA)
- [x] 1.4.10 Reflow (AA)
- [x] 1.4.11 Non-text Contrast (AA)
- [x] 1.4.12 Text Spacing (AA)
- [x] 1.4.13 Content on Hover or Focus (AA)

#### Operable
- [x] 2.1.1 Keyboard (A)
- [x] 2.1.2 No Keyboard Trap (A)
- [x] 2.1.4 Character Key Shortcuts (A)
- [x] 2.4.1 Bypass Blocks (A)
- [x] 2.4.2 Page Titled (A)
- [x] 2.4.3 Focus Order (A)
- [x] 2.4.4 Link Purpose (In Context) (A)
- [x] 2.4.5 Multiple Ways (AA)
- [x] 2.4.6 Headings and Labels (AA)
- [x] 2.4.7 Focus Visible (AA)
- [x] 2.5.1 Pointer Gestures (A)
- [x] 2.5.2 Pointer Cancellation (A)
- [x] 2.5.3 Label in Name (A)
- [x] 2.5.4 Motion Actuation (A)

#### Understandable
- [x] 3.1.1 Language of Page (A)
- [x] 3.2.1 On Focus (A)
- [x] 3.2.2 On Input (A)
- [x] 3.2.3 Consistent Navigation (AA)
- [x] 3.2.4 Consistent Identification (AA)
- [x] 3.3.1 Error Identification (A)
- [x] 3.3.2 Labels or Instructions (A)
- [x] 3.3.3 Error Suggestion (AA)
- [x] 3.3.4 Error Prevention (Legal, Financial, Data) (AA)

#### Robust
- [x] 4.1.1 Parsing (A)
- [x] 4.1.2 Name, Role, Value (A)
- [x] 4.1.3 Status Messages (AA)

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [pa11y](https://pa11y.org/)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Testing Services
- [NVDA Screen Reader](https://www.nvaccess.org/)
- [JAWS Screen Reader](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) (Built into macOS/iOS)
- [TalkBack](https://support.google.com/accessibility/android/answer/6283677) (Built into Android)

## Continuous Testing

### Pre-commit Hooks
```bash
# Install husky and lint-staged
npm install --save-dev husky lint-staged

# Add to package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### CI/CD Integration
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests
on: [push, pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Run pa11y
        run: npm run test:a11y
```

### Regular Audits
- Run automated tests weekly
- Manual keyboard testing monthly
- Screen reader testing quarterly
- User testing with people with disabilities annually
