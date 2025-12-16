# Implementation Plan

- [x] 1. Set up design system foundation
  - Create design tokens directory structure
  - Install lucide-react for icons
  - Set up CSS Modules configuration
  - _Requirements: 1.1, 1.3_

- [x] 1.1 Create design token files
  - Create `frontend/src/design-system/tokens/colors.ts` with color palette
  - Create `frontend/src/design-system/tokens/typography.ts` with font definitions
  - Create `frontend/src/design-system/tokens/spacing.ts` with spacing scale
  - Create `frontend/src/design-system/tokens/shadows.ts` with elevation system
  - Create `frontend/src/design-system/tokens/borders.ts` with border radius values
  - Create `frontend/src/design-system/tokens/breakpoints.ts` with responsive breakpoints
  - Create `frontend/src/design-system/tokens/index.ts` to export all tokens
  - _Requirements: 1.1, 1.3, 4.1_

- [x] 1.2 Create global styles
  - Create `frontend/src/design-system/global.css` with CSS reset and base styles
  - Apply typography tokens to body and headings
  - Set up CSS custom properties for theme values
  - _Requirements: 1.2, 1.3_

- [x] 2. Build atomic components (Button, Input, Icon)
  - Create component directory structure
  - Implement base styling patterns
  - _Requirements: 3.1, 3.2, 5.1_

- [x] 2.1 Create Button component
  - Create `frontend/src/design-system/components/Button/Button.tsx`
  - Implement all variants (primary, secondary, outline, ghost, danger)
  - Implement all sizes (sm, md, lg)
  - Implement all states (hover, active, disabled, loading)
  - Add icon support (leftIcon, rightIcon)
  - Create `Button.module.css` with styles
  - _Requirements: 3.1, 1.4, 7.1_

- [x] 2.2 Write unit tests for Button component
  - Test all variants render correctly
  - Test all sizes apply correct styles
  - Test disabled state prevents clicks
  - Test loading state shows spinner
  - Test icon rendering
  - _Requirements: 3.1_

- [x] 2.3 Create Input component
  - Create `frontend/src/design-system/components/Input/Input.tsx`
  - Implement text, email, password, number, date types
  - Implement validation states (default, error, success)
  - Add label, helper text, and error message support
  - Add icon support (leftIcon, rightIcon)
  - Create `Input.module.css` with styles
  - _Requirements: 3.2, 8.2, 8.4_

- [x] 2.4 Write unit tests for Input component
  - Test all input types
  - Test validation states
  - Test error message display
  - Test icon rendering
  - _Requirements: 3.2_

- [x] 2.5 Create Icon wrapper component
  - Create `frontend/src/design-system/components/Icon/Icon.tsx`
  - Implement size variants (sm, md, lg, xl)
  - Add color prop support
  - Create mapping for standard icons
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 2.6 Create Textarea component
  - Create `frontend/src/design-system/components/Textarea/Textarea.tsx`
  - Extend Input component styling
  - Add auto-resize functionality
  - _Requirements: 3.2, 8.1_

- [x] 2.7 Create Select component
  - Create `frontend/src/design-system/components/Select/Select.tsx`
  - Style native select element
  - Add custom dropdown icon
  - Implement validation states
  - _Requirements: 3.2, 8.3_

- [x] 3. Build molecule components (Card, FormField, SearchBar)
  - Combine atomic components
  - Add composition patterns
  - _Requirements: 3.3, 8.1_

- [x] 3.1 Create Card component
  - Create `frontend/src/design-system/components/Card/Card.tsx`
  - Implement elevation with shadows
  - Add hoverable variant
  - Add padding size variants
  - Create `Card.module.css`
  - _Requirements: 3.3, 4.4_

- [x] 3.2 Create FormField component
  - Create `frontend/src/design-system/components/FormField/FormField.tsx`
  - Combine Input with label and error handling
  - Support all input types
  - Add required field indicator
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 3.3 Create SearchBar component
  - Create `frontend/src/design-system/components/SearchBar/SearchBar.tsx`
  - Combine Input with search icon
  - Add clear button
  - Add loading state
  - _Requirements: 5.2_

