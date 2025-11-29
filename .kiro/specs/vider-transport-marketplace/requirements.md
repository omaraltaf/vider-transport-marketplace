# Requirements Document

## Introduction

Vider (meaning "Further" / "Onward") is a production-ready, peer-to-peer marketplace platform designed for the Norwegian B2B transport and logistics market. The platform enables transport companies to rent vehicles and drivers to one another, manage contracts, facilitate transparent invoicing, and build trust through a comprehensive ratings system. The platform operates on a commission-based business model, charging a configurable percentage on completed rentals.

## Glossary

- **Vider Platform**: The complete peer-to-peer marketplace system for vehicle and driver rentals
- **Platform Admin**: A user with global administrative privileges across the entire Vider Platform
- **Company Admin**: A user with administrative privileges limited to their specific company's profile and listings
- **Company User**: A user with operational privileges focused on booking activities within their company
- **Provider**: A company that lists vehicles and/or drivers for rent on the Vider Platform
- **Renter**: A company that requests to rent vehicles and/or drivers from a Provider
- **Listing**: A published offering of a vehicle, driver, or vehicle+driver combination available for rent
- **Booking**: A rental transaction between a Renter and Provider for a specific Listing
- **Commission**: The platform fee calculated as a percentage of the Provider's base price before taxes
- **Verification Badge**: A visual indicator that a company or driver has been manually verified by a Platform Admin
- **Org. nr.**: Norwegian organization number (Organisasjonsnummer) - a unique identifier for registered businesses
- **Fylke**: Norwegian county-level administrative division
- **Kommune**: Norwegian municipality-level administrative division
- **ADR**: European Agreement concerning the International Carriage of Dangerous Goods by Road
- **RBAC**: Role-Based Access Control - a security model that restricts system access based on user roles

## Requirements

### Requirement 1

**User Story:** As a transport company representative, I want to create a company account on the Vider Platform, so that I can access marketplace features for renting or providing vehicles and drivers.

#### Acceptance Criteria

1. WHEN a user initiates company sign-up, THE Vider Platform SHALL capture Company Name, Organization Number, Business Address, Contact Person Name, Phone Number, Email Address, Password, Password Confirmation, and VAT Registration Status
2. WHEN a user submits the sign-up form with valid data, THE Vider Platform SHALL create a company account and send a verification email to the provided email address
3. WHEN a user clicks the verification link in the email, THE Vider Platform SHALL activate the company account and grant access to the platform
4. WHEN a user attempts to sign up with an email address that already exists, THE Vider Platform SHALL reject the registration and display an error message
5. WHEN a user submits the sign-up form with invalid Organization Number format, THE Vider Platform SHALL reject the registration and display a validation error

### Requirement 2

**User Story:** As a Company Admin, I want to manage my company's public profile, so that potential renters can learn about my business and build trust.

#### Acceptance Criteria

1. WHEN a Company Admin updates the company profile, THE Vider Platform SHALL save and display the Company Description, Location, Fleet Summary, and Aggregated Rating
2. WHEN a Platform Admin manually verifies a company, THE Vider Platform SHALL display a Verification Badge on the company's public profile
3. WHEN a user views a company profile, THE Vider Platform SHALL display all public information including description, location, fleet summary, aggregated rating, and verification status
4. WHEN a Company Admin uploads company profile information, THE Vider Platform SHALL validate all required fields before saving

### Requirement 3

**User Story:** As a Platform Admin, I want to control access levels for different user types, so that security and operational boundaries are maintained across the platform.

#### Acceptance Criteria

1. WHEN a Platform Admin performs any administrative action, THE Vider Platform SHALL verify the user has Platform Admin role before executing the action
2. WHEN a Company Admin attempts to modify company data, THE Vider Platform SHALL verify the user has Company Admin role for that specific company before allowing modifications
3. WHEN a Company User attempts to create a booking, THE Vider Platform SHALL verify the user has at least Company User role before allowing the booking creation
4. WHEN any user attempts to access a protected resource, THE Vider Platform SHALL enforce role-based authorization checks on the server side
5. WHEN a user without sufficient privileges attempts a restricted action, THE Vider Platform SHALL deny access and return an authorization error

### Requirement 4

**User Story:** As a Provider Company Admin, I want to create vehicle listings with comprehensive details, so that potential renters can evaluate if my vehicles meet their needs.

#### Acceptance Criteria

