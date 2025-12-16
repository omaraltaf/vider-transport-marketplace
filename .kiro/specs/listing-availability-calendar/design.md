# Design Document

## Overview

The Listing Availability Calendar feature provides a comprehensive system for managing when vehicles and drivers are available for booking. The system consists of three main components: availability block management, automatic booking synchronization, and search integration. Providers can manually block dates, set recurring unavailability patterns, and view their complete schedule including both manual blocks and existing bookings. The search functionality is enhanced to filter listings based on availability, ensuring renters only see options they can actually book.

The design emphasizes data integrity through transaction-based availability checks, preventing double-booking and race conditions. The calendar system integrates seamlessly with the existing booking workflow, automatically updating availability when bookings are accepted, cancelled, or completed.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                Frontend Calendar Components                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Calendar   │  │ Bulk       │  │ Analytics  │            │
│  │ View       │  │ Management │  │ Dashboard  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Availability Service (Backend)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - Block Management                                   │  │
│  │  - Conflict Detection                                 │  │
│  │  - Recurring Pattern Processing                       │  │
│  │  │  - Availability Calculation                        │  │
│  │  - Search Integration                                 │  │
│  │  - Calendar Export                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Prisma)                         │
│  - AvailabilityBlock                                         │
│  - RecurringBlock                                            │
│  - Bookings (existing)                                       │
│  - Listings (existing)                                       │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Provider Creates Block**: Frontend → Availability Service → Validate → Database
2. **Renter Searches**: Frontend → Search Service → Availability Service → Filter Results
3. **Booking Accepted**: Booking Service → Availability Service → Update Calendar
4. **Calendar View**: Frontend → Availability Service → Compute Availability → Return Calendar Data

## Components and Interfaces

### Backend Components

#### Availability Service

Manages all availability-related operations including block creation, conflict detection, and availability queries.

```typescript
interface AvailabilityBlock {
  id: string;
  listingId: string;
  listingType: 'vehicle' | 'driver';
  startDate: Date;
  endDate: Date;
  reason?: string;
  isRecurring: boolean;
  recurringBlockId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RecurringBlock {
  id: string;
  listingId: string;
  listingType: 'vehicle' | 'driver';
  daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
  startDate: Date;
  endDate?: Date; // null means indefinite
  reason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AvailabilityQuery {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  startDate: Date;
  endDate: Date;
}

interface AvailabilityResult {
  available: boolean;
  conflicts: Array<{
    type: 'block' | 'booking';
    startDate: Date;
    endDate: Date;
    reason?: string;
    bookingNumber?: string;
  }>;
}

interface CalendarDay {
  date: Date;
  status: 'available' | 'blocked' | 'booked';
  blockReason?: string;
  bookingId?: string;
  bookingNumber?: string;
}

interface BulkBlockRequest {
  listingIds: string[];
  listingType: 'vehicle' | 'driver';
  startDate: Date;
  endDate: Date;
  reason?: string;
}

interface BulkBlockResult {
  successful: string[]; // listing IDs
  failed: Array<{
    listingId: string;
    reason: string;
    conflicts: AvailabilityResult['conflicts'];
  }>;
}
```

#### Availability Routes

```typescript
// POST /api/availability/blocks
// Create a new availability block
router.post('/blocks', authenticate, createAvailabilityBlock);

// GET /api/availability/blocks/:listingId
// Get all blocks for a listing
router.get('/blocks/:listingId', getAvailabilityBlocks);

// DELETE /api/availability/blocks/:blockId
// Delete an availability block
router.delete('/blocks/:blockId', authenticate, deleteAvailabilityBlock);

// POST /api/availability/recurring
// Create a recurring availability block
router.post('/recurring', authenticate, createRecurringBlock);

// PUT /api/availability/recurring/:blockId
// Update a recurring block (all instances or future only)
router.put('/recurring/:blockId', authenticate, updateRecurringBlock);

// DELETE /api/availability/recurring/:blockId
// Delete a recurring block (all instances or future only)
router.delete('/recurring/:blockId', authenticate, deleteRecurringBlock);

// POST /api/availability/check
// Check availability for a date range
router.post('/check', checkAvailability);

// GET /api/availability/calendar/:listingId
// Get calendar view for a listing
router.get('/calendar/:listingId', getCalendarView);

// POST /api/availability/bulk
// Create blocks for multiple listings
router.post('/bulk', authenticate, createBulkBlocks);

// GET /api/availability/analytics/:listingId
// Get availability analytics
router.get('/analytics/:listingId', authenticate, getAvailabilityAnalytics);

// GET /api/availability/export/:listingId
// Export calendar in iCal format
router.get('/export/:listingId', authenticate, exportCalendar);
```

