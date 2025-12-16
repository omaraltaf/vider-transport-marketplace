# Implementation Plan

- [x] 1. Create database schema and migrations
  - Add AvailabilityBlock model to Prisma schema
  - Add RecurringBlock model to Prisma schema
  - Add relations to User model for audit tracking
  - Create and run database migration
  - Update seed data to include sample availability blocks
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

- [x] 2. Create availability service with core logic
  - Create `src/services/availability.service.ts`
  - Implement availability block creation with validation
  - Implement date range validation (start ≤ end)
  - Implement conflict detection with existing bookings
  - Implement availability query logic
  - Add comprehensive error handling
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 8.2_

- [ ] 2.1 Write property test for block creation and persistence
  - **Property 1: Availability block creation and persistence**
  - **Validates: Requirements 1.1, 1.2, 1.4**

- [x] 2.2 Write property test for date range validation
  - **Property 2: Date range validation**
  - **Validates: Requirements 1.4**

- [x] 2.3 Write property test for booking conflict detection
  - **Property 3: Booking conflict detection**
  - **Validates: Requirements 1.6, 7.3, 8.2**

- [x] 3. Implement recurring block functionality
  - Add recurring block creation to availability service
  - Implement recurring pattern instance generation algorithm
  - Implement day-of-week filtering logic
  - Add recurring block update (all instances vs future only)
  - Add recurring block deletion (all instances vs future only)
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [x] 3.1 Write property test for recurring instance generation
  - **Property 4: Recurring block instance generation**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 3.2 Write property test for recurring block update scope
  - **Property 5: Recurring block update scope**
  - **Validates: Requirements 2.5**

- [x] 3.3 Write property test for recurring block deletion scope
  - **Property 6: Recurring block deletion scope**
  - **Validates: Requirements 2.6**

- [x] 4. Implement booking-calendar synchronization
  - Add booking status change hooks in booking service
  - Implement automatic availability update on booking acceptance
  - Implement availability restoration on booking cancellation
  - Implement completed booking persistence in calendar
  - Add transaction safety for booking-availability updates
  - _Requirements: 3.1, 3.2, 3.4, 8.3_

- [x] 4.1 Write property test for automatic booking synchronization
  - **Property 7: Automatic booking synchronization**
  - **Validates: Requirements 3.1, 8.3**

- [x] 4.2 Write property test for booking cancellation restoration
  - **Property 8: Booking cancellation availability restoration**
  - **Validates: Requirements 3.2**

- [x] 4.3 Write property test for completed booking persistence
  - **Property 9: Completed booking persistence**
  - **Validates: Requirements 3.4**

- [x] 5. Integrate availability filtering with search
  - Update listing search service to accept date filters
  - Implement availability filtering in search queries
  - Add subqueries for availability blocks and bookings
  - Optimize search performance with proper indexes
  - Add search result count with availability filtering
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 8.5_

- [x] 5.1 Write property test for search availability filtering
  - **Property 10: Search availability filtering**
  - **Validates: Requirements 4.1, 4.2, 4.3, 8.5**

- [x] 6. Implement booking validation against availability
  - Add availability check to booking request validation
  - Implement conflict error messages with details
  - Add pre-booking availability verification
  - Integrate with existing booking flow
  - _Requirements: 5.3, 5.4_

- [x] 6.1 Write property test for booking validation
  - **Property 11: Booking validation against availability**
  - **Validates: Requirements 5.3, 5.4**

- [x] 7. Create availability API routes
  - Create `src/routes/availability.routes.ts`
  - Implement POST /api/availability/blocks (create block)
  - Implement GET /api/availability/blocks/:listingId (get blocks)
  - Implement DELETE /api/availability/blocks/:blockId (delete block)
  - Implement POST /api/availability/recurring (create recurring)
  - Implement PUT /api/availability/recurring/:blockId (update recurring)
  - Implement DELETE /api/availability/recurring/:blockId (delete recurring)
  - Implement POST /api/availability/check (check availability)
  - Implement GET /api/availability/calendar/:listingId (get calendar view)
  - Add authentication and authorization middleware
  - Register routes in main app
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.5, 2.6, 5.1, 5.2_

- [x] 7.1 Write unit tests for availability routes
  - Test authentication requirements
  - Test authorization (listing owner only)
  - Test successful block creation
  - Test conflict detection in routes
  - Test recurring block operations
  - _Requirements: 1.1, 1.2, 1.4, 1.6, 2.1, 2.5, 2.6_

- [x] 8. Implement bulk calendar management
  - Add bulk block creation to availability service
  - Implement individual listing validation in bulk operations
  - Add result aggregation (successful vs failed)
  - Implement POST /api/availability/bulk route
  - Add bulk operation error reporting
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.1 Write property test for bulk operations
  - **Property 12: Bulk block creation with individual validation**
  - **Validates: Requirements 6.2, 6.3, 6.4**

- [-] 9. Implement conflict notifications
  - Add notification generation for block-booking conflicts
  - Implement automatic booking rejection for blocked dates
  - Add conflict notification to notification service
  - Integrate with existing notification system
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 9.1 Write property test for conflict notifications
  - **Property 13: Conflict notification generation**
  - **Validates: Requirements 7.1**

- [x] 9.2 Write property test for automatic booking rejection
  - **Property 14: Automatic booking rejection for blocked dates**
  - **Validates: Requirements 7.2**

