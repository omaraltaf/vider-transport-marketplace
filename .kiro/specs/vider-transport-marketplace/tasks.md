# Implementation Plan

- [x] 1. Project initialization and core infrastructure
  - Set up Node.js/TypeScript project with Express or Fastify
  - Configure TypeScript with strict mode
  - Set up PostgreSQL database connection
  - Configure Prisma or TypeORM as ORM
  - Create .env.example file with all required environment variables
  - Set up basic project structure (src/services, src/models, src/routes, src/middleware)
  - _Requirements: 22.1, 22.2, 22.3, 22.4_

- [x] 1.1 Write property test for environment configuration
  - **Property 37: Configuration from environment**
  - **Validates: Requirements 22.1, 22.3, 22.4**

- [x] 2. Database schema and migrations
  - Define Prisma schema or TypeORM entities for all core models (User, Company, VehicleListing, DriverListing, Booking, Rating, Message, Transaction, AuditLog)
  - Create initial migration to set up all database tables
  - Create seed script for test data (sample companies, listings, users)
  - Implement migration tracking system
  - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 2.1 Write property test for migration tracking
  - **Property 36: Migration tracking**
  - **Validates: Requirements 21.4**

- [x] 3. Authentication service implementation
  - Implement user registration with email, password, and company data capture
  - Implement bcrypt password hashing (salt rounds ≥ 12)
  - Implement email verification token generation and validation
  - Implement JWT token generation (access and refresh tokens)
  - Implement login endpoint with credential validation
  - Implement refresh token rotation
  - Implement logout functionality
  - _Requirements: 1.1, 1.2, 1.3, 18.1, 18.2, 18.4_

- [x] 3.1 Write property test for password security
  - **Property 30: Password security**
  - **Validates: Requirements 18.1**

- [x] 3.2 Write property test for duplicate email prevention
  - **Property 3: Duplicate email prevention**
  - **Validates: Requirements 1.4**

- [x] 3.3 Write property test for organization number validation
  - **Property 4: Organization number validation**
  - **Validates: Requirements 1.5**

- [x] 3.4 Write property test for email verification activation
  - **Property 2: Email verification activation**
  - **Validates: Requirements 1.3**

- [x] 4. Authorization middleware and RBAC
  - Implement Role enum (PLATFORM_ADMIN, COMPANY_ADMIN, COMPANY_USER)
  - Create authentication middleware to validate JWT tokens
  - Create authorization middleware for role-based access control
  - Create company-scoped authorization middleware
  - Implement authorization service with role and resource ownership checks
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 18.5_

- [x] 4.1 Write property test for role-based authorization
  - **Property 7: Role-based authorization enforcement**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

- [x] 4.2 Write property test for company-scoped authorization
  - **Property 8: Company-scoped authorization**
  - **Validates: Requirements 3.2**

- [x] 4.3 Write property test for authentication token validation
  - **Property 31: Authentication token validation**
  - **Validates: Requirements 18.5**

- [x] 5. Company profile management
  - Implement company profile creation during registration
  - Implement company profile update endpoint
  - Implement company profile retrieval endpoint (public view)
  - Implement verification badge management (admin only)
  - Add validation for all required company fields
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5.1 Write property test for profile update persistence
  - **Property 5: Profile update persistence**
  - **Validates: Requirements 2.1**

- [x] 5.2 Write property test for verification badge display
  - **Property 6: Verification badge display**
  - **Validates: Requirements 2.2**

- [x] 6. Vehicle listing service
  - Implement vehicle listing creation with all required fields
  - Implement photo upload functionality (local filesystem or S3)
  - Implement service offering configuration (with-driver, without-driver, both)
  - Implement listing update and deletion endpoints
  - Implement listing status management (ACTIVE, SUSPENDED, REMOVED)
  - Add validation for all required vehicle listing fields
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.1 Write property test for vehicle listing completeness
  - **Property 9: Vehicle listing completeness**
  - **Validates: Requirements 4.1, 4.4**

- [x] 6.2 Write property test for service offering flexibility
  - **Property 10: Service offering flexibility**
  - **Validates: Requirements 4.2**

- [x] 7. Driver listing service
  - Implement driver listing creation with all required fields
  - Implement license document upload functionality
  - Implement driver verification workflow (admin only)
  - Implement driver verification badge display
  - Prevent publication of unverified driver listings
  - Add validation for all required driver listing fields
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7.1 Write property test for driver listing verification requirement
  - **Property 11: Driver listing with verification requirement**
  - **Validates: Requirements 5.4**