1. WHEN a Company Admin creates a vehicle listing, THE Vider Platform SHALL capture Title, Description, Photos, Location, Vehicle Type, Capacity, Fuel Type, Price Per Hour, Price Per Day, Optional Deposit, Service Offerings, and Tags
2. WHEN a Company Admin specifies service offerings, THE Vider Platform SHALL allow selection of offers-with-driver, offers-without-driver, or both, with associated pricing
3. WHEN a Company Admin uploads vehicle photos, THE Vider Platform SHALL accept multiple high-quality images and associate them with the listing
4. WHEN a Company Admin saves a vehicle listing, THE Vider Platform SHALL validate all required fields and store the listing in available status
5. WHEN a Company Admin adds tags to a vehicle listing, THE Vider Platform SHALL accept tags such as tail-lift, refrigerated, and ADR-certified

### Requirement 5

**User Story:** As a Provider Company Admin, I want to create driver listings with verification, so that renters can trust the qualifications of drivers they hire.

#### Acceptance Criteria

1. WHEN a Company Admin creates a driver listing, THE Vider Platform SHALL capture Driver Name, License Class, Languages Spoken, Background Summary, Hourly Rate, and Daily Rate
2. WHEN a Company Admin uploads driver license documentation, THE Vider Platform SHALL store the document for Platform Admin verification
3. WHEN a Platform Admin verifies a driver's credentials, THE Vider Platform SHALL display a Driver Verification Badge on the driver's listing
4. WHEN a driver listing is created without license upload, THE Vider Platform SHALL prevent the listing from being published until verification documents are provided
5. WHEN a user views a driver listing, THE Vider Platform SHALL display the driver's aggregated rating from previous bookings

### Requirement 6

**User Story:** As a Renter, I want to search and filter available listings, so that I can quickly find vehicles and drivers that match my specific transportation needs.

#### Acceptance Criteria

1. WHEN a Renter performs a search, THE Vider Platform SHALL allow filtering by vehicle-only, driver-only, or vehicle-plus-driver combinations
2. WHEN a Renter applies location filters, THE Vider Platform SHALL support filtering by Fylke, Kommune, and radius distance from a specified location
3. WHEN a Renter applies attribute filters, THE Vider Platform SHALL filter results by Vehicle Type, Fuel Type, Capacity, Availability Date Range, Price Range, and With-Without Driver flag
4. WHEN a Renter submits search criteria, THE Vider Platform SHALL return only listings that match all applied filters
5. WHEN a Renter views search results, THE Vider Platform SHALL display key listing information including title, location, price, rating, and availability status

### Requirement 7

**User Story:** As a Renter, I want to submit a booking request with transparent pricing, so that I understand all costs before committing to a rental.

#### Acceptance Criteria

1. WHEN a Renter selects a listing and specifies rental duration, THE Vider Platform SHALL calculate and display Provider Rate, Platform Commission, Taxes, and Final Total
2. WHEN a Renter submits a booking request, THE Vider Platform SHALL create a booking record with Pending status and notify the Provider via in-app notification and email
3. WHEN a Renter attempts to book their own company's listing, THE Vider Platform SHALL reject the booking request and display an error message
4. WHEN a Renter books a vehicle-plus-driver combination, THE Vider Platform SHALL ensure both the vehicle and driver are from the same Provider company
5. WHEN a Renter submits a booking request, THE Vider Platform SHALL block the requested time slots on the listing's availability calendar

### Requirement 8

**User Story:** As a Provider, I want to review and respond to booking requests, so that I can accept suitable rentals and manage my fleet availability.

#### Acceptance Criteria

1. WHEN a Provider receives a booking request, THE Vider Platform SHALL display the request details and provide options to Accept, Decline, or Propose New Terms
2. WHEN a Provider accepts a booking request, THE Vider Platform SHALL change the booking status to Accepted and generate a PDF contract summary
3. WHEN a Provider declines a booking request, THE Vider Platform SHALL change the booking status to Cancelled and notify the Renter
4. WHEN a Provider proposes new terms, THE Vider Platform SHALL send the modified proposal to the Renter for review
5. WHEN a Provider does not respond within the configured timeout period, THE Vider Platform SHALL automatically expire the booking request and notify the Renter

### Requirement 9

**User Story:** As a Platform Admin, I want to configure global booking rules, so that the platform operates according to business policies.

#### Acceptance Criteria

