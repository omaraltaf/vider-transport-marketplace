# Mock Data Replacement - Design Document

## Overview

This design outlines the systematic replacement of all hardcoded mock data across the Vider platform with real database queries. The approach ensures that all platform admin dashboards, analytics, and user interfaces display accurate, real-time operational data while maintaining system performance and reliability.

## Architecture

### Data Flow Architecture
```
Frontend Components → API Routes → Service Layer → Database Queries → Real Data
                                      ↓
                                 Fallback Logic → Realistic Mock Data (if DB fails)
```

### Service Layer Pattern
- **Primary Path**: Real database queries using Prisma
- **Fallback Path**: Realistic mock data matching seeded database structure
- **Caching Layer**: Redis caching for performance optimization
- **Error Handling**: Graceful degradation with logging

## Components and Interfaces

### 1. Platform Admin User Service
**Current State**: Partially converted (getUserStatistics implemented)
**Remaining Work**: 
- Replace `generateMockUsers()` with real user queries
- Convert `searchUsers()` to use database queries
- Replace mock activity data with real audit logs
- Convert suspicious activity detection to use real patterns

### 2. Financial Services
**Services to Update**:
- `revenue-analytics.service.ts`
- `commission-rate.service.ts` 
- `dispute-refund.service.ts`

**Implementation**:
- Replace hardcoded revenue calculations with transaction aggregations
- Use real commission data from platform configuration
- Query actual dispute records from database

### 3. Analytics Services
**Services to Update**:
- `analytics.service.ts`
- `geographic-analytics.service.ts`
- `growth-analytics.service.ts`

**Implementation**:
- Calculate metrics from real booking, user, and company data
- Use actual geographic data from user/company locations
- Compute growth rates from historical database records

### 4. Content Moderation Services
**Services to Update**:
- `content-moderation.service.ts`
- `blacklist-management.service.ts`
- `fraud-detection.service.ts`

**Implementation**:
- Query real content flags and moderation actions
- Use actual blacklist entries from database
- Analyze real user behavior patterns for fraud detection

### 5. Communication Services
**Services to Update**:
- `announcement.service.ts`
- `support-ticket.service.ts`
- `help-center.service.ts`

**Implementation**:
- Store and retrieve announcements from database
- Use real support ticket data
- Manage help center content in database

### 6. System Administration Services
**Services to Update**:
- `system-config.service.ts`
- `backup-recovery.service.ts`
- `security-monitoring.service.ts`

**Implementation**:
- Use real system configuration data
- Track actual backup operations
- Monitor real security events and alerts

## Data Models

### Enhanced Database Queries

#### User Analytics Queries
```typescript
// Real user statistics
const userStats = await prisma.user.aggregate({
  _count: { id: true },
  where: { createdAt: { gte: dateRange.start } }
});

// User activity from audit logs
const userActivity = await prisma.auditLog.findMany({
  where: { adminUserId: userId },
  orderBy: { createdAt: 'desc' },
  take: limit
});
```

#### Financial Analytics Queries
```typescript
// Real revenue calculations
const revenue = await prisma.transaction.aggregate({
  _sum: { amount: true },
  where: { 
    type: 'BOOKING_PAYMENT',
    status: 'COMPLETED',
    createdAt: { gte: dateRange.start }
  }
});

// Commission calculations
const commissions = await prisma.transaction.aggregate({
  _sum: { amount: true },
  where: { 
    type: 'COMMISSION',
    createdAt: { gte: dateRange.start }
  }
});
```

