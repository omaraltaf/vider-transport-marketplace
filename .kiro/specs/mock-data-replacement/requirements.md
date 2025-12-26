# Requirements Document

## Introduction

The Vider Transport Marketplace platform currently uses mock data in several components and services for development purposes. This feature will systematically replace all mock data with real database-driven data to ensure the platform displays accurate, live information in production.

## Glossary

- **Mock Data**: Hardcoded sample data used for development and testing purposes
- **Real Data**: Live data retrieved from the database that reflects actual platform usage
- **Platform Admin**: Administrative interface for managing platform operations
- **API Endpoint**: Backend service endpoint that provides data to frontend components
- **Database Query**: SQL operation to retrieve data from the PostgreSQL database
- **Fallback Data**: Default data shown when API calls fail or return empty results

## Requirements

### Requirement 1

**User Story:** As any user (platform administrator, company admin, or regular user), I want all dashboard components to display real data from the database, so that I can make informed decisions based on actual platform metrics.

#### Acceptance Criteria

1. WHEN any user views dashboard components THEN the system SHALL display actual data from the database relevant to their role and permissions
2. WHEN revenue data is unavailable THEN the system SHALL display an appropriate error message instead of mock data
3. WHEN financial metrics are calculated THEN the system SHALL use real booking and transaction data from the database
4. WHEN commission rates are displayed THEN the system SHALL retrieve current rates from the platform configuration table
5. WHEN growth percentages are shown THEN the system SHALL calculate them from historical data in the database

### Requirement 2

**User Story:** As a company admin or platform administrator, I want dispute and refund management to show real cases, so that I can effectively manage actual customer issues.

#### Acceptance Criteria

1. WHEN viewing the dispute management panel THEN the system SHALL display actual disputes from the database filtered by user permissions
2. WHEN processing refunds THEN the system SHALL show real refund requests and their current status
3. WHEN dispute statistics are calculated THEN the system SHALL use actual dispute resolution data
4. WHEN refund analytics are displayed THEN the system SHALL aggregate real refund transaction data
5. WHEN dispute timelines are shown THEN the system SHALL retrieve actual timeline events from the database

### Requirement 3

**User Story:** As a company admin or platform administrator, I want content moderation to display real flagged content, so that I can review and moderate actual platform content within my scope of authority.

#### Acceptance Criteria

1. WHEN viewing the content review queue THEN the system SHALL display actual flagged content from the database filtered by user permissions
2. WHEN content moderation statistics are shown THEN the system SHALL calculate them from real moderation data
3. WHEN reviewing flagged content THEN the system SHALL show actual evidence and metadata from the database
4. WHEN content actions are taken THEN the system SHALL update the database with real moderation decisions
5. WHEN moderation history is displayed THEN the system SHALL retrieve actual historical moderation actions

### Requirement 4

**User Story:** As a company admin or platform administrator, I want user and company management to show real entities, so that I can manage actual platform participants within my authority.

#### Acceptance Criteria

1. WHEN viewing user lists THEN the system SHALL display actual users from the database filtered by user permissions
2. WHEN company statistics are shown THEN the system SHALL calculate them from real company data
3. WHEN user activity is displayed THEN the system SHALL retrieve actual user interaction data
4. WHEN company verification status is shown THEN the system SHALL reflect actual verification states from the database
5. WHEN user growth metrics are calculated THEN the system SHALL use real user registration and activity data

### Requirement 5

**User Story:** As any user with access to analytics, I want analytics and reporting to use real data, so that insights and reports reflect actual platform performance relevant to my role.

#### Acceptance Criteria

1. WHEN analytics charts are displayed THEN the system SHALL use actual booking and transaction data filtered by user permissions
2. WHEN performance metrics are calculated THEN the system SHALL aggregate real platform usage data
3. WHEN trend analysis is shown THEN the system SHALL use historical data from the database
4. WHEN reports are generated THEN the system SHALL compile actual data rather than sample data
5. WHEN forecasting is performed THEN the system SHALL base predictions on real historical patterns

### Requirement 6

**User Story:** As a user with configuration access, I want configuration management to persist real settings, so that platform configurations are maintained across sessions.

#### Acceptance Criteria