- [-] 10. Implement availability analytics
  - Add analytics calculation to availability service
  - Implement blocked days percentage calculation
  - Implement booked days vs available days calculation
  - Implement utilization rate calculation
  - Implement GET /api/availability/analytics/:listingId route
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 10.1 Write property test for availability statistics
  - **Property 15: Availability statistics calculation**
  - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 11. Implement calendar export
  - Add iCalendar format generation to availability service
  - Implement export with all blocks and bookings
  - Add date range filtering for export
  - Implement GET /api/availability/export/:listingId route
  - Add downloadable file response
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11.1 Write property test for calendar export
  - **Property 16: Calendar export completeness**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**

- [x] 12. Create frontend calendar view component
  - Create `frontend/src/components/availability/CalendarView.tsx`
  - Implement month view with date grid
  - Add visual distinction for available/blocked/booked dates
  - Implement date selection for booking
  - Add month navigation (previous/next)
  - Implement hover tooltips for date details
  - Use design system components
  - _Requirements: 1.3, 3.3, 3.5, 5.1, 5.2, 5.5_

- [x] 13. Create availability block management UI
  - Create `frontend/src/components/availability/BlockForm.tsx`
  - Implement date range picker
  - Add reason input field
  - Implement form validation
  - Add conflict error display
  - Create `frontend/src/components/availability/BlockList.tsx` for viewing blocks
  - Add delete block functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 14. Create recurring block management UI
  - Create `frontend/src/components/availability/RecurringBlockForm.tsx`
  - Implement day-of-week selector (checkboxes for Sun-Sat)
  - Add start date and optional end date pickers
  - Implement recurrence preview
  - Add edit options (this instance vs all future)
  - Add delete options (this instance vs all future)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 15. Integrate calendar with listing pages
  - Add calendar view to listing detail page for renters
  - Add calendar management to listing edit page for providers
  - Implement availability check before booking submission
  - Add conflict error display on booking form
  - Update search results to show availability status
  - _Requirements: 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 16. Create bulk calendar management interface
  - Create `frontend/src/pages/BulkCalendarManagementPage.tsx`
  - Implement listing selection (checkboxes)
  - Add bulk block creation form
  - Implement result display (successful vs failed)
  - Add conflict details for failed listings
  - Create summary view of all listings' availability
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 17. Implement availability analytics dashboard
  - Create `frontend/src/components/availability/AnalyticsDashboard.tsx`
  - Display blocked days percentage with chart
  - Display booked vs available days with chart
  - Show utilization rate over time
  - Add time period selector (week/month/year)
  - Integrate with listing analytics page
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 18. Implement calendar export UI
  - Add export button to calendar view
  - Implement date range selector for export
  - Add download functionality
  - Show export success/error messages
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 19. Implement conflict notification UI
  - Add conflict notifications to notification dropdown
  - Create conflict resolution modal
  - Add options to cancel booking or remove block
  - Implement conflict notification actions
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 20. Implement responsive design for calendar
  - Add CSS media queries for mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
  - Implement swipe navigation for mobile
  - Optimize date selection for touch devices
  - Ensure calendar is readable on small screens
  - Test horizontal scrolling if needed
  - _Requirements: All UI requirements_

- [x] 21. Implement accessibility features for calendar
  - Add ARIA labels to all calendar elements
  - Implement keyboard navigation (arrow keys, Enter, Escape)
  - Add screen reader announcements for date status
  - Ensure focus management in calendar
  - Add visible focus indicators
  - Test with screen reader
  - _Requirements: All UI requirements_

- [x] 21.1 Write property test for calendar keyboard accessibility
  - Test keyboard navigation through calendar dates
  - Verify ARIA labels are present
  - _Requirements: Accessibility_

- [x] 22. Add loading and error states
  - Implement skeleton loaders for calendar
  - Add error messages for failed operations
  - Implement retry functionality
  - Add loading indicators for async operations
  - _Requirements: All_

- [-] 23. Performance optimization
  - Implement React.memo for calendar components
  - Add useMemo for expensive calculations (recurring instances)
  - Optimize calendar rendering for large date ranges
  - Add pagination for analytics over long periods
  - Test and verify calendar load time < 1 second
  - _Requirements: All_

- [x] 23.1 Write integration tests for complete availability flow
  - Test flow from block creation to search filtering
  - Test booking acceptance triggering calendar update
  - Test recurring block instances in calendar view
  - Test bulk operations across multiple listings
  - _Requirements: All_

- [ ] 24. Run comprehensive test suite
  - Execute all backend and frontend tests
  - Verify all property-based tests pass
  - Check integration tests
  - Validate accessibility compliance
  - Document test results and any issues
  - _Requirements: All_

- [x] 24.1 Run backend service tests
  - Availability service tests
  - Availability route tests
  - Booking synchronization tests
  - Search integration tests
  - _Requirements: 1.1-1.6, 2.1-2.6, 3.1-3.4, 4.1-4.5, 8.1-8.5_

- [x] 24.2 Run frontend component tests
  - Calendar view component tests
  - Block form component tests
  - Recurring block form tests
  - Bulk management tests
  - _Requirements: 1.1-1.6, 2.1-2.6, 5.1-5.5, 6.1-6.5_

- [x] 24.3 Run property-based tests
  - Run all 16 property-based tests
  - Verify 100+ iterations per property
  - Document any failures
  - _Requirements: All_

- [x] 24.4 Run integration tests
  - Run availability flow integration tests
  - Run search integration tests
  - Run booking synchronization tests
  - _Requirements: All_

- [x] 24.5 Final verification and summary
  - Verify all test suites pass
  - Document any remaining issues
  - Provide completion summary
  - _Requirements: All_