- [x] 4. Build organism components (Modal, Table, Navbar)
  - Create complex interactive components
  - Implement responsive behavior
  - _Requirements: 3.4, 3.5, 2.4_

- [x] 4.1 Create Modal component
  - Create `frontend/src/design-system/components/Modal/Modal.tsx`
  - Implement overlay backdrop
  - Add close button with X icon
  - Implement escape key handler
  - Implement click-outside-to-close
  - Add focus trap for accessibility
  - Implement fade-in animation
  - Create size variants (sm, md, lg, xl)
  - Create `Modal.module.css`
  - _Requirements: 3.4, 7.4, 6.2_

- [x] 4.2 Write unit tests for Modal component
  - Test open/close functionality
  - Test escape key closes modal
  - Test click outside closes modal
  - Test focus trap
  - _Requirements: 3.4_

- [x] 4.3 Create responsive Table component
  - Create `frontend/src/design-system/components/Table/Table.tsx`
  - Implement desktop table layout
  - Implement mobile card layout with media queries
  - Add sortable column headers
  - Add pagination controls
  - Add loading skeleton state
  - Add empty state
  - Create `Table.module.css` with responsive styles
  - _Requirements: 3.5, 2.3, 7.3_

- [x] 4.4 Create Navbar component
  - Create `frontend/src/design-system/components/Navbar/Navbar.tsx`
  - Implement desktop horizontal layout
  - Implement mobile hamburger menu
  - Add slide-in drawer for mobile
  - Add sticky positioning
  - Add shadow on scroll
  - Create `Navbar.module.css`
  - _Requirements: 2.4, 5.2_

- [x] 4.5 Create Drawer component (for mobile menu)
  - Create `frontend/src/design-system/components/Drawer/Drawer.tsx`
  - Implement slide-in animation from left
  - Add overlay backdrop
  - Implement close on backdrop click
  - Add focus trap
  - _Requirements: 2.4, 7.4_

- [x] 5. Build layout components (Container, Grid, Stack)
  - Create responsive layout primitives
  - Implement spacing utilities
  - _Requirements: 4.3, 4.5_

- [x] 5.1 Create Container component
  - Create `frontend/src/design-system/components/Container/Container.tsx`
  - Implement max-width constraint (1200px)
  - Add responsive padding
  - Center content horizontally
  - _Requirements: 4.5_

- [x] 5.2 Create Grid component
  - Create `frontend/src/design-system/components/Grid/Grid.tsx`
  - Implement CSS Grid layout
  - Add responsive column configuration
  - Add gap spacing options
  - _Requirements: 4.3_

- [x] 5.3 Create Stack component
  - Create `frontend/src/design-system/components/Stack/Stack.tsx`
  - Implement flexbox vertical/horizontal stacking
  - Add spacing between children
  - Add alignment options
  - _Requirements: 4.3_

- [x] 6. Create utility components (Badge, Spinner, Skeleton)
  - Build supporting UI elements
  - Add loading and status indicators
  - _Requirements: 4.2, 7.2, 7.3_

- [x] 6.1 Create Badge component
  - Create `frontend/src/design-system/components/Badge/Badge.tsx`
  - Implement color variants (success, warning, error, info, neutral)
  - Add size variants
  - _Requirements: 4.2_

- [x] 6.2 Create Spinner component
  - Create `frontend/src/design-system/components/Spinner/Spinner.tsx`
  - Implement rotating animation
  - Add size variants
  - Add color variants
  - _Requirements: 7.2_

- [x] 6.3 Create Skeleton component
  - Create `frontend/src/design-system/components/Skeleton/Skeleton.tsx`
  - Implement shimmer animation
  - Add shape variants (text, circle, rectangle)
  - _Requirements: 7.3_

- [x] 7. Refactor existing pages to use design system
  - Update all pages systematically
  - Ensure mobile responsiveness
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7.1 Refactor authentication pages
  - Update LoginPage to use new Button, Input, Card components
  - Update RegisterPage to use new FormField components
  - Ensure mobile-friendly layout
  - Add proper icons
  - _Requirements: 2.1, 2.2, 8.1_