#### Geographic Analytics Queries
```typescript
// Real geographic distribution
const geoData = await prisma.company.groupBy({
  by: ['fylke'],
  _count: { id: true },
  where: { verified: true }
});

// User distribution by location
const userGeoData = await prisma.user.findMany({
  include: { company: { select: { fylke: true, kommune: true } } }
});
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data Consistency
*For any* platform metric displayed in the admin dashboard, the value should match the corresponding database query result within acceptable cache tolerance
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Fallback Reliability
*For any* service method that queries the database, if the database query fails, the method should return realistic fallback data that matches the structure of real data
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 3: Cache Consistency
*For any* cached data, the cached value should match the database value or be within the configured cache TTL period
**Validates: Requirements 8.5**

### Property 4: Real-time Accuracy
*For any* dashboard displaying real-time metrics, the displayed values should reflect database changes within the configured refresh interval
**Validates: Requirements 5.5**

### Property 5: Query Performance
*For any* database query replacing mock data, the query execution time should not exceed reasonable performance thresholds (< 2 seconds for complex queries)
**Validates: Requirements 1.1, 2.1, 3.1, 4.1, 5.1**

### Property 6: Data Completeness
*For any* service returning data arrays, the returned data should include all relevant records from the database that match the query criteria
**Validates: Requirements 2.1, 3.1, 4.1**

### Property 7: Error Handling Consistency
*For any* service method, database errors should be handled consistently with appropriate logging and fallback behavior
**Validates: Requirements 8.2, 8.4**

## Error Handling

### Database Query Failures
- **Primary Response**: Log error with context
- **Fallback Action**: Return realistic mock data matching seeded database
- **User Notification**: Display indicator that fallback data is being used
- **Recovery**: Automatic retry on next request

### Performance Degradation
- **Detection**: Query timeout monitoring
- **Response**: Implement query optimization or caching
- **Fallback**: Use cached data if available
- **Alerting**: Log performance issues for investigation

### Data Inconsistency
- **Detection**: Data validation checks
- **Response**: Log inconsistency warnings
- **Fallback**: Use most recent consistent data
- **Resolution**: Database integrity checks

## Testing Strategy

### Unit Testing
- Test each service method with real database queries
- Verify fallback behavior when database queries fail
- Test data transformation and aggregation logic
- Validate error handling and logging

### Property-Based Testing
- **Library**: fast-check (JavaScript/TypeScript property testing)
- **Configuration**: Minimum 100 iterations per property test
- **Test Tagging**: Each property test tagged with design document reference

**Property Test Examples**:
```typescript
// Property 1: Data Consistency
it('should maintain data consistency between service and database', () => {
  fc.assert(fc.property(
    fc.record({ dateRange: dateRangeArbitrary }),
    async (params) => {
      const serviceResult = await userService.getUserStatistics(params.dateRange);
      const dbResult = await prisma.user.count({ 
        where: { createdAt: { gte: params.dateRange.start } }
      });
      expect(serviceResult.totalUsers).toBe(dbResult);
    }
  ));
});

// Property 2: Fallback Reliability  
it('should provide consistent fallback data structure', () => {
  fc.assert(fc.property(
    fc.anything(),
    async (queryParams) => {
      // Mock database failure
      jest.spyOn(prisma.user, 'count').mockRejectedValue(new Error('DB Error'));
      
      const result = await userService.getUserStatistics(queryParams);
      
      // Verify fallback data has correct structure
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('activeUsers');
      expect(typeof result.totalUsers).toBe('number');
    }
  ));
});
```

### Integration Testing
- Test complete data flow from API to database
- Verify caching behavior and cache invalidation
- Test system behavior under database load
- Validate real-time data updates

## Implementation Plan

### Phase 1: Core Platform Services
1. Complete platform-admin-user.service.ts conversion
2. Update platform-admin-global.routes.ts with real data
3. Convert financial services (revenue, commission, disputes)

### Phase 2: Analytics Services
1. Replace analytics.service.ts mock data
2. Convert geographic-analytics.service.ts
3. Update growth-analytics.service.ts with real calculations

### Phase 3: Content and Security Services
1. Convert content-moderation.service.ts
2. Update blacklist-management.service.ts
3. Replace fraud-detection.service.ts mock data

### Phase 4: Communication and Support Services
1. Convert announcement.service.ts
2. Update support-ticket.service.ts
3. Replace help-center.service.ts mock data

### Phase 5: System Administration Services
1. Update system-config.service.ts
2. Convert backup-recovery.service.ts
3. Replace security-monitoring.service.ts mock data

### Phase 6: Testing and Validation
1. Implement property-based tests for all converted services
2. Run comprehensive integration tests
3. Performance testing and optimization
4. User acceptance testing with real data

## Performance Considerations

### Database Query Optimization
- Use appropriate indexes for frequently queried fields
- Implement query result pagination for large datasets
- Use database aggregation functions for statistical calculations
- Optimize JOIN operations for complex queries

### Caching Strategy
- Redis caching for expensive calculations
- Cache TTL based on data update frequency
- Cache invalidation on data modifications
- Distributed caching for scalability

### Monitoring and Alerting
- Query performance monitoring
- Database connection health checks
- Cache hit rate monitoring
- Error rate tracking and alerting