1. WHEN a Platform Admin updates the commission rate, THE Vider Platform SHALL apply the new rate to all subsequent booking calculations
2. WHEN a Platform Admin updates the tax rate, THE Vider Platform SHALL apply the new rate to all subsequent booking calculations
3. WHEN a Platform Admin updates the booking request timeout period, THE Vider Platform SHALL apply the new timeout to all new booking requests
4. WHEN a Platform Admin saves configuration changes, THE Vider Platform SHALL validate the values and persist them to the system configuration
5. WHEN the Vider Platform calculates commission, THE Vider Platform SHALL apply the commission percentage to the Provider's base price before taxes

### Requirement 10

**User Story:** As a user involved in a booking, I want the system to track booking lifecycle states, so that I can understand the current status of my rentals.

#### Acceptance Criteria

1. WHEN a booking is created, THE Vider Platform SHALL set the initial status to Pending
2. WHEN a Provider accepts a booking, THE Vider Platform SHALL transition the status from Pending to Accepted
3. WHEN a rental period begins, THE Vider Platform SHALL transition the status from Accepted to Active
4. WHEN a rental period ends, THE Vider Platform SHALL transition the status from Active to Completed
5. WHEN a booking is cancelled by either party, THE Vider Platform SHALL transition the status to Cancelled
6. WHEN a dispute is raised, THE Vider Platform SHALL transition the status to Disputed
7. WHEN all payments are cleared and the booking is finalized, THE Vider Platform SHALL transition the status to Closed

### Requirement 11

**User Story:** As a user involved in a completed booking, I want to access invoices and receipts, so that I can maintain financial records for my business.

#### Acceptance Criteria

1. WHEN a booking is confirmed, THE Vider Platform SHALL generate a professional PDF invoice containing all transaction details
2. WHEN a booking is completed, THE Vider Platform SHALL generate a PDF receipt accessible from the user dashboard
3. WHEN a user views their billing page, THE Vider Platform SHALL display all invoices and receipts associated with their company's bookings
4. WHEN an invoice is generated, THE Vider Platform SHALL include Provider Rate, Platform Commission, Taxes, Final Total, and payment terms
5. WHEN a user downloads an invoice or receipt, THE Vider Platform SHALL provide the document in PDF format

### Requirement 12

**User Story:** As a Renter, I want to rate and review providers and drivers after a completed booking, so that I can share my experience and help other users make informed decisions.

#### Acceptance Criteria

1. WHEN a booking status changes to Completed, THE Vider Platform SHALL prompt the Renter to submit a rating and review
2. WHEN a Renter submits a rating, THE Vider Platform SHALL accept a star rating from 1 to 5 for both the Provider company and the individual driver
3. WHEN a Renter submits a review, THE Vider Platform SHALL accept text feedback for both the Provider company and the individual driver
4. WHEN a rating is submitted, THE Vider Platform SHALL update the aggregated rating on both the company profile and the driver profile
5. WHEN a Provider views a review, THE Vider Platform SHALL allow the Provider to submit a public response to the review

### Requirement 13

**User Story:** As a Platform Admin, I want comprehensive management tools, so that I can oversee all platform operations and resolve issues.

#### Acceptance Criteria

1. WHEN a Platform Admin accesses the admin panel, THE Vider Platform SHALL display searchable lists of all Users, Companies, Listings, Bookings, Disputes, and Transactions
2. WHEN a Platform Admin manually verifies a company, THE Vider Platform SHALL update the company's verification status and display the Verification Badge
3. WHEN a Platform Admin suspends a listing, THE Vider Platform SHALL remove the listing from search results and prevent new bookings
4. WHEN a Platform Admin removes a listing, THE Vider Platform SHALL permanently delete the listing and notify the Provider company
5. WHEN a Platform Admin processes a payment override, THE Vider Platform SHALL update the transaction record and generate appropriate documentation

### Requirement 14

**User Story:** As a Platform Admin, I want access to reporting and analytics, so that I can monitor platform performance and make data-driven business decisions.

#### Acceptance Criteria

1. WHEN a Platform Admin views the reporting dashboard, THE Vider Platform SHALL display total monthly revenue from commissions
2. WHEN a Platform Admin views the reporting dashboard, THE Vider Platform SHALL display the count of active listings by category
3. WHEN a Platform Admin views the reporting dashboard, THE Vider Platform SHALL display the number of bookings per configurable time period
4. WHEN a Platform Admin views the reporting dashboard, THE Vider Platform SHALL display lists of top-rated providers and most active providers
5. WHEN a Platform Admin generates a report, THE Vider Platform SHALL allow filtering by date range, company, and transaction type

