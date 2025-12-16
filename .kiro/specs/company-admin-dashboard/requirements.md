# Requirements Document

## Introduction

The Company Admin Dashboard serves as the central command center for company administrators managing their transport marketplace operations. This enhancement transforms the basic dashboard into a comprehensive, data-driven interface that provides real-time insights, actionable notifications, and streamlined access to critical business functions. The dashboard must serve dual roles—supporting companies acting as both Providers (offering vehicles/drivers) and Renters (booking transport resources)—while maintaining clarity and usability.

## Glossary

- **Company Admin**: A user with administrative privileges for a company account, responsible for managing listings, bookings, and company profile
- **Provider**: A company that offers vehicles or drivers for rent through the marketplace
- **Renter**: A company that books vehicles or drivers from other providers
- **KPI (Key Performance Indicator)**: A measurable value that demonstrates how effectively the company is achieving key business objectives
- **Booking Status**: The current state of a booking (Pending, Accepted, Active, Completed, Cancelled, Disputed)
- **Fleet Utilization**: The percentage of available listings currently in active use or booked for upcoming periods
- **Verification Badge**: An indicator showing that a company or driver has been verified by platform administrators
- **Dashboard**: The main landing page for authenticated company admin users
- **Listing**: A vehicle or driver offering available for booking on the marketplace
- **System**: The Vider Transport Marketplace platform

## Requirements

### Requirement 1

**User Story:** As a company admin, I want to see key performance indicators at a glance, so that I can quickly assess my company's marketplace performance without navigating through multiple pages.

#### Acceptance Criteria

1. WHEN a company admin views the dashboard THEN the System SHALL display total revenue from accepted and completed bookings for the last 30 days
2. WHEN a company admin views the dashboard THEN the System SHALL calculate and display fleet utilization as a percentage of listings currently in active or upcoming booked status
3. WHEN a company admin views the dashboard THEN the System SHALL display the aggregated company rating prominently
4. WHEN a company admin views the dashboard THEN the System SHALL display total rental spend for the last 30 days
5. WHEN a company admin views the dashboard THEN the System SHALL display the count of bookings with pending status
6. WHEN a company admin views the dashboard THEN the System SHALL display the count of bookings with accepted status that have not yet transitioned to active

### Requirement 2

**User Story:** As a company admin, I want to see actionable items that require my immediate attention, so that I can prioritize critical tasks and respond to time-sensitive requests.

#### Acceptance Criteria

1. WHEN new booking requests are received THEN the System SHALL display a clear list or badge indicating pending booking requests requiring provider response
2. WHEN pending booking requests approach the configured timeout period THEN the System SHALL display a warning for expiring requests
3. WHEN unread messages exist across booking threads THEN the System SHALL display the count of unread messages
4. WHEN bookings transition to completed status THEN the System SHALL display prompts to rate and review providers and drivers
5. WHEN the dashboard loads THEN the System SHALL display the company verification badge status
6. WHEN the dashboard loads THEN the System SHALL indicate whether all driver listings have been verified

### Requirement 3

**User Story:** As a company admin, I want to access operational and booking management functions from the dashboard, so that I can efficiently manage my listings and bookings without excessive navigation.

#### Acceptance Criteria

1. WHEN a company admin views the dashboard THEN the System SHALL display the count of available listings
2. WHEN a company admin views the dashboard THEN the System SHALL display the count of suspended listings
3. WHEN a company admin views the dashboard THEN the System SHALL provide a link to create new vehicle or driver listings
4. WHEN a company admin views the dashboard THEN the System SHALL display the 5 most recent bookings with booking ID, company name, listing title, and current status
5. WHEN a company admin views the booking history snapshot THEN the System SHALL allow sorting by relevant criteria
6. WHEN a company admin views the dashboard THEN the System SHALL provide a link to view all invoices and receipts
7. WHEN a company admin views the dashboard THEN the System SHALL provide a link to download the most recent PDF invoice

### Requirement 4

**User Story:** As a company admin, I want to access profile management and settings from the dashboard, so that I can maintain my company information and preferences efficiently.

#### Acceptance Criteria

1. WHEN a company admin views the dashboard THEN the System SHALL display the completeness status of required company profile fields
2. WHEN a company admin views the dashboard THEN the System SHALL provide access to user management functions including password changes
3. WHEN a company admin views the dashboard THEN the System SHALL provide a link to manage notification preferences

### Requirement 5

**User Story:** As a company admin, I want the dashboard to load quickly and display data accurately, so that I can make informed decisions based on current information.

#### Acceptance Criteria

1. WHEN a company admin navigates to the dashboard THEN the System SHALL load all KPI data within 2 seconds under normal network conditions
2. WHEN dashboard data is being fetched THEN the System SHALL display loading indicators for each section
3. WHEN data fetching fails THEN the System SHALL display appropriate error messages without breaking the entire dashboard
4. WHEN the dashboard loads THEN the System SHALL fetch data from the most recent database state

### Requirement 6

**User Story:** As a company admin, I want the dashboard to be responsive and accessible, so that I can manage my business from any device and ensure all users can access the interface.

#### Acceptance Criteria

1. WHEN a company admin views the dashboard on mobile devices THEN the System SHALL display all sections in a readable, vertically-stacked layout
2. WHEN a company admin views the dashboard on tablet devices THEN the System SHALL optimize the layout for medium-sized screens
3. WHEN a company admin views the dashboard on desktop devices THEN the System SHALL utilize a multi-column grid layout
4. WHEN a company admin navigates the dashboard using keyboard THEN the System SHALL support full keyboard navigation
5. WHEN a company admin uses screen readers THEN the System SHALL provide appropriate ARIA labels and semantic HTML structure

### Requirement 7

**User Story:** As a company admin, I want visual clarity and intuitive organization on the dashboard, so that I can quickly find information and take action without confusion.

#### Acceptance Criteria

1. WHEN a company admin views the dashboard THEN the System SHALL organize content into clearly labeled sections with visual hierarchy
2. WHEN a company admin views KPI metrics THEN the System SHALL use consistent formatting for numerical data
3. WHEN a company admin views actionable items THEN the System SHALL use visual indicators such as badges or icons to draw attention
4. WHEN a company admin views the dashboard THEN the System SHALL use the established design system components for consistency
5. WHEN a company admin views status information THEN the System SHALL use color coding that maintains sufficient contrast for accessibility