1. WHEN platform configurations are displayed THEN the system SHALL retrieve actual settings from the database
2. WHEN configuration changes are made THEN the system SHALL persist them to the database immediately
3. WHEN configuration history is shown THEN the system SHALL display actual change records
4. WHEN default values are needed THEN the system SHALL use database-stored defaults rather than hardcoded values
5. WHEN configuration validation occurs THEN the system SHALL check against actual database constraints

### Requirement 7

**User Story:** As a developer, I want clear error handling when real data is unavailable, so that the system gracefully handles database connectivity issues.

#### Acceptance Criteria

1. WHEN database queries fail THEN the system SHALL display appropriate error messages to users
2. WHEN API endpoints return errors THEN the system SHALL show specific error information rather than falling back to mock data
3. WHEN network connectivity is lost THEN the system SHALL indicate the connection status to users
4. WHEN data is loading THEN the system SHALL show loading indicators instead of displaying stale mock data
5. WHEN empty result sets are returned THEN the system SHALL display "no data available" messages rather than sample data

### Requirement 8

**User Story:** As a user with financial access, I want commission rate management to use real rate configurations, so that actual commission calculations are accurate.

#### Acceptance Criteria

1. WHEN commission rates are displayed THEN the system SHALL retrieve actual rates from the database
2. WHEN commission calculations are performed THEN the system SHALL use real rate configurations
3. WHEN rate changes are made THEN the system SHALL update the database immediately
4. WHEN rate history is shown THEN the system SHALL display actual historical rate changes
5. WHEN rate analytics are calculated THEN the system SHALL use real commission transaction data

### Requirement 9

**User Story:** As a company admin, I want my company dashboard to show real company-specific data, so that I can manage my company's operations effectively.

#### Acceptance Criteria

1. WHEN viewing company dashboard THEN the system SHALL display actual company metrics from the database
2. WHEN company booking statistics are shown THEN the system SHALL use real booking data for that company
3. WHEN company revenue is displayed THEN the system SHALL calculate it from actual transactions
4. WHEN driver performance metrics are shown THEN the system SHALL use real driver activity data
5. WHEN vehicle utilization is displayed THEN the system SHALL calculate it from actual booking and availability data

### Requirement 10

**User Story:** As a regular user, I want my profile and booking history to show real data, so that I can track my actual platform usage.

#### Acceptance Criteria

1. WHEN viewing booking history THEN the system SHALL display actual bookings from the database
2. WHEN user statistics are shown THEN the system SHALL calculate them from real user activity data
3. WHEN payment history is displayed THEN the system SHALL show actual transaction records
4. WHEN user preferences are shown THEN the system SHALL retrieve actual saved preferences from the database
5. WHEN notification history is displayed THEN the system SHALL show actual notifications sent to the user

### Requirement 11

**User Story:** As a driver, I want my driver dashboard to show real performance data, so that I can track my actual earnings and performance.

#### Acceptance Criteria

1. WHEN viewing driver earnings THEN the system SHALL display actual payment data from the database
2. WHEN driver ratings are shown THEN the system SHALL use real rating data from completed bookings
3. WHEN availability statistics are displayed THEN the system SHALL calculate them from actual availability records
4. WHEN trip history is shown THEN the system SHALL display actual completed trips from the database
5. WHEN performance metrics are calculated THEN the system SHALL use real driver activity and feedback data

### Requirement 12

**User Story:** As any user, I want booking management to display real booking data, so that I can see actual booking status and details.

#### Acceptance Criteria

1. WHEN viewing booking lists THEN the system SHALL display actual bookings from the database
2. WHEN booking details are shown THEN the system SHALL retrieve real booking information including status, dates, and participants
3. WHEN booking statistics are calculated THEN the system SHALL use actual booking transaction data
4. WHEN booking search is performed THEN the system SHALL search through real booking records
5. WHEN booking notifications are displayed THEN the system SHALL show actual notification history from the database

### Requirement 13

**User Story:** As a company admin or vehicle owner, I want vehicle listing management to show real listing data, so that I can manage my actual vehicle inventory.

#### Acceptance Criteria

1. WHEN viewing vehicle listings THEN the system SHALL display actual listings from the database
2. WHEN listing performance metrics are shown THEN the system SHALL calculate them from real booking and view data
3. WHEN listing availability is displayed THEN the system SHALL use actual availability records from the database
4. WHEN listing search results are shown THEN the system SHALL return real listings matching search criteria
5. WHEN listing analytics are calculated THEN the system SHALL use actual listing interaction and booking data