### Frontend Components

#### CalendarView Component

Main calendar component for viewing and managing availability.

```typescript
interface CalendarViewProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  mode: 'view' | 'manage'; // view for renters, manage for providers
  onDateSelect?: (startDate: Date, endDate: Date) => void;
}
```

#### AvailabilityBlockForm Component

Form for creating availability blocks.

```typescript
interface AvailabilityBlockFormProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  onBlockCreated: (block: AvailabilityBlock) => void;
  onCancel: () => void;
}
```

#### RecurringBlockForm Component

Form for creating recurring availability patterns.

```typescript
interface RecurringBlockFormProps {
  listingId: string;
  listingType: 'vehicle' | 'driver';
  onBlockCreated: (block: RecurringBlock) => void;
  onCancel: () => void;
}
```

#### BulkCalendarManagement Component

Interface for managing multiple listings' calendars.

```typescript
interface BulkCalendarManagementProps {
  listings: Array<{ id: string; title: string; type: 'vehicle' | 'driver' }>;
  onBulkBlockCreated: (result: BulkBlockResult) => void;
}
```

## Data Models

### Database Schema Extensions

New tables to be added to the Prisma schema:

```prisma
model AvailabilityBlock {
  id              String   @id @default(uuid())
  listingId       String
  listingType     String   // 'vehicle' or 'driver'
  startDate       DateTime
  endDate         DateTime
  reason          String?
  isRecurring     Boolean  @default(false)
  recurringBlockId String?
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  recurringBlock  RecurringBlock? @relation(fields: [recurringBlockId], references: [id])
  creator         User            @relation(fields: [createdBy], references: [id])

  @@index([listingId, listingType])
  @@index([startDate, endDate])
  @@index([recurringBlockId])
}

model RecurringBlock {
  id          String   @id @default(uuid())
  listingId   String
  listingType String   // 'vehicle' or 'driver'
  daysOfWeek  Int[]    // Array of 0-6 (Sunday-Saturday)
  startDate   DateTime
  endDate     DateTime? // null means indefinite
  reason      String?
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  instances   AvailabilityBlock[]
  creator     User                @relation(fields: [createdBy], references: [id])

  @@index([listingId, listingType])
  @@index([startDate, endDate])
}
```

### Availability Calculation Logic

The system calculates availability by combining three sources:

1. **Manual Blocks**: Explicitly created by providers
2. **Recurring Blocks**: Generated instances from recurring patterns
3. **Booking Blocks**: Accepted and active bookings

