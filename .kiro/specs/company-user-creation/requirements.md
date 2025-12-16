# Company User Creation Requirements

## Introduction

This specification defines the requirements for creating users and assigning them to companies through the platform admin interface. Currently, the system only supports creating platform admins, but there's a need to create regular users (customers, drivers, company admins) and assign them to specific companies.

## Glossary

- **Platform Admin**: Administrator with full platform access and user management capabilities
- **Company User**: Any user (customer, driver, company admin) associated with a specific company
- **User Management System**: The platform admin interface for managing users
- **Company Assignment**: The process of linking a user to a specific company during creation

## Requirements

### Requirement 1

**User Story:** As a platform admin, I want to create new users and assign them to companies, so that I can manage company membership and user roles effectively.

#### Acceptance Criteria

1. WHEN a platform admin accesses the user management interface, THE system SHALL display an "Add User" button alongside the existing "Create Admin" button
2. WHEN a platform admin clicks "Add User", THE system SHALL open a user creation form with company selection
3. WHEN creating a user, THE system SHALL require email, first name, last name, role, and company selection
4. WHEN a platform admin selects a company, THE system SHALL populate the company dropdown with all available companies
5. WHEN a platform admin submits the user creation form, THE system SHALL create the user and assign them to the selected company

### Requirement 2

**User Story:** As a platform admin, I want to select from different user roles when creating users, so that I can assign appropriate permissions and access levels.

#### Acceptance Criteria

1. WHEN creating a user, THE system SHALL provide role options: Customer, Driver, Company Admin
2. WHEN a platform admin selects "Company Admin" role, THE system SHALL display additional permission options
3. WHEN a platform admin selects "Driver" role, THE system SHALL enable driver-specific fields
4. WHEN a platform admin selects "Customer" role, THE system SHALL use standard customer permissions
5. WHEN role selection changes, THE system SHALL update the form fields accordingly

### Requirement 3

**User Story:** As a platform admin, I want to see company information when selecting companies, so that I can make informed decisions about user assignments.

#### Acceptance Criteria

1. WHEN the company dropdown is opened, THE system SHALL display company name, organization number, and city
2. WHEN searching for companies, THE system SHALL filter by company name, organization number, or city
3. WHEN no companies are found, THE system SHALL display "No companies found" message
4. WHEN a company is selected, THE system SHALL display the selected company information
5. WHEN companies are loading, THE system SHALL show a loading indicator

### Requirement 4

**User Story:** As a platform admin, I want validation and error handling during user creation, so that I can avoid creating invalid or duplicate users.

#### Acceptance Criteria

1. WHEN an email already exists, THE system SHALL prevent creation and display "Email already exists" error
2. WHEN required fields are missing, THE system SHALL highlight missing fields and prevent submission
3. WHEN company selection is missing, THE system SHALL display "Company selection is required" error
4. WHEN user creation fails, THE system SHALL display the specific error message
5. WHEN user creation succeeds, THE system SHALL show success message and refresh the user list

### Requirement 5

**User Story:** As a platform admin, I want to see the newly created users in the user list, so that I can verify successful creation and manage them.

#### Acceptance Criteria

1. WHEN a user is successfully created, THE system SHALL add them to the user list immediately
2. WHEN displaying users, THE system SHALL show their assigned company name
3. WHEN filtering users by company, THE system SHALL include the newly created users
4. WHEN searching users, THE system SHALL find newly created users by name, email, or company
5. WHEN viewing user details, THE system SHALL display the complete company information