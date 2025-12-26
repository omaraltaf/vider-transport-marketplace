# Mock Data Replacement Design Document

## Overview

This design outlines the systematic replacement of all mock data across the Vider Transport Marketplace platform with real database-driven data. The platform currently uses hardcoded mock data in various components for development purposes, which needs to be replaced with actual data from the PostgreSQL database to ensure accurate information display in production.

The replacement will cover all user-facing components including platform admin dashboards, company admin interfaces, user profiles, booking systems, vehicle listings, availability calendars, financial transactions, notifications, search functionality, reviews, location services, and communication features.

## Architecture

### Current State Analysis

The platform currently has mock data in several layers:

1. **Frontend Components**: React components with hardcoded mock data arrays and objects
2. **API Endpoints**: Backend routes returning placeholder data or empty arrays
3. **Service Layer**: Services using mock data for calculations and analytics
4. **Configuration**: Hardcoded configuration values instead of database-stored settings

### Target Architecture

The new architecture will implement a data-driven approach:

1. **Database-First**: All data will be retrieved from PostgreSQL database
2. **API-Driven**: Frontend components will consume real API endpoints
3. **Caching Layer**: Implement Redis caching for frequently accessed data
4. **Error Handling**: Graceful degradation when data is unavailable
5. **Permission Filtering**: Data filtered based on user roles and permissions

### Data Flow

```
Database (PostgreSQL) → Backend Services → API Endpoints → Frontend Components → User Interface
                    ↓
                Cache Layer (Redis) ← API Responses
```

## Components and Interfaces

### Frontend Component Updates

#### Platform Admin Components
- **PlatformConfigurationPanel**: Replace mock configuration data with database queries
- **RevenueDashboard**: Replace hardcoded revenue figures with real financial data
- **FinancialManagementPanel**: Use actual commission and transaction data
- **ContentReviewQueue**: Display real flagged content from moderation system
- **DisputeManagement**: Show actual disputes and refunds from database
- **UserManagement**: Display real user accounts and activity data
- **CompanyManagement**: Show actual company records and verification status
- **AnalyticsCharts**: Use real booking and transaction data for visualizations

#### Company Admin Components
- **CompanyDashboard**: Display real company-specific metrics and KPIs
- **BookingManagement**: Show actual bookings for the company
- **VehicleListingManagement**: Display real vehicle inventory and performance
- **DriverManagement**: Show actual driver records and performance data
- **FinancialReports**: Use real transaction and earning data

#### User-Facing Components
- **BookingHistory**: Display actual user booking records
- **VehicleSearch**: Search through real vehicle listings
- **AvailabilityCalendar**: Show real availability data from database
- **PaymentHistory**: Display actual transaction records
- **ReviewSystem**: Show real reviews and ratings
- **NotificationCenter**: Display actual notification history
- **MessageCenter**: Show real conversation history

### Backend API Endpoints

#### Data Retrieval Endpoints
- `/api/platform-admin/analytics/overview` - Real platform metrics
- `/api/platform-admin/financial/revenue/summary` - Actual revenue data
- `/api/platform-admin/disputes` - Real dispute records
- `/api/platform-admin/users` - Actual user data with pagination
- `/api/platform-admin/companies` - Real company records
- `/api/company/dashboard/metrics` - Company-specific real data
- `/api/bookings/history` - User's actual booking history
- `/api/listings/search` - Real vehicle listing search
- `/api/availability/calendar` - Actual availability data
- `/api/transactions/history` - Real payment records
- `/api/reviews` - Actual review and rating data
- `/api/notifications/history` - Real notification records
- `/api/messages/conversations` - Actual message history

#### Configuration Endpoints
- `/api/platform-admin/config/settings` - Database-stored configuration
- `/api/platform-admin/config/commission-rates` - Real commission rate data
- `/api/platform-admin/config/features` - Actual feature flag settings

### Database Schema Updates