```typescript
async function isAvailable(
  listingId: string,
  listingType: 'vehicle' | 'driver',
  startDate: Date,
  endDate: Date
): Promise<AvailabilityResult> {
  // Check manual blocks
  const manualBlocks = await prisma.availabilityBlock.findMany({
    where: {
      listingId,
      listingType,
      isRecurring: false,
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } }
      ]
    }
  });

  // Check recurring blocks and generate instances
  const recurringInstances = await generateRecurringInstances(
    listingId,
    listingType,
    startDate,
    endDate
  );

  // Check bookings
  const bookings = await prisma.booking.findMany({
    where: {
      [listingType === 'vehicle' ? 'vehicleListingId' : 'driverListingId']: listingId,
      status: { in: ['ACCEPTED', 'ACTIVE', 'COMPLETED'] },
      startDate: { lte: endDate },
      endDate: { gte: startDate }
    }
  });

  const conflicts = [
    ...manualBlocks.map(b => ({ type: 'block' as const, ...b })),
    ...recurringInstances.map(b => ({ type: 'block' as const, ...b })),
    ...bookings.map(b => ({ type: 'booking' as const, ...b }))
  ];

  return {
    available: conflicts.length === 0,
    conflicts
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all properties identified in the prework, several can be consolidated:

- Properties 1.6, 7.3, and 8.2 all test conflict detection with accepted/active bookings - can be combined
- Properties 3.1 and 8.3 both test automatic calendar updates when bookings change status - can be combined
- Properties 4.1, 4.2, 4.3, and 8.5 all test search filtering by availability - can be combined into comprehensive search property
- Properties 1.1 and 1.2 both test block creation and persistence - can be combined
- Properties 2.1, 2.2, and 2.3 all test recurring block creation - can be combined

The consolidated properties provide unique validation value without redundancy.

### Correctness Properties

Property 1: Availability block creation and persistence
*For any* listing and valid date range (start ≤ end), creating an availability block should result in a stored block with the correct listingId, dates, and optional reason
**Validates: Requirements 1.1, 1.2, 1.4**

Property 2: Date range validation
*For any* availability block creation attempt, if the end date is before the start date, the system should reject the block with a validation error
**Validates: Requirements 1.4**

Property 3: Booking conflict detection
*For any* listing with an accepted or active booking, attempting to create an availability block that overlaps the booking dates should be rejected with a conflict error
**Validates: Requirements 1.6, 7.3, 8.2**

Property 4: Recurring block instance generation
*For any* recurring block with weekly pattern and specific days of week, the generated instances should only occur on the specified days within the recurrence period
**Validates: Requirements 2.1, 2.2, 2.3**

Property 5: Recurring block update scope
*For any* recurring block, updating with "future only" option should only modify instances with start dates after the update date, leaving past instances unchanged
**Validates: Requirements 2.5**

Property 6: Recurring block deletion scope
*For any* recurring block, deleting with "future only" option should only remove instances with start dates after the deletion date, preserving past instances
**Validates: Requirements 2.6**

Property 7: Automatic booking synchronization
*For any* booking status change from PENDING to ACCEPTED, the listing's availability should automatically reflect the booking dates as unavailable
**Validates: Requirements 3.1, 8.3**

Property 8: Booking cancellation availability restoration
*For any* accepted booking, cancelling it should restore the listing's availability for those dates (round-trip property)
**Validates: Requirements 3.2**

Property 9: Completed booking persistence
*For any* booking with COMPLETED status, the dates should remain marked as booked in the calendar for historical reference
**Validates: Requirements 3.4**

Property 10: Search availability filtering
*For any* search with date filters, the results should only include listings where both manual blocks and existing bookings do not overlap the requested date range
**Validates: Requirements 4.1, 4.2, 4.3, 8.5**

Property 11: Booking validation against availability
*For any* booking request, if the requested dates overlap with availability blocks or existing bookings, the system should reject the request with a specific conflict error
**Validates: Requirements 5.3, 5.4**

Property 12: Bulk block creation with individual validation
*For any* bulk block creation request across multiple listings, each listing should be validated individually, and the result should correctly identify which succeeded and which failed with their specific conflicts
**Validates: Requirements 6.2, 6.3, 6.4**

Property 13: Conflict notification generation
*For any* availability block creation that conflicts with a pending booking request, a notification should be generated for the provider
**Validates: Requirements 7.1**

Property 14: Automatic booking rejection for blocked dates
*For any* booking request for dates that are blocked, the system should automatically reject the request with a reason indicating the dates are unavailable
**Validates: Requirements 7.2**

Property 15: Availability statistics calculation
*For any* listing and time period, the percentage of blocked days should equal (count of blocked days / total days in period) × 100, and utilization rate should equal (count of booked days / count of available days) × 100
**Validates: Requirements 9.1, 9.2, 9.3**

Property 16: Calendar export completeness
*For any* listing and date range, the exported iCalendar file should include all availability blocks and bookings within that range with their complete details
**Validates: Requirements 10.1, 10.2, 10.3, 10.4**

## Error Handling

### Validation Errors

1. **Invalid Date Range**: Start date after end date
2. **Booking Conflict**: Block overlaps with accepted/active booking
3. **Past Booking Modification**: Attempting to modify completed bookings
4. **Invalid Recurrence Pattern**: Invalid days of week or missing required fields
5. **Unauthorized Access**: User attempting to modify another company's calendar

### Conflict Resolution

When conflicts are detected:

1. **Manual Block vs Booking**: Prevent block creation, return conflict details
2. **Booking vs Block**: Prevent booking, return conflict details with alternative dates
3. **Recurring Instance vs Booking**: Skip conflicting instances, create others
4. **Bulk Operation Conflicts**: Process all listings, report individual results

### Transaction Safety

Critical operations use database transactions:

```typescript
async function createBlockWithValidation(blockData: CreateBlockInput) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check for booking conflicts
    const conflicts = await checkBookingConflicts(tx, blockData);
    if (conflicts.length > 0) {
      throw new ConflictError('Booking conflicts detected', conflicts);
    }

    // 2. Create the block
    const block = await tx.availabilityBlock.create({ data: blockData });

    // 3. Check for pending booking requests and notify
    await notifyPendingBookingConflicts(tx, block);

    return block;
  });
}
```

## Testing Strategy

### Unit Testing

Unit tests will verify:

- Date range validation logic
- Conflict detection algorithms
- Recurring pattern generation
- Availability calculation
- Calendar export formatting
- Bulk operation result aggregation

### Property-Based Testing

Property-based tests will use **fast-check** (JavaScript/TypeScript PBT library) to verify:

- Block creation with random valid/invalid date ranges
- Conflict detection with random booking and block combinations
- Recurring pattern generation with random day-of-week combinations
- Search filtering with random availability scenarios
- Bulk operations with random listing sets and conflict scenarios
- Statistics calculations with random block and booking distributions

Each property-based test will:
- Run a minimum of 100 iterations
- Generate random but valid input data
- Verify the correctness property holds for all generated inputs
- Be tagged with the format: `**Feature: listing-availability-calendar, Property {number}: {property_text}**`

### Integration Testing

Integration tests will verify:
- Complete flow from block creation to search filtering
- Booking acceptance triggering calendar updates
- Recurring block instances appearing in calendar views
- Bulk operations across multiple listings
- Calendar export including all data sources

### Edge Cases

Special attention to:
- Timezone handling for date comparisons
- Daylight saving time transitions
- Leap years and month boundaries
- Concurrent booking requests for same dates
- Very long recurring patterns (years)
- Large bulk operations (100+ listings)

## Performance Considerations

### Query Optimization

1. **Indexed Queries**: All date range queries use database indexes
2. **Batch Loading**: Calendar views load all data in single query
3. **Caching**: Recurring pattern instances cached for frequently accessed listings
4. **Pagination**: Large result sets paginated (e.g., analytics over years)

### Recurring Pattern Performance

Recurring patterns are computed on-demand rather than pre-generated:

```typescript
// Efficient: Generate only needed instances
function generateRecurringInstances(
  pattern: RecurringBlock,
  viewStart: Date,
  viewEnd: Date
): AvailabilityBlock[] {
  const instances: AvailabilityBlock[] = [];
  let currentDate = new Date(Math.max(pattern.startDate.getTime(), viewStart.getTime()));
  const endDate = pattern.endDate 
    ? new Date(Math.min(pattern.endDate.getTime(), viewEnd.getTime()))
    : viewEnd;

  while (currentDate <= endDate) {
    if (pattern.daysOfWeek.includes(currentDate.getDay())) {
      instances.push({
        id: `${pattern.id}-${currentDate.toISOString()}`,
        listingId: pattern.listingId,
        listingType: pattern.listingType,
        startDate: currentDate,
        endDate: currentDate,
        reason: pattern.reason,
        isRecurring: true,
        recurringBlockId: pattern.id,
        createdBy: pattern.createdBy,
        createdAt: pattern.createdAt,
        updatedAt: pattern.updatedAt
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return instances;
}
```

### Search Performance

Availability filtering integrated into search query:

```typescript
// Efficient: Single query with subqueries
const availableListings = await prisma.vehicleListing.findMany({
  where: {
    status: 'ACTIVE',
    // No availability blocks overlapping requested dates
    NOT: {
      availabilityBlocks: {
        some: {
          startDate: { lte: searchEndDate },
          endDate: { gte: searchStartDate }
        }
      }
    },
    // No bookings overlapping requested dates
    NOT: {
      bookings: {
        some: {
          status: { in: ['ACCEPTED', 'ACTIVE'] },
          startDate: { lte: searchEndDate },
          endDate: { gte: searchStartDate }
        }
      }
    }
  }
});
```

## Security Considerations

### Authorization

1. **Block Management**: Only listing owner can create/modify blocks
2. **Calendar View**: Public view for renters, detailed view for owners
3. **Bulk Operations**: Validate ownership of all listings in bulk request
4. **Analytics**: Only accessible to listing owner

### Data Privacy

1. **Block Reasons**: Optional and only visible to listing owner
2. **Booking Details**: Limited information in calendar view for renters
3. **Export**: Only owner can export calendar

### Audit Logging

All availability changes logged:

```typescript
interface AvailabilityAuditLog {
  action: 'CREATE_BLOCK' | 'DELETE_BLOCK' | 'UPDATE_RECURRING' | 'BULK_OPERATION';
  userId: string;
  listingId: string;
  details: Record<string, any>;
  timestamp: Date;
}
```

## Responsive Design

### Mobile Optimizations

1. **Calendar View**: Swipe navigation between months
2. **Date Selection**: Touch-friendly date picker
3. **Block Creation**: Simplified form for mobile
4. **Bulk Management**: Optimized for smaller screens with list view

### Desktop Features

1. **Drag-to-Select**: Select date ranges by dragging
2. **Multi-Month View**: Show 3 months simultaneously
3. **Keyboard Shortcuts**: Arrow keys for navigation, Enter to select
4. **Bulk Selection**: Checkbox selection for multiple listings

## Accessibility

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**: Full calendar navigation via keyboard
2. **Screen Reader Support**: Announce date status and conflicts
3. **Color Independence**: Don't rely solely on color for status
4. **Focus Management**: Clear focus indicators on calendar dates
5. **ARIA Labels**: Descriptive labels for all calendar elements

### Calendar Accessibility

```typescript
<div
  role="grid"
  aria-label="Availability calendar"
  aria-describedby="calendar-legend"
>
  <div role="row">
    <div
      role="gridcell"
      aria-label={`${date.toLocaleDateString()}, ${status}`}
      aria-selected={isSelected}
      tabIndex={0}
    >
      {date.getDate()}
    </div>
  </div>
</div>
```

## Integration Points

### Existing Systems

1. **Booking Service**: Notify on booking status changes
2. **Search Service**: Filter by availability
3. **Notification Service**: Send conflict alerts
4. **Analytics Service**: Provide availability metrics

### Webhooks

Availability changes can trigger webhooks:

```typescript
interface AvailabilityWebhook {
  event: 'block.created' | 'block.deleted' | 'booking.conflict';
  listingId: string;
  listingType: 'vehicle' | 'driver';
  data: AvailabilityBlock | AvailabilityResult;
  timestamp: Date;
}
```

## Future Enhancements

Potential improvements not in current scope:

1. **Smart Scheduling**: AI-powered suggestions for optimal availability
2. **Seasonal Patterns**: Templates for seasonal unavailability
3. **Team Calendar**: Shared calendar for company fleet
4. **External Calendar Sync**: Two-way sync with Google Calendar, Outlook
5. **Availability Forecasting**: Predict busy periods based on historical data
6. **Dynamic Pricing**: Adjust rates based on availability
7. **Waitlist**: Allow renters to join waitlist for blocked dates
8. **Availability Alerts**: Notify renters when preferred dates become available
