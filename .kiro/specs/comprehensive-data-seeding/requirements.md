# Comprehensive Data Seeding and Currency Consistency - Requirements

## Introduction

This specification addresses the need for a comprehensive data seeding solution that ensures complete currency consistency across the entire Vider platform. The current system has residual currency inconsistencies where some components still display USD instead of NOK, and the data seeding needs to be more comprehensive to create realistic, interconnected test data.

## Glossary

- **Platform**: The Vider transport marketplace system
- **Currency_Consistency**: All monetary values displayed and stored in Norwegian Kroner (NOK)
- **Data_Seeding**: Process of populating database with realistic test data
- **Comprehensive_Seeding**: Complete data population that creates realistic relationships between all entities
- **Mock_Data**: Hardcoded fallback data used when APIs fail
- **Real_Data**: Data retrieved from database through API endpoints

## Requirements

### Requirement 1: Complete Currency Consistency

**User Story:** As a platform administrator, I want all monetary values to display consistently in Norwegian Kroner (NOK), so that there is no confusion about currency across the platform.

#### Acceptance Criteria

1. WHEN any component displays monetary values THEN the system SHALL format all amounts using Norwegian Kroner (NOK) with Norwegian locale formatting
2. WHEN API endpoints fail and fallback to mock data THEN the system SHALL ensure mock data uses NOK currency formatting
3. WHEN the platform overview displays revenue metrics THEN the system SHALL show amounts in NOK format using centralized currency utilities
4. WHEN any hardcoded currency formatting exists THEN the system SHALL replace it with centralized NOK formatting functions
5. WHERE currency formatting is needed THE system SHALL use the centralized currency utility functions

### Requirement 2: Comprehensive Database Seeding

**User Story:** As a developer, I want comprehensive test data that represents realistic business scenarios, so that I can properly test all platform functionality with interconnected data.

#### Acceptance Criteria

1. WHEN the database is seeded THEN the system SHALL create realistic Norwegian companies with proper organization numbers and addresses
2. WHEN creating test users THEN the system SHALL establish proper relationships between users and companies with appropriate roles
3. WHEN generating vehicle listings THEN the system SHALL create diverse vehicle types with realistic Norwegian market rates in NOK
4. WHEN creating driver listings THEN the system SHALL generate profiles with proper Norwegian license classes and market-appropriate rates
5. WHEN establishing bookings THEN the system SHALL create realistic booking scenarios with proper financial calculations in NOK
6. WHEN generating transactions THEN the system SHALL ensure all financial records use NOK currency and proper Norwegian tax calculations
7. WHEN creating availability data THEN the system SHALL generate realistic availability patterns for vehicles and drivers
8. WHEN establishing ratings and reviews THEN the system SHALL create authentic feedback data that reflects realistic usage patterns

### Requirement 3: Data Relationship Integrity

**User Story:** As a platform administrator, I want all test data to have proper relationships and referential integrity, so that the platform functions realistically during testing.

#### Acceptance Criteria

1. WHEN companies are created THEN the system SHALL ensure each company has appropriate users with correct roles
2. WHEN vehicle listings are created THEN the system SHALL associate them with valid companies and ensure proper ownership
3. WHEN bookings are generated THEN the system SHALL create valid relationships between renters, providers, and assets
4. WHEN financial transactions are created THEN the system SHALL ensure proper links to bookings and correct commission calculations
5. WHEN availability blocks are created THEN the system SHALL ensure they correspond to actual vehicles and drivers
6. WHEN ratings are generated THEN the system SHALL ensure they link to completed bookings with realistic timing

### Requirement 4: Norwegian Market Realism

**User Story:** As a stakeholder, I want test data that reflects the Norwegian transport market, so that testing scenarios are realistic and relevant.

#### Acceptance Criteria

1. WHEN generating company data THEN the system SHALL use realistic Norwegian company names, addresses, and organization numbers
2. WHEN setting pricing THEN the system SHALL use market-appropriate Norwegian rates for vehicles and drivers
3. WHEN creating location data THEN the system SHALL use actual Norwegian cities, postal codes, and administrative divisions
4. WHEN generating user data THEN the system SHALL use appropriate Norwegian names and contact information patterns
5. WHEN calculating taxes THEN the system SHALL apply correct Norwegian VAT rates (25%)

### Requirement 5: Seeding Script Reliability

**User Story:** As a developer, I want a reliable seeding process that can be run multiple times safely, so that I can reset test data as needed during development.

#### Acceptance Criteria

1. WHEN the seeding script is executed THEN the system SHALL safely clear existing test data without affecting production data
2. WHEN running the script multiple times THEN the system SHALL produce consistent, reproducible results
3. WHEN seeding fails partially THEN the system SHALL provide clear error messages and rollback incomplete changes
4. WHEN the script completes THEN the system SHALL verify data integrity and report success metrics
5. WHERE data conflicts exist THE system SHALL resolve them gracefully and continue seeding

### Requirement 6: API Mock Data Alignment

**User Story:** As a frontend developer, I want mock data fallbacks to match the format and currency of real API data, so that the interface behaves consistently regardless of API availability.

#### Acceptance Criteria

1. WHEN API endpoints are unavailable THEN the system SHALL use mock data that matches the structure of real API responses
2. WHEN mock data contains monetary values THEN the system SHALL format them using the same NOK currency utilities as real data
3. WHEN components fallback to mock data THEN the system SHALL maintain the same user experience as with real data
4. WHEN mock data is updated THEN the system SHALL ensure consistency with current database schema and business rules
5. WHERE mock data is used THE system SHALL clearly indicate fallback mode for debugging purposes

### Requirement 7: Verification and Testing

**User Story:** As a quality assurance engineer, I want automated verification of data seeding results, so that I can confirm all data is properly created and formatted.

#### Acceptance Criteria

1. WHEN seeding completes THEN the system SHALL run automated verification checks on all created data
2. WHEN verifying currency consistency THEN the system SHALL confirm all monetary values use NOK currency
3. WHEN checking relationships THEN the system SHALL verify all foreign key constraints are satisfied
4. WHEN validating business rules THEN the system SHALL ensure all data meets platform requirements
5. WHEN generating reports THEN the system SHALL provide detailed statistics on seeded data quantities and quality