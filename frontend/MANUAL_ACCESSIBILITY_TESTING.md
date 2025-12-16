# Manual Accessibility Testing Guide

This guide provides step-by-step instructions for manually verifying accessibility compliance across the Vider Transport Marketplace application.

## Prerequisites

- Application running locally (`npm run dev`)
- Screen reader installed (VoiceOver on macOS or NVDA on Windows)
- Keyboard available for testing
- Browser DevTools for contrast checking

---

## 1. Keyboard Navigation Testing

### Test All Pages

For each major page, perform the following tests:

#### Test Procedure
1. Navigate to the page
2. **Unplug your mouse** or don't use it
3. Press `Tab` repeatedly to move through interactive elements
4. Press `Shift + Tab` to move backward
5. Press `Enter` or `Space` to activate buttons
6. Press `Escape` to close modals/dialogs

#### Pages to Test
- [ ] HomePage (`/`)
- [ ] LoginPage (`/login`)
- [ ] RegisterPage (`/register`)
- [ ] SearchPage (`/search`)
- [ ] ListingDetailPage (`/listings/:id`)
- [ ] BookingsPage (`/bookings`)
- [ ] BookingDetailPage (`/bookings/:id`)
- [ ] MessagingPage (`/messages`)
- [ ] NotificationsPage (`/notifications`)
- [ ] NotificationSettingsPage (`/settings/notifications`)
- [ ] DashboardPage (`/dashboard`)
- [ ] AdminPanelPage (`/admin`)

#### What to Verify
- ✅ All buttons are reachable with Tab
- ✅ All form inputs are reachable with Tab
- ✅ All links are reachable with Tab
- ✅ Focus order follows visual layout (top to bottom, left to right)
- ✅ Focus indicator is clearly visible on all elements
- ✅ No keyboard traps (you can always Tab away)
- ✅ Buttons activate with Enter or Space
- ✅ Modals close with Escape key

#### Expected Results
```
✅ PASS: All interactive elements are keyboard accessible
✅ PASS: Focus order is logical
✅ PASS: Focus indicators are visible
✅ PASS: No keyboard traps detected
```

---

## 2. Screen Reader Testing

### VoiceOver (macOS)

#### Setup
1. Press `Cmd + F5` to enable VoiceOver
2. Press `Ctrl + Option + A` to start reading
3. Use `Ctrl + Option + Arrow Keys` to navigate

#### Test Procedure

**Test Form Labels:**
1. Navigate to LoginPage
2. Tab to email input
3. Listen for: "Email, edit text, required"
4. Tab to password input
5. Listen for: "Password, secure edit text, required"

**Test Error Announcements:**
1. On LoginPage, click Submit without filling form
2. Listen for error announcements
3. Verify errors are read aloud automatically

**Test Button Labels:**
1. Navigate through any page
2. Tab to each button
3. Verify each button has a descriptive label
4. Icon-only buttons should have aria-label

**Test Modal Accessibility:**
1. Open any modal dialog
2. Listen for modal title announcement
3. Verify focus is trapped in modal
4. Press Escape and verify modal closes

#### Expected Announcements

**Form Input:**
```
"Email, edit text, required"
"Password, secure edit text, required"
```

**Error Message:**
```
"Alert: Email is required"
"Alert: Password must be at least 8 characters"
```

**Button:**
```
"Sign In, button"
"Search, button"
"Close, button"
```

**Modal:**
```
"Confirm Action, dialog"
"Are you sure you want to proceed?"
```

### NVDA (Windows)

#### Setup
1. Press `Ctrl + Alt + N` to start NVDA
2. Use `Arrow Keys` to navigate
3. Press `Insert + Down Arrow` to read all

#### Test Procedure
Same as VoiceOver, but use NVDA-specific commands:
- `Insert + Down Arrow`: Read from current position
- `Insert + Space`: Toggle focus/browse mode
- `Tab`: Navigate interactive elements

---

## 3. Color Contrast Verification

### Using Chrome DevTools

#### Test Procedure
1. Open Chrome DevTools (`F12` or `Cmd + Option + I`)
2. Select the Elements tab
3. Click on any text element
4. Look at the Styles panel
5. Find the color value
6. Click the color square
7. Check the "Contrast ratio" section

#### Elements to Test
- [ ] Body text (should be 4.5:1 or higher)
- [ ] Heading text (should be 4.5:1 or higher)
- [ ] Button text (should be 4.5:1 or higher)
- [ ] Link text (should be 4.5:1 or higher)
- [ ] Error messages (should be 4.5:1 or higher)
- [ ] Success messages (should be 4.5:1 or higher)
- [ ] Placeholder text (should be 4.5:1 or higher)

#### Expected Results
```
✅ PASS: Body text - 21:1 (gray-900 on white)
✅ PASS: Primary button - 7:1 (white on primary-600)
✅ PASS: Error text - 4.5:1 (red-600 on white)
✅ PASS: Success text - 4.5:1 (green-600 on white)
```

### Manual Contrast Check

