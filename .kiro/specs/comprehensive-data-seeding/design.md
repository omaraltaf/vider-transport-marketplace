# Comprehensive Data Seeding and Currency Consistency - Design Document

## Overview

This design document outlines a comprehensive solution for achieving complete currency consistency across the Vider platform and implementing robust data seeding that creates realistic, interconnected test data. The solution addresses both immediate currency display issues and long-term data quality needs.

## Architecture

### Component Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Components                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Overview        │  │ Analytics       │  │ Financial       │ │
│  │ Components      │  │ Components      │  │ Components      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │        │
│           └─────────────────────┼─────────────────────┘        │
│                                 │                              │
├─────────────────────────────────┼──────────────────────────────┤
│              Centralized Currency Utilities                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  formatCurrency() | parseCurrency() | formatNumber()   │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Backend Services                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Seeding         │  │ Validation      │  │ Verification    │ │
│  │ Services        │  │ Services        │  │ Services        │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Database Layer                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Companies | Users | Vehicles | Drivers | Bookings     │   │
│  │  Transactions | Availability | Reviews | Ratings       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture
```
Seeding Script → Database Population → API Endpoints → Frontend Components
      ↓                    ↓                ↓              ↓
  Validation         Relationship      Currency        Consistent
   Checks            Integrity        Formatting       Display
```

## Components and Interfaces

### 1. Enhanced Currency Utilities

**Location**: `frontend/src/utils/currency.ts` and `src/utils/currency.ts`

**Interface**:
```typescript
interface CurrencyUtils {
  formatCurrency(amount: number): string;           // "1 234,56 kr"
  formatCurrencyValue(amount: number): string;      // "1 234,56"
  parseCurrency(value: string): number;             // Parse Norwegian format
  formatPercentage(value: number): string;          // "+15,2%"
  formatNumber(num: number): string;                // "1,2K" or "1,5M"
  validateCurrencyAmount(amount: number): boolean;  // Validation
}
```

### 2. Comprehensive Seeding Service

**Location**: `src/services/comprehensive-seeding.service.ts`

**Interface**:
```typescript
interface ComprehensiveSeedingService {
  seedCompleteDatabase(): Promise<SeedingResult>;
  seedCompanies(count: number): Promise<Company[]>;
  seedUsers(companies: Company[]): Promise<User[]>;
  seedVehicles(companies: Company[]): Promise<VehicleListing[]>;
  seedDrivers(companies: Company[]): Promise<DriverListing[]>;
  seedBookings(vehicles: VehicleListing[], drivers: DriverListing[]): Promise<Booking[]>;
  seedTransactions(bookings: Booking[]): Promise<Transaction[]>;
  seedAvailability(vehicles: VehicleListing[], drivers: DriverListing[]): Promise<void>;
  seedReviewsAndRatings(bookings: Booking[]): Promise<void>;
  verifyDataIntegrity(): Promise<IntegrityReport>;
}
```

### 3. Norwegian Market Data Generator

**Location**: `src/services/norwegian-market-data.service.ts`

**Interface**:
```typescript
interface NorwegianMarketDataService {
  generateCompanyData(): CompanyData;
  generateUserData(): UserData;
  generateVehiclePricing(vehicleType: string): PricingData;
  generateDriverPricing(licenseClass: string): PricingData;
  generateNorwegianAddress(): AddressData;
  generateOrganizationNumber(): string;
  generateRealisticBookingScenario(): BookingScenario;
}
```

### 4. Data Verification Service

**Location**: `src/services/data-verification.service.ts`

**Interface**:
```typescript
interface DataVerificationService {
  verifyCurrencyConsistency(): Promise<CurrencyReport>;
  verifyRelationshipIntegrity(): Promise<RelationshipReport>;
  verifyBusinessRules(): Promise<BusinessRuleReport>;
  generateSeedingReport(): Promise<SeedingReport>;
  validateNorwegianMarketData(): Promise<ValidationReport>;
}
```

## Data Models

### Enhanced Company Model
```typescript
interface CompanyData {
  name: string;                    // Realistic Norwegian company name
  organizationNumber: string;      // Valid Norwegian org number format
  businessAddress: string;         // Real Norwegian address
  city: string;                   // Norwegian city
  postalCode: string;             // Valid Norwegian postal code
  fylke: string;                  // Norwegian county
  kommune: string;                // Norwegian municipality
  vatRegistered: boolean;         // Norwegian VAT registration
  industry: string;               // Transport industry classification
  foundedYear: number;            // Realistic founding year
  employeeCount: number;          // Appropriate size for transport company
}
```

### Enhanced Pricing Model
```typescript
interface PricingData {
  hourlyRate: number;             // NOK amount
  dailyRate: number;              // NOK amount
  weeklyRate?: number;            // NOK amount
  monthlyRate?: number;           // NOK amount
  currency: 'NOK';                // Always NOK
  vatIncluded: boolean;           // Norwegian VAT (25%)
  seasonalAdjustment?: number;    // Norwegian seasonal pricing
  marketSegment: 'budget' | 'standard' | 'premium';
}
```