- [x] 7.2 Write property test for driver verification badge display
  - **Property 12: Driver verification badge display**
  - **Validates: Requirements 5.3**

- [x] 8. Search and filtering service
  - Implement search endpoint with filter support (listing type, location, vehicle type, fuel type, capacity, price range, date range, with/without driver, tags)
  - Implement location-based filtering (Fylke, Kommune, radius search with coordinates)
  - Implement filter conjunction logic (AND logic for multiple filters)
  - Implement search result pagination
  - Implement sorting options (price, rating, distance)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.1 Write property test for search filter conjunction
  - **Property 13: Search filter conjunction**
  - **Validates: Requirements 6.3, 6.4**

- [x] 8.2 Write property test for location-based search accuracy
  - **Property 14: Location-based search accuracy**
  - **Validates: Requirements 6.2**

- [x] 9. Booking service - cost calculation and creation
  - Implement platform configuration management (commission rate, tax rate, timeout hours)
  - Implement cost calculation service with accurate formula
  - Implement booking request creation endpoint
  - Implement self-booking prevention validation
  - Implement cross-company vehicle-driver validation
  - Implement availability calendar blocking on booking creation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.4, 9.5_

- [x] 9.1 Write property test for cost calculation accuracy
  - **Property 15: Cost calculation accuracy**
  - **Validates: Requirements 7.1, 9.5**

- [x] 9.2 Write property test for self-booking prevention
  - **Property 16: Self-booking prevention**
  - **Validates: Requirements 7.3**

- [x] 9.3 Write property test for cross-company vehicle-driver validation
  - **Property 17: Cross-company vehicle-driver validation**
  - **Validates: Requirements 7.4**

- [x] 9.4 Write property test for availability blocking on booking
  - **Property 18: Availability blocking on booking**
  - **Validates: Requirements 7.5**

- [x] 9.5 Write property test for configuration propagation
  - **Property 21: Configuration propagation**
  - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 10. Booking service - provider response workflow
  - Implement booking acceptance endpoint with status transition and contract generation
  - Implement booking decline endpoint with status transition
  - Implement propose new terms endpoint
  - Implement auto-expiration background job for pending bookings
  - Implement booking state machine with valid transitions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 10.1 Write property test for booking acceptance workflow
  - **Property 19: Booking acceptance workflow**
  - **Validates: Requirements 8.2**

- [x] 10.2 Write property test for booking auto-expiration
  - **Property 20: Booking auto-expiration**
  - **Validates: Requirements 8.5**

- [x] 10.3 Write property test for booking state machine validity
  - **Property 22: Booking state machine validity**
  - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**

- [x] 11. Payment and invoicing service
  - Implement PDF invoice generation with all required financial details
  - Implement PDF receipt generation
  - Implement transaction record creation and management
  - Implement billing page endpoint to retrieve all invoices and receipts
  - Implement platform revenue calculation for reporting
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 14.1_

- [x] 11.1 Write property test for invoice generation on confirmation
  - **Property 23: Invoice generation on confirmation**
  - **Validates: Requirements 11.1, 11.4**

- [x] 11.2 Write property test for receipt generation on completion
  - **Property 24: Receipt generation on completion**
  - **Validates: Requirements 11.2**

- [x] 11.3 Write property test for revenue calculation accuracy
  - **Property 28: Revenue calculation accuracy**
  - **Validates: Requirements 14.1**

- [x] 12. Rating and review service
  - Implement rating submission endpoint (company and driver ratings)
  - Implement rating range validation (1-5 stars)
  - Implement aggregated rating calculation
  - Implement provider response to review endpoint
  - Implement rating display on company and driver profiles
  - Trigger rating prompt when booking status changes to Completed
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 12.1 Write property test for rating aggregation accuracy
  - **Property 25: Rating aggregation accuracy**
  - **Validates: Requirements 12.4**

- [x] 12.2 Write property test for rating range validation
  - **Property 26: Rating range validation**
  - **Validates: Requirements 12.2**

- [x] 13. Messaging service
  - Implement message thread creation on booking creation
  - Implement send message endpoint
  - Implement message retrieval endpoint for a thread
  - Implement unread message tracking and mark as read functionality
  - Implement unread count endpoint
  - Implement message thread list endpoint
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

- [x] 13.1 Write property test for message thread creation on booking
  - **Property 40: Message thread creation on booking**
  - **Validates: Requirements 25.1**