### Requirement 15

**User Story:** As a Platform Admin, I want a dispute resolution workflow, so that I can mediate conflicts between renters and providers.

#### Acceptance Criteria

1. WHEN a user raises a dispute on a booking, THE Vider Platform SHALL change the booking status to Disputed and notify the Platform Admin
2. WHEN a Platform Admin views a disputed booking, THE Vider Platform SHALL display all booking details, communications, and dispute reasons
3. WHEN a Platform Admin resolves a dispute, THE Vider Platform SHALL allow updating the booking status and recording the resolution outcome
4. WHEN a dispute is resolved, THE Vider Platform SHALL notify both the Renter and Provider of the resolution
5. WHEN a Platform Admin processes a refund as part of dispute resolution, THE Vider Platform SHALL update the transaction records accordingly

### Requirement 16

**User Story:** As a developer, I want a complete API specification, so that I can build integrations and understand all available endpoints.

#### Acceptance Criteria

1. WHEN the system is deployed, THE Vider Platform SHALL provide a complete OpenAPI specification document
2. WHEN a developer accesses the API specification, THE Vider Platform SHALL document all endpoints with request parameters, response schemas, and authentication requirements
3. WHEN a developer accesses the API specification, THE Vider Platform SHALL document all data models with field types, constraints, and relationships
4. WHEN the API is updated, THE Vider Platform SHALL maintain the OpenAPI specification in sync with implementation

### Requirement 17

**User Story:** As a user, I want to access the platform through a responsive web interface, so that I can manage my rentals from any device.

#### Acceptance Criteria

1. WHEN a user accesses the Vider Platform from a desktop browser, THE Vider Platform SHALL display a fully functional interface optimized for large screens
2. WHEN a user accesses the Vider Platform from a mobile browser, THE Vider Platform SHALL display a fully functional interface optimized for small screens
3. WHEN a user navigates the interface, THE Vider Platform SHALL provide accessible components that meet WCAG standards
4. WHEN a user interacts with the interface, THE Vider Platform SHALL provide clear visual feedback and intuitive navigation
5. WHEN a user views any page, THE Vider Platform SHALL display a navigation bar containing the rectangular logo from the public folder
6. WHEN a browser displays the Vider Platform, THE Vider Platform SHALL use the square logo from the public folder as the favicon

### Requirement 18

**User Story:** As a system administrator, I want secure authentication and authorization, so that user accounts and company data are protected.

#### Acceptance Criteria

1. WHEN a user creates a password, THE Vider Platform SHALL hash and salt the password before storing it in the database
2. WHEN a user logs in, THE Vider Platform SHALL issue a secure session token or JWT with appropriate expiration
3. WHEN a user's session expires, THE Vider Platform SHALL require re-authentication before allowing further actions
4. WHEN the Vider Platform issues a JWT, THE Vider Platform SHALL include refresh token functionality for seamless session renewal
5. WHEN the Vider Platform receives an API request, THE Vider Platform SHALL validate the authentication token before processing the request

### Requirement 19

**User Story:** As a system administrator, I want rate limiting on critical endpoints, so that the platform is protected from abuse and denial-of-service attacks.

#### Acceptance Criteria

1. WHEN the Vider Platform receives requests to authentication endpoints, THE Vider Platform SHALL limit requests to a maximum of 5 attempts per IP address per 15-minute window
2. WHEN the Vider Platform receives requests to booking creation endpoints, THE Vider Platform SHALL limit requests to a maximum of 20 requests per user per hour
3. WHEN the Vider Platform receives requests to search endpoints, THE Vider Platform SHALL limit requests to a maximum of 100 requests per IP address per minute
4. WHEN a rate limit is exceeded, THE Vider Platform SHALL return an HTTP 429 status code with retry-after information
5. WHEN rate limiting is triggered, THE Vider Platform SHALL log the event for security monitoring

### Requirement 20

**User Story:** As a data protection officer, I want GDPR-compliant data management features, so that the platform meets European privacy regulations.

#### Acceptance Criteria