### Booking Scenario Model
```typescript
interface BookingScenario {
  duration: number;               // Hours
  startTime: Date;               // Realistic timing
  endTime: Date;                 // Calculated end time
  pickupLocation: string;        // Norwegian location
  dropoffLocation: string;       // Norwegian location
  distance?: number;             // Kilometers
  purpose: 'business' | 'personal' | 'tourism' | 'logistics';
  specialRequirements?: string[];
  estimatedCost: number;         // NOK amount
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Currency Consistency Across All Components
*For any* monetary value displayed in any component, the value should be formatted using Norwegian Kroner (NOK) with Norwegian locale formatting
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Mock Data Currency Alignment
*For any* component that falls back to mock data, all monetary values in the mock data should use the same NOK formatting as real API data
**Validates: Requirements 1.2, 6.2**

### Property 3: Seeded Data Relationship Integrity
*For any* seeded entity, all foreign key relationships should reference valid, existing entities in the database
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: Norwegian Market Data Realism
*For any* generated company data, the organization number should follow valid Norwegian format and addresses should use real Norwegian postal codes
**Validates: Requirements 4.1, 4.3**

### Property 5: Pricing Consistency
*For any* generated pricing data, all amounts should be in NOK currency and reflect realistic Norwegian market rates
**Validates: Requirements 4.2, 2.3, 2.4**

### Property 6: Tax Calculation Accuracy
*For any* financial transaction, the tax calculation should use the correct Norwegian VAT rate (25%) and be calculated in NOK
**Validates: Requirements 4.5, 2.6**

### Property 7: Seeding Script Idempotency
*For any* execution of the seeding script, running it multiple times should produce consistent results without data corruption
**Validates: Requirements 5.2, 5.4**

### Property 8: Data Verification Completeness
*For any* seeding operation, the verification process should check all critical data integrity constraints and currency consistency
**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

### Currency Formatting Errors
- **Fallback Strategy**: Use basic NOK formatting if advanced formatting fails
- **Logging**: Log currency formatting errors for debugging
- **User Experience**: Never show raw numbers without currency formatting

### Seeding Failures
- **Transaction Rollback**: Use database transactions to ensure atomic seeding operations
- **Partial Recovery**: Continue seeding other entities if one type fails
- **Error Reporting**: Provide detailed error messages with context
- **Cleanup**: Remove partially created data on critical failures

### Data Integrity Violations
- **Constraint Validation**: Check all foreign key constraints before creation
- **Business Rule Validation**: Ensure all business rules are satisfied
- **Relationship Repair**: Attempt to fix broken relationships automatically
- **Manual Intervention**: Flag issues that require manual resolution

## Testing Strategy

### Unit Testing
- Test currency formatting functions with various input values
- Test Norwegian data generation functions for format compliance
- Test individual seeding functions with mock data
- Test error handling scenarios with invalid inputs

### Property-Based Testing
- Generate random monetary amounts and verify NOK formatting consistency
- Generate random company data and verify Norwegian format compliance
- Generate random booking scenarios and verify relationship integrity
- Test seeding script idempotency with multiple executions

### Integration Testing
- Test complete seeding workflow from start to finish
- Test API endpoints with seeded data to verify currency consistency
- Test frontend components with both real and mock data
- Test data verification processes with various data states

### End-to-End Testing
- Test complete user workflows with seeded data
- Verify currency consistency across all user interfaces
- Test booking and payment flows with Norwegian market data
- Validate platform functionality with comprehensive test data

## Implementation Plan

### Phase 1: Currency Consistency Fix
1. Fix hardcoded USD formatting in PlatformAdminOverview component
2. Update all mock data to use centralized currency utilities
3. Audit all components for currency formatting consistency
4. Implement automated currency consistency verification

### Phase 2: Enhanced Data Generation
1. Create Norwegian market data generation service
2. Implement realistic company data generation
3. Create proper user-company relationship generation
4. Develop vehicle and driver data generation with market pricing

### Phase 3: Comprehensive Seeding
1. Build comprehensive seeding service with all entity types
2. Implement proper relationship creation and validation
3. Create booking and transaction generation with realistic scenarios
4. Add availability and rating data generation

### Phase 4: Verification and Testing
1. Implement data verification service with comprehensive checks
2. Create automated testing for all seeding functions
3. Build reporting system for seeding results
4. Implement continuous verification of data integrity

### Phase 5: Documentation and Maintenance
1. Create comprehensive documentation for seeding processes
2. Implement monitoring for currency consistency
3. Create maintenance scripts for data cleanup
4. Establish procedures for updating test data

## Performance Considerations

### Seeding Performance
- Use batch operations for large data creation
- Implement parallel processing where possible
- Use database transactions efficiently
- Monitor memory usage during large seeding operations

### Currency Formatting Performance
- Cache formatted values where appropriate
- Use efficient number formatting libraries
- Minimize repeated formatting operations
- Consider client-side caching for static values

### Data Verification Performance
- Use efficient database queries for integrity checks
- Implement incremental verification where possible
- Use indexing to speed up relationship validation
- Consider background processing for large verification tasks

## Security Considerations

### Test Data Security
- Ensure test data doesn't contain real personal information
- Use realistic but fictional data for all entities
- Implement proper data cleanup procedures
- Secure seeding scripts from unauthorized access

### Currency Data Integrity
- Validate all monetary inputs to prevent injection attacks
- Use proper number formatting to prevent display issues
- Implement bounds checking for monetary values
- Ensure currency calculations are precise and secure

## Monitoring and Maintenance

### Currency Consistency Monitoring
- Implement automated checks for currency formatting consistency
- Monitor API responses for currency format compliance
- Alert on any USD or other currency appearances
- Regular audits of all monetary displays

### Data Quality Monitoring
- Monitor seeded data for relationship integrity
- Check for data drift over time
- Validate business rule compliance regularly
- Track seeding performance and success rates

### Maintenance Procedures
- Regular updates to Norwegian market data
- Periodic refresh of test data
- Updates to seeding scripts as schema evolves
- Documentation updates as requirements change