# Design Document

## Overview

The listing search functionality is failing because the database is empty due to foreign key constraint violations during the seeding process. The search API endpoint (`/api/listings/search`) and the `ListingService.searchListings()` method are correctly implemented, but they return empty results because there are no active listings in the database.

The root cause is that the database seeding script attempts to delete records in an incorrect order, violating foreign key constraints. This prevents the seeding process from completing successfully, leaving the database without the sample data needed for search functionality.

## Architecture

The system consists of several interconnected components:

1. **Frontend Search Page** (`SearchPage.tsx`) - Makes API calls to search for listings
2. **API Layer** (`listing.routes.ts`) - Handles search requests and filters
3. **Service Layer** (`ListingService`) - Implements search logic and database queries
4. **Database Layer** (Prisma/PostgreSQL) - Stores listings, companies, users, and relationships
5. **Seeding System** (`seed.routes.ts`) - Populates database with initial data

The issue occurs at the seeding system level, which prevents the database from having data for the other layers to work with.

## Components and Interfaces

### Database Schema Relationships
The database has the following key relationships that must be respected during deletion:

```
Company (parent)
├── User (child)
├── VehicleListing (child)
└── DriverListing (child)

VehicleListing/DriverListing (parent)
├── Booking (child)
├── AvailabilityBlock (child)
└── RecurringBlock (child)

Booking (parent)
├── Rating (child)
├── Transaction (child)
└── MessageThread (child)

MessageThread (parent)
└── Message (child)

User (parent)
├── AuditLog (child)
└── Notification (child)
```

### Current Seeding Process
The current deletion order in `seed.routes.ts` violates constraints:
1. Attempts to delete `user` before `recurringBlock` (which references `createdBy`)
2. Attempts to delete `notification` before `recurringBlock`
3. Does not account for all foreign key relationships

### Search API Flow
1. Frontend sends GET request to `/api/listings/search` with filters
2. `listing.routes.ts` parses query parameters into filter object
3. `ListingService.searchListings()` builds database queries
4. Prisma executes queries against `vehicleListing` and `driverListing` tables
5. Results are filtered, sorted, and paginated
6. Response sent back to frontend with listings array

## Data Models

### Search Filters Interface
```typescript
interface SearchFilters {
  listingType?: 'vehicle' | 'driver' | 'vehicle_driver';
  location?: {
    fylke?: string;
    kommune?: string;
    radius?: number;
    coordinates?: [number, number];
  };
  vehicleType?: VehicleType[];
  fuelType?: FuelType[];
  capacity?: { min?: number; max?: number; };
  priceRange?: { min?: number; max?: number; };
  dateRange?: { start: Date; end: Date; };
  withDriver?: boolean;
  tags?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'price' | 'rating' | 'distance';
  sortOrder?: 'asc' | 'desc';
}
```

### Search Result Interface
```typescript
interface SearchResult {
  vehicleListings: VehicleListing[];
  driverListings: DriverListing[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### Sample Data Structure
The seeding process should create:
- 3 companies with different locations and ratings
- 4 users with different roles (platform admin, company admins, company user)
- 4 vehicle listings with varied types, capacities, and pricing
- 3 driver listings with different qualifications and ratings
- Sample bookings, ratings, and message threads

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">listing-search-fix
Property 1: Search filter matching
*For any* set of search filters, all returned listings should match the specified filter criteria
**Validates: Requirements 1.1**

Property 2: Database content visibility
*For any* active listing in the database, it should appear in search results when no filters exclude it
**Validates: Requirements 1.2**

Property 3: Required field presence
*For any* search result listing, it should contain all essential fields (title, description, pricing information)
**Validates: Requirements 1.5**

Property 4: Foreign key constraint deletion order
*For any* database with existing relationships, deleting records in dependency order should not violate foreign key constraints
**Validates: Requirements 2.1, 2.2**

Property 5: Relationship integrity after seeding
*For any* record created during seeding, all foreign key references should point to existing parent records
**Validates: Requirements 2.4**

Property 6: HTTP response correctness
*For any* API request to the search endpoint, the response should have appropriate HTTP status codes and error details when applicable
**Validates: Requirements 3.4**

## Error Handling

The system should handle several error scenarios:

1. **Database Connection Errors**: Return 500 status with generic error message
2. **Invalid Filter Parameters**: Return 400 status with specific validation errors
3. **Empty Database**: Return 200 status with empty results array
4. **Seeding Constraint Violations**: Return 500 status with detailed constraint error
5. **Authentication Failures**: Return 401 status for protected endpoints

## Testing Strategy

### Unit Testing
- Test individual filter parsing and validation
- Test database query building logic
- Test seeding data creation and deletion order
- Test error handling for various failure scenarios

### Property-Based Testing
The system will use **fast-check** as the property-based testing library, configured to run a minimum of 100 iterations per property test.

Property-based tests will:
- Generate random search filters and verify result matching
- Create random listing data and verify search visibility
- Test foreign key constraint handling with various data combinations
- Verify HTTP response correctness across different request scenarios

Each property-based test will be tagged with comments referencing the specific correctness property from this design document using the format: **Feature: listing-search-fix, Property {number}: {property_text}**

### Integration Testing
- Test complete search flow from API request to database query
- Test seeding process with actual database constraints
- Test search functionality with various data states (empty, populated, filtered)

## Implementation Plan

1. **Fix Database Seeding Order**: Update `seed.routes.ts` to delete records in correct dependency order
2. **Add Constraint Validation**: Implement checks to ensure foreign key relationships are valid
3. **Improve Error Handling**: Add better error messages and logging for seeding failures
4. **Add Monitoring**: Implement logging for search queries and results for debugging
5. **Create Test Data Utilities**: Build helpers for creating test data that respects constraints
6. **Validate Search Logic**: Ensure search filters work correctly with populated database

The primary focus is fixing the seeding process to populate the database with valid test data, which will immediately resolve the empty search results issue.