- [x] 13.2 Write property test for message delivery to all participants
  - **Property 41: Message delivery to all participants**
  - **Validates: Requirements 25.2**

- [x] 13.3 Write property test for unread message indicator
  - **Property 42: Unread message indicator**
  - **Validates: Requirements 25.4**

- [x] 14. Notification service
  - Implement notification preferences management
  - Implement multi-channel notification delivery (email and in-app)
  - Implement email notification templates (booking updates, messages, ratings)
  - Implement SMTP email sending integration
  - Implement critical notification override logic
  - Implement notification preference enforcement
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [x] 14.1 Write property test for notification preference enforcement
  - **Property 43: Notification preference enforcement**
  - **Validates: Requirements 26.5**

- [x] 14.2 Write property test for critical notification override
  - **Property 44: Critical notification override**
  - **Validates: Requirements 26.3**

- [x] 15. Admin service - entity management
  - Implement admin panel endpoints for searching and listing all entities (Users, Companies, Listings, Bookings, Disputes, Transactions)
  - Implement company verification endpoint
  - Implement driver verification endpoint
  - Implement listing suspension endpoint
  - Implement listing removal endpoint
  - Implement audit logging for all admin actions
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 20.3_

- [x] 15.1 Write property test for listing suspension removes from search
  - **Property 27: Listing suspension removes from search**
  - **Validates: Requirements 13.3**

- [x] 15.2 Write property test for admin action audit logging
  - **Property 35: Admin action audit logging**
  - **Validates: Requirements 20.3**

- [x] 16. Admin service - dispute resolution and reporting
  - Implement dispute creation endpoint
  - Implement dispute resolution workflow
  - Implement dispute notification to admin
  - Implement analytics dashboard endpoint (revenue, active listings, bookings, top-rated providers)
  - Implement report filtering by date range, company, and transaction type
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 14.2, 14.3, 14.4, 14.5_

- [x] 16.1 Write property test for dispute status transition
  - **Property 29: Dispute status transition**
  - **Validates: Requirements 15.1**

- [x] 17. GDPR compliance features
  - Implement user data export endpoint (all personal data in machine-readable format)
  - Implement account deletion endpoint with data anonymization
  - Implement audit log viewing endpoint for users
  - Ensure data deletion removes or anonymizes data from all tables
  - _Requirements: 20.1, 20.2, 20.4, 20.5_

- [x] 17.1 Write property test for GDPR data export completeness
  - **Property 33: GDPR data export completeness**
  - **Validates: Requirements 20.1**

- [x] 17.2 Write property test for GDPR data deletion completeness
  - **Property 34: GDPR data deletion completeness**
  - **Validates: Requirements 20.2, 20.5**

- [x] 18. Rate limiting and security
  - Implement rate limiting middleware for authentication endpoints (5 per IP per 15 min)
  - Implement rate limiting middleware for booking creation (20 per user per hour)
  - Implement rate limiting middleware for search (100 per IP per minute)
  - Implement rate limit exceeded response (HTTP 429)
  - Implement rate limit event logging
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 18.1 Write property test for rate limiting enforcement
  - **Property 32: Rate limiting enforcement**
  - **Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5**

- [x] 19. Logging and monitoring
  - Implement structured logging with Winston or Pino
  - Implement error logging with full context
  - Implement operation logging for critical actions
  - Implement health check endpoint with dependency status
  - Implement health check failure response (HTTP 503)
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

- [x] 19.1 Write property test for error logging completeness
  - **Property 38: Error logging completeness**
  - **Validates: Requirements 24.1**

- [x] 19.2 Write property test for health check accuracy
  - **Property 39: Health check accuracy**
  - **Validates: Requirements 24.3, 24.4**

- [x] 20. OpenAPI specification
  - Generate OpenAPI 3.0 specification document for all API endpoints
  - Document all request parameters, response schemas, and authentication requirements
  - Document all data models with field types and constraints
  - Set up Swagger UI for API documentation browsing
  - _Requirements: 16.1, 16.2, 16.3_

- [x] 21. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise

- [x] 22. Frontend project setup
  - Initialize React project with Vite and TypeScript
  - Set up React Router for navigation
  - Configure Tailwind CSS and Headless UI
  - Set up React Query for API state management
  - Set up React Hook Form with Zod validation
  - Create basic project structure (components, pages, hooks, services)
  - _Requirements: 17.1, 17.2_