If DevTools doesn't show contrast ratio:
1. Note the foreground color (e.g., `#1f2937`)
2. Note the background color (e.g., `#ffffff`)
3. Visit [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
4. Enter both colors
5. Verify ratio is at least 4.5:1

---

## 4. Focus Indicator Verification

### Test Procedure
1. Navigate to any page
2. Press Tab to focus first interactive element
3. Observe the focus indicator (outline, ring, or highlight)
4. Continue tabbing through all interactive elements
5. Verify focus indicator is visible on each element

#### Elements to Test
- [ ] Buttons (all variants: primary, secondary, outline, ghost)
- [ ] Form inputs (text, email, password, select, textarea)
- [ ] Links (navigation links, text links)
- [ ] Cards (if clickable)
- [ ] Table rows (if interactive)
- [ ] Modal close buttons

#### Expected Results
```
✅ PASS: All buttons show blue ring on focus
✅ PASS: All inputs show blue ring on focus
✅ PASS: All links show blue ring on focus
✅ PASS: Focus indicators are clearly visible
✅ PASS: Focus indicators have sufficient contrast
```

---

## 5. Form Validation Testing

### Test Procedure

**Test Required Field Indicators:**
1. Navigate to any form (Login, Register, Create Listing)
2. Verify required fields have asterisk (*)
3. Verify required fields have `required` attribute

**Test Error Announcements:**
1. Submit form without filling required fields
2. Verify error messages appear
3. Verify error messages have red color
4. Verify error messages are associated with inputs
5. Use screen reader to verify errors are announced

**Test Error Recovery:**
1. Fill in a field with invalid data
2. Submit form
3. Verify error message appears
4. Correct the error
5. Verify error message disappears

#### Expected Results
```
✅ PASS: Required fields marked with asterisk
✅ PASS: Error messages appear on validation failure
✅ PASS: Error messages are announced to screen readers
✅ PASS: Error messages have role="alert"
✅ PASS: Errors are associated with inputs via aria-describedby
```

---

## 6. Responsive and Mobile Testing

### Test Procedure
1. Resize browser to 320px width (mobile)
2. Verify all content is visible without horizontal scrolling
3. Verify touch targets are at least 44x44px
4. Test on actual mobile device if available

#### Elements to Test
- [ ] Navigation menu (should collapse to hamburger)
- [ ] Forms (should stack vertically)
- [ ] Tables (should scroll or reflow)
- [ ] Buttons (should be large enough to tap)
- [ ] Cards (should stack vertically)

#### Expected Results
```
✅ PASS: No horizontal scrolling at 320px
✅ PASS: All content is readable
✅ PASS: Touch targets are at least 44x44px
✅ PASS: Navigation works on mobile
```

---

## 7. Modal and Dialog Testing

### Test Procedure

**Test Focus Management:**
1. Open a modal dialog
2. Verify focus moves to modal
3. Press Tab to navigate within modal
4. Verify focus stays within modal (focus trap)
5. Press Escape to close modal
6. Verify focus returns to trigger element

**Test Screen Reader Announcements:**
1. Enable screen reader
2. Open modal
3. Listen for modal title announcement
4. Verify modal content is readable
5. Close modal and verify announcement

#### Expected Results
```
✅ PASS: Focus moves to modal on open
✅ PASS: Focus is trapped within modal
✅ PASS: Modal closes with Escape key
✅ PASS: Focus returns to trigger on close
✅ PASS: Modal title is announced
✅ PASS: Modal has role="dialog" and aria-modal="true"
```

---

## 8. Navigation Testing

### Test Procedure

**Test Main Navigation:**
1. Tab to navigation menu
2. Verify all nav links are keyboard accessible
3. Press Enter to navigate
4. Verify current page is indicated

**Test Mobile Navigation:**
1. Resize to mobile width
2. Tab to hamburger menu button
3. Press Enter to open menu
4. Verify menu is keyboard accessible
5. Press Escape to close menu

#### Expected Results
```
✅ PASS: All navigation links are keyboard accessible
✅ PASS: Current page is visually indicated
✅ PASS: Mobile menu opens with Enter
✅ PASS: Mobile menu closes with Escape
✅ PASS: Focus is managed correctly
```

---

## Testing Checklist Summary

### Automated Tests
- [x] Run `npm test accessibility.test.tsx`
- [x] All 29 tests passing

### Manual Tests
- [ ] Keyboard navigation on all major pages
- [ ] Screen reader testing (VoiceOver or NVDA)
- [ ] Color contrast verification
- [ ] Focus indicator visibility
- [ ] Form validation announcements
- [ ] Responsive behavior
- [ ] Modal focus management
- [ ] Navigation accessibility

---

## Reporting Issues

If you find accessibility issues during manual testing:

1. **Document the issue:**
   - Page/component affected
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - WCAG criterion violated

2. **Severity levels:**
   - **Critical:** Blocks keyboard users or screen reader users
   - **High:** Significantly impacts accessibility
   - **Medium:** Impacts some users
   - **Low:** Minor improvement opportunity

3. **Create a fix:**
   - Reference the ACCESSIBILITY_CHECKLIST.md
   - Use design system components
   - Add automated test if possible
   - Verify fix with manual testing

---

## Success Criteria

Manual testing is complete when:

✅ All pages are fully keyboard accessible  
✅ Screen reader announces all content correctly  
✅ All text meets WCAG AA contrast ratios  
✅ Focus indicators are visible on all interactive elements  
✅ Form validation errors are properly announced  
✅ Modals manage focus correctly  
✅ Navigation is accessible on all screen sizes  
✅ No critical or high severity issues found

---

## Additional Resources

- **Automated Tests:** `frontend/src/test/accessibility.test.tsx`
- **Compliance Report:** `frontend/ACCESSIBILITY_COMPLIANCE_REPORT.md`
- **Developer Checklist:** `frontend/ACCESSIBILITY_CHECKLIST.md`
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM:** https://webaim.org/

---

**Last Updated:** December 4, 2024  
**Test Coverage:** All migrated pages and design system components