- [x] 7.2 Refactor listing pages
  - Update SearchPage with new SearchBar, Card, Grid components
  - Update CreateVehicleListingPage with new FormField components
  - Update CreateDriverListingPage with new FormField components
  - Update EditVehicleListingPage with new FormField components
  - Update EditDriverListingPage with new FormField components
  - Ensure forms work well on mobile
  - _Requirements: 2.1, 2.2, 8.1, 8.3_

- [x] 7.3 Refactor listing management pages
  - Update VehicleListingsPage with new Table component
  - Update DriverListingsPage with new Table component
  - Ensure tables transform to cards on mobile
  - Add proper action icons
  - _Requirements: 2.3, 5.2_

- [x] 7.4 Refactor booking pages
  - Update BookingsPage with new Table, Badge components
  - Update BookingDetailPage with new Card, Stack components
  - Ensure mobile-friendly layout
  - _Requirements: 2.1, 4.2_

- [x] 7.5 Refactor admin pages
  - Update AdminUsersPage with new Table component
  - Update AdminCompaniesPage with new Table component
  - Update AdminVehicleListingsPage with new Table component
  - Update AdminDriverListingsPage with new Table component
  - Update AdminBookingsPage with new Table component
  - Update AdminTransactionsPage with new Table component
  - Update AdminDisputesPage with new Table component
  - Update AdminAnalyticsPage with new Card, Grid components
  - Ensure all admin pages are mobile-responsive
  - _Requirements: 2.1, 2.3_

- [x] 7.6 Refactor profile and settings pages
  - Update CompanyProfilePage with new Card, Stack components
  - Update CompanyProfileEditPage with new FormField components
  - Update NotificationSettingsPage with new FormField components
  - Update DataExportPage with new Button, Card components
  - Update DeleteAccountPage with new Modal, Button components
  - _Requirements: 2.1, 8.1_

- [x] 7.7 Refactor communication pages
  - Update MessagingPage with new Card, Input components
  - Update NotificationsPage with new Card, Badge components
  - Ensure mobile-friendly chat interface
  - _Requirements: 2.1, 4.2_

- [x] 7.8 Update Navbar across all pages
  - Replace existing Navbar with new design system Navbar
  - Ensure hamburger menu works on mobile
  - Add proper navigation icons
  - _Requirements: 2.4, 5.2_

- [x] 8. Add responsive improvements
  - Fine-tune mobile experience
  - Test on various devices
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8.1 Implement responsive typography
  - Add fluid typography scaling
  - Ensure readability on all screen sizes
  - Test text scaling up to 200%
  - _Requirements: 6.5_

- [x] 8.2 Optimize touch targets for mobile
  - Audit all interactive elements
  - Ensure minimum 44x44px touch targets
  - Add appropriate spacing between touch targets
  - _Requirements: 2.2_

- [x] 8.3 Test and fix mobile layouts
  - Test all pages on mobile devices (320px to 768px)
  - Fix any horizontal scrolling issues
  - Ensure single-column layouts on mobile
  - Test on iOS Safari and Android Chrome
  - _Requirements: 2.1, 2.5_

- [x] 9. Accessibility audit and improvements
  - Ensure WCAG 2.1 AA compliance
  - Test with assistive technologies
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9.1 Audit color contrast
  - Test all text/background combinations
  - Fix any contrast ratio failures
  - Ensure semantic colors meet standards
  - _Requirements: 6.1_

- [x] 9.2 Implement keyboard navigation
  - Test tab order on all pages
  - Ensure focus indicators are visible
  - Add skip-to-content link
  - Test modal focus traps
  - _Requirements: 6.2_

- [x] 9.3 Add ARIA labels
  - Add labels to icon-only buttons
  - Add labels to form inputs
  - Add live regions for dynamic content
  - Test with screen readers
  - _Requirements: 6.3, 6.4_

- [x] 10. Documentation and style guide
  - Create component documentation
  - Build interactive style guide
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 10.1 Create component documentation
  - Document all component props and usage
  - Add code examples for each component
  - Document responsive behavior
  - Create `frontend/src/design-system/README.md`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 10.2 Create design tokens documentation
  - Document color palette with visual swatches
  - Document typography scale
  - Document spacing scale
  - Document usage guidelines
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