### Requirement 14

**User Story:** As any user, I want calendar and availability management to show real availability data, so that I can see actual vehicle availability and make informed booking decisions.

#### Acceptance Criteria

1. WHEN viewing availability calendars THEN the system SHALL display actual availability blocks from the database
2. WHEN availability conflicts are detected THEN the system SHALL check against real booking and block data
3. WHEN recurring availability is shown THEN the system SHALL retrieve actual recurring patterns from the database
4. WHEN availability analytics are calculated THEN the system SHALL use real availability and utilization data
5. WHEN availability notifications are sent THEN the system SHALL use actual availability change events from the database

### Requirement 15

**User Story:** As any user involved in transactions, I want payment and transaction management to show real financial data, so that I can track actual payments and financial activity.

#### Acceptance Criteria

1. WHEN viewing transaction history THEN the system SHALL display actual payment records from the database
2. WHEN payment status is shown THEN the system SHALL retrieve real payment processing status
3. WHEN financial summaries are calculated THEN the system SHALL use actual transaction data
4. WHEN payment methods are displayed THEN the system SHALL show actual saved payment methods from the database
5. WHEN transaction analytics are generated THEN the system SHALL use real payment and refund data

### Requirement 16

**User Story:** As any user, I want notification management to show real notification data, so that I can see actual communication history and preferences.

#### Acceptance Criteria

1. WHEN viewing notification history THEN the system SHALL display actual notifications from the database
2. WHEN notification preferences are shown THEN the system SHALL retrieve actual user preference settings
3. WHEN notification statistics are calculated THEN the system SHALL use real notification delivery and engagement data
4. WHEN notification templates are displayed THEN the system SHALL show actual template configurations from the database
5. WHEN notification analytics are generated THEN the system SHALL use real notification interaction data

### Requirement 17

**User Story:** As any user, I want search and filtering to work with real data, so that I can find actual listings, bookings, and other platform content.

#### Acceptance Criteria

1. WHEN performing searches THEN the system SHALL search through actual database records
2. WHEN applying filters THEN the system SHALL filter real data based on actual field values
3. WHEN search suggestions are shown THEN the system SHALL generate them from actual search history and data
4. WHEN search analytics are calculated THEN the system SHALL use real search query and result data
5. WHEN saved searches are displayed THEN the system SHALL retrieve actual saved search configurations from the database

### Requirement 18

**User Story:** As any user, I want review and rating systems to show real feedback data, so that I can see actual user experiences and ratings.

#### Acceptance Criteria

1. WHEN viewing reviews THEN the system SHALL display actual review records from the database
2. WHEN rating averages are calculated THEN the system SHALL use real rating data from completed transactions
3. WHEN review analytics are shown THEN the system SHALL use actual review sentiment and engagement data
4. WHEN review moderation is performed THEN the system SHALL work with actual flagged review content
5. WHEN review notifications are sent THEN the system SHALL use actual review submission and response events

### Requirement 19

**User Story:** As any user, I want location and geographic features to use real location data, so that I can see actual service areas and geographic analytics.

#### Acceptance Criteria

1. WHEN viewing service areas THEN the system SHALL display actual geographic coverage from the database
2. WHEN location-based searches are performed THEN the system SHALL use real location coordinates and boundaries
3. WHEN geographic analytics are calculated THEN the system SHALL use actual location-based transaction data
4. WHEN route planning is shown THEN the system SHALL use actual pickup and delivery location data
5. WHEN location preferences are displayed THEN the system SHALL retrieve actual user location settings from the database

### Requirement 20

**User Story:** As any user, I want communication features to show real message data, so that I can see actual conversation history and communication status.

#### Acceptance Criteria

1. WHEN viewing message history THEN the system SHALL display actual messages from the database
2. WHEN communication status is shown THEN the system SHALL retrieve real message delivery and read status
3. WHEN communication analytics are calculated THEN the system SHALL use actual message volume and response data
4. WHEN communication preferences are displayed THEN the system SHALL show actual user communication settings
5. WHEN communication notifications are sent THEN the system SHALL use actual message and communication events