#### New Tables for Configuration
```sql
-- Platform configuration storage
CREATE TABLE platform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  data_type VARCHAR(20) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_editable BOOLEAN DEFAULT true,
  requires_restart BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Analytics data aggregation
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,
  metric_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Content moderation flags
CREATE TABLE content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  flag_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  flagged_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  evidence JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id)
);
```

#### Enhanced Existing Tables
- Add analytics fields to existing tables for better reporting
- Add soft delete flags for data retention
- Add audit trails for configuration changes
- Add indexing for performance optimization

## Data Models

### Configuration Data Model
```typescript
interface PlatformConfig {
  id: string;
  category: 'financial' | 'system' | 'features' | 'security' | 'performance';
  key: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'select' | 'json';
  displayName: string;
  description: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
    pattern?: string;
  };
  isEditable: boolean;
  requiresRestart: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}
```

### Analytics Data Model
```typescript
interface AnalyticsSnapshot {
  id: string;
  snapshotDate: Date;
  metricType: string;
  metricData: {
    totalUsers?: number;
    totalBookings?: number;
    totalRevenue?: number;
    activeCompanies?: number;
    [key: string]: any;
  };
  createdAt: Date;
}
```

### Real-Time Metrics Model
```typescript
interface PlatformMetrics {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growthRate: number;
  };
  companies: {
    total: number;
    verified: number;
    active: number;
    growthRate: number;
  };
  bookings: {
    total: number;
    thisMonth: number;
    completed: number;
    cancelled: number;
    revenue: number;
  };
  financial: {
    totalRevenue: number;
    commissions: number;
    refunds: number;
    disputes: number;
  };
}
```

### Content Moderation Model
```typescript
interface ContentFlag {
  id: string;
  contentId: string;
  contentType: 'USER_PROFILE' | 'BOOKING_DESCRIPTION' | 'REVIEW' | 'MESSAGE' | 'COMPANY_INFO';
  flagType: 'INAPPROPRIATE_CONTENT' | 'SPAM' | 'HARASSMENT' | 'FRAUD' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ESCALATED';
  flaggedBy: string;
  reason: string;
  evidence?: {
    screenshots?: string[];
    metadata?: Record<string, any>;
    automatedScores?: Record<string, number>;
  };
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Database-sourced dashboard data
*For any* user role and dashboard component, all displayed data should originate from database queries and be filtered according to the user's permissions
**Validates: Requirements 1.1**

### Property 2: No mock data fallback on errors
*For any* API error or database failure, the system should display appropriate error messages without falling back to mock data
**Validates: Requirements 1.2, 7.2**

### Property 3: Real data calculation consistency
*For any* financial metric or statistic calculation, all input data should be verifiable against corresponding database records
**Validates: Requirements 1.3, 2.3, 2.4, 4.2, 4.5, 13.2**

### Property 4: Configuration database sourcing
*For any* configuration value displayed in the system, the value should be retrievable from the platform_configs table in the database
**Validates: Requirements 1.4, 6.1**

### Property 5: Historical data calculation accuracy
*For any* growth percentage or trend calculation, the historical data inputs should be verifiable against time-series database records
**Validates: Requirements 1.5**

### Property 6: Permission-filtered data access
*For any* user accessing data lists (disputes, users, companies, content), the returned data should be filtered according to the user's role and permissions
**Validates: Requirements 2.1, 3.1, 4.1**

### Property 7: Real-time status accuracy
*For any* status display (refunds, payments, disputes, bookings), the shown status should match the current database record
**Validates: Requirements 2.2, 15.2**

### Property 8: Evidence and metadata consistency
*For any* content moderation or dispute case, all evidence and metadata should be retrievable from the database
**Validates: Requirements 3.3**

### Property 9: Database persistence of actions
*For any* user action that modifies data (moderation decisions, configuration changes), the changes should be immediately persisted to the database
**Validates: Requirements 3.4, 6.2**

### Property 10: Historical record accuracy
*For any* historical data display (moderation history, booking history, transaction history), all records should be verifiable against database entries
**Validates: Requirements 3.5, 4.3, 12.1, 12.2, 15.1**

### Property 11: Error state handling
*For any* system error condition (network failure, database unavailability), appropriate error indicators should be displayed without showing mock data
**Validates: Requirements 7.1, 7.3, 7.4**

### Property 12: Empty state handling
*For any* query returning no results, the system should display "no data available" messages rather than sample data
**Validates: Requirements 7.5**

### Property 13: Listing data authenticity
*For any* vehicle listing display or search result, all listing information should be retrievable from the database
**Validates: Requirements 13.1**

### Property 14: Availability data consistency
*For any* availability calendar or conflict detection, all availability data should be sourced from database records
**Validates: Requirements 14.1, 14.2**

### Property 15: Booking data round-trip consistency
*For any* booking displayed in the system, all booking details should match the corresponding database record exactly
**Validates: Requirements 12.2**

## Error Handling

### Database Connection Failures
- **Graceful Degradation**: When database connections fail, display clear error messages instead of mock data
- **Retry Logic**: Implement exponential backoff retry mechanisms for transient database failures
- **Circuit Breaker**: Implement circuit breaker pattern to prevent cascading failures
- **Health Checks**: Regular database health monitoring with status indicators

### API Error Responses
- **Structured Errors**: Return consistent error response format with error codes and messages
- **User-Friendly Messages**: Convert technical errors to user-understandable messages
- **Error Logging**: Comprehensive error logging for debugging and monitoring
- **Fallback Strategies**: Clear "no data available" states instead of mock data fallbacks

### Data Validation Errors
- **Input Validation**: Validate all user inputs before database operations
- **Data Integrity**: Ensure referential integrity and constraint validation
- **Sanitization**: Sanitize all user inputs to prevent injection attacks
- **Error Recovery**: Provide clear guidance for fixing validation errors

### Permission and Authorization Errors
- **Access Control**: Proper role-based access control for all data endpoints
- **Permission Checks**: Validate user permissions before data retrieval
- **Audit Logging**: Log all permission-related access attempts
- **Secure Defaults**: Deny access by default, grant explicitly

## Testing Strategy

### Dual Testing Approach
The testing strategy combines unit testing and property-based testing to ensure comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property Tests**: Verify universal properties that should hold across all inputs
- **Integration Tests**: Test end-to-end data flow from database to UI

### Unit Testing Requirements
Unit tests will cover:
- Specific API endpoint responses with real data
- Database query result formatting
- Error handling scenarios
- Permission filtering logic
- Configuration value retrieval

### Property-Based Testing Requirements
Property-based tests will use **fast-check** library for JavaScript/TypeScript and run a minimum of 100 iterations per test. Each property-based test will be tagged with comments referencing the design document property:

**Format**: `**Feature: mock-data-replacement, Property {number}: {property_text}**`

Property tests will verify:
- Data consistency between database and API responses
- Permission filtering correctness across all user roles
- Error handling behavior under various failure conditions
- Configuration value accuracy across all settings
- Real-time data synchronization

### Test Data Management
- **Test Database**: Separate test database with controlled test data
- **Data Seeding**: Automated test data seeding for consistent test environments
- **Data Cleanup**: Automatic cleanup of test data after test execution
- **Mock External Services**: Mock external payment and notification services

### Performance Testing
- **Load Testing**: Verify system performance with real database queries under load
- **Query Optimization**: Test database query performance with realistic data volumes
- **Caching Validation**: Verify caching mechanisms work correctly with real data
- **Memory Usage**: Monitor memory usage when processing large datasets

### Security Testing
- **SQL Injection**: Test all database queries for SQL injection vulnerabilities
- **Access Control**: Verify permission-based data filtering works correctly
- **Data Exposure**: Ensure sensitive data is properly filtered based on user roles
- **Audit Trail**: Verify all data access and modifications are properly logged