- [x] 23. Frontend - Authentication UI
  - Create registration form with all required company fields
  - Create login form
  - Create email verification page
  - Implement authentication context and protected routes
  - Implement token storage and refresh logic
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 24. Frontend - Navigation and layout
  - Create responsive navigation bar with logo (rectangular version)
  - Configure favicon (square logo)
  - Create user menu with profile, settings, logout
  - Create notification indicator
  - Implement responsive hamburger menu for mobile
  - Create main layout wrapper
  - _Requirements: 17.5, 17.6_

- [x] 25. Frontend - Company profile management
  - Create company profile view page
  - Create company profile edit form
  - Display verification badge when applicable
  - Display aggregated rating
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 26. Frontend - Vehicle listing management
  - Create vehicle listing creation form with all fields
  - Implement photo upload with preview
  - Create service offering selection (with-driver, without-driver, both)
  - Create vehicle listing edit form
  - Create vehicle listing list view for company
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 27. Frontend - Driver listing management
  - Create driver listing creation form with all fields
  - Implement license document upload
  - Display driver verification badge when applicable
  - Create driver listing edit form
  - Create driver listing list view for company
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 28. Frontend - Search and filtering
  - Create search page with filter panel
  - Implement all filter controls (listing type, location, vehicle type, fuel type, capacity, price range, date range, with/without driver, tags)
  - Implement location filters (Fylke, Kommune, radius)
  - Create search results grid/list view
  - Implement sorting controls
  - Implement pagination
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 29. Frontend - Listing detail and booking
  - Create listing detail page with photo gallery
  - Display all listing information
  - Display provider company info and rating
  - Display reviews section
  - Create availability calendar
  - Create booking request form with date/time selection
  - Display cost breakdown before submission
  - _Requirements: 7.1, 7.2_

- [x] 30. Frontend - Booking management
  - Create bookings dashboard (separate renter and provider views)
  - Display booking list with status indicators
  - Create booking detail view
  - Implement provider response actions (accept, decline, propose new terms)
  - Display booking contract PDF download
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 31. Frontend - Invoicing and billing
  - Create billing page displaying all invoices and receipts
  - Implement invoice/receipt PDF download
  - Display transaction history
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 32. Frontend - Rating and review
  - Create rating submission form (company and driver ratings)
  - Display rating prompt when booking is completed
  - Display reviews on company and driver profiles
  - Implement provider response to review
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 33. Frontend - Messaging
  - Create messaging page with thread list
  - Create message view with booking context
  - Implement send message functionality
  - Display unread indicators
  - Implement message polling or real-time updates
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

- [x] 34. Frontend - Notification preferences
  - Create notification settings page
  - Implement preference controls (email, in-app, frequency)
  - Display in-app notifications
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

- [x] 35. Frontend - Admin panel
  - Create admin panel layout with sidebar navigation
  - Create entity management tables (Users, Companies, Listings, Bookings, Disputes, Transactions)
  - Implement search and filtering for each entity type
  - Create company verification interface
  - Create driver verification interface
  - Create listing suspension/removal interface
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 36. Frontend - Admin analytics and disputes
  - Create analytics dashboard with charts (revenue, active listings, bookings, top-rated providers)
  - Implement report filtering controls
  - Create dispute resolution interface
  - Display audit log
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 20.4_

- [x] 37. Frontend - GDPR features
  - Create data export request page
  - Create account deletion request page with confirmation
  - Display audit log for user's data
  - _Requirements: 20.1, 20.2, 20.4_

- [x] 38. Frontend - Landing page
  - Create hero section with value proposition
  - Create search bar for quick listing discovery
  - Display featured listings
  - Display trust indicators (verified companies, ratings)
  - Create call-to-action for registration
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [x] 39. Accessibility and responsive design
  - Implement WCAG 2.1 AA compliance across all pages
  - Test and fix keyboard navigation
  - Add ARIA labels where needed
  - Verify color contrast ratios
  - Test responsive design on mobile, tablet, and desktop
  - _Requirements: 17.1, 17.2, 17.3_

- [x] 40. CI/CD pipeline setup
  - Create GitHub Actions workflow for linting
  - Create GitHub Actions workflow for running tests
  - Create GitHub Actions workflow for building and deploying
  - Configure branch protection rules
  - _Requirements: 23.1, 23.2, 23.3, 23.4_

- [ ] 41. Final checkpoint - Full system integration
  - Ensure all tests pass, ask the user if questions arise