1. WHEN a user requests their personal data, THE Vider Platform SHALL provide an endpoint to export all user data in machine-readable format
2. WHEN a user requests account deletion, THE Vider Platform SHALL provide an endpoint to permanently delete all personal data
3. WHEN a Platform Admin performs any administrative action, THE Vider Platform SHALL record the action in an audit log with timestamp, admin identifier, and action details
4. WHEN a user views the audit log, THE Vider Platform SHALL display all administrative actions affecting their company or data
5. WHEN personal data is deleted, THE Vider Platform SHALL anonymize or remove the data from all systems while preserving necessary transaction records

### Requirement 21

**User Story:** As a developer, I want proper database management tools, so that I can maintain schema consistency and seed test data.

#### Acceptance Criteria

1. WHEN a developer initializes the database, THE Vider Platform SHALL provide migration scripts to create all required tables and relationships
2. WHEN a developer updates the schema, THE Vider Platform SHALL provide migration scripts to modify the database structure without data loss
3. WHEN a developer needs test data, THE Vider Platform SHALL provide seed scripts to populate the database with sample companies, listings, and bookings
4. WHEN migrations are executed, THE Vider Platform SHALL track which migrations have been applied to prevent duplicate execution
5. WHEN a migration fails, THE Vider Platform SHALL rollback changes and report the error

### Requirement 22

**User Story:** As a developer, I want secure configuration management, so that sensitive credentials are never exposed in source code.

#### Acceptance Criteria

1. WHEN the application starts, THE Vider Platform SHALL load all configuration values from environment variables
2. WHEN a developer sets up the project, THE Vider Platform SHALL provide a .env.example file documenting all required environment variables
3. WHEN the application accesses secrets, THE Vider Platform SHALL retrieve them from environment variables rather than hardcoded values
4. WHEN configuration is missing, THE Vider Platform SHALL fail to start and display clear error messages indicating which variables are required

### Requirement 23

**User Story:** As a developer, I want code quality tools and CI pipeline, so that code standards are maintained and bugs are caught early.

#### Acceptance Criteria

1. WHEN a developer commits code, THE Vider Platform SHALL run linting checks to enforce code style standards
2. WHEN a developer pushes code to the repository, THE Vider Platform SHALL trigger a CI pipeline that runs all automated tests
3. WHEN the CI pipeline executes, THE Vider Platform SHALL report test results and code quality metrics
4. WHEN tests fail in the CI pipeline, THE Vider Platform SHALL prevent merging the code until issues are resolved

### Requirement 24

**User Story:** As a system operator, I want comprehensive logging and monitoring, so that I can diagnose issues and ensure system health.

#### Acceptance Criteria

1. WHEN an error occurs in the application, THE Vider Platform SHALL log the error with timestamp, stack trace, and context information
2. WHEN a critical operation is performed, THE Vider Platform SHALL log the operation with relevant details for audit purposes
3. WHEN a monitoring system queries the health endpoint, THE Vider Platform SHALL return the current status of all critical dependencies
4. WHEN the health check fails, THE Vider Platform SHALL return an HTTP 503 status code with details about failing components
5. WHEN logs are written, THE Vider Platform SHALL use structured logging format for easy parsing and analysis

### Requirement 25

**User Story:** As a user, I want to communicate with other parties about bookings, so that I can coordinate rental details and resolve questions.

#### Acceptance Criteria

1. WHEN a booking is created, THE Vider Platform SHALL create a dedicated message thread between the Renter and Provider
2. WHEN a user sends a message in a booking thread, THE Vider Platform SHALL deliver the message to all participants and send email notifications
3. WHEN a user views a booking, THE Vider Platform SHALL display the complete message history for that booking
4. WHEN a user receives a new message, THE Vider Platform SHALL display an unread indicator in the user interface
5. WHEN a user accesses the messaging system, THE Vider Platform SHALL display all message threads associated with their company's bookings

### Requirement 26

**User Story:** As a user, I want to manage my notification preferences, so that I receive important updates through my preferred channels.

#### Acceptance Criteria

1. WHEN a user accesses notification settings, THE Vider Platform SHALL display options for email notifications, in-app notifications, and notification frequency
2. WHEN a user updates notification preferences, THE Vider Platform SHALL save the preferences and apply them to future notifications
3. WHEN a critical event occurs, THE Vider Platform SHALL send notifications regardless of user preferences for essential alerts
4. WHEN a user disables email notifications, THE Vider Platform SHALL continue to show in-app notifications for all events
5. WHEN a notification is sent, THE Vider Platform SHALL respect the user's channel preferences and frequency settings
