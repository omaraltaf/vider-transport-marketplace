# Design Document

## Overview

The Company Admin Dashboard redesign transforms the existing basic dashboard into a comprehensive command center that provides real-time business intelligence, actionable notifications, and streamlined access to critical operations. The dashboard serves as the primary landing page for authenticated company administrators and must efficiently present data for companies operating in dual roles (Provider and Renter).

The design leverages existing backend services and APIs, introducing new dashboard-specific endpoints that aggregate data from multiple sources. The frontend will use the established design system components to ensure consistency and accessibility.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Page (React)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ KPI Cards  │  │ Action     │  │ Operations │            │
│  │            │  │ Items      │  │ Management │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Dashboard Service (New Backend)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Aggregates data from existing services:             │  │
│  │  - BookingService                                     │  │
│  │  - ListingService                                     │  │
│  │  - CompanyService                                     │  │
│  │  - NotificationService                                │  │
│  │  - RatingService                                      │  │
│  │  - MessagingService                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Prisma)                         │
│  - Bookings, Listings, Companies, Notifications, etc.       │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure

The dashboard will be organized into four main sections:

1. **KPI Section**: Grid of metric cards showing key performance indicators
2. **Actionable Items Section**: List of items requiring immediate attention
3. **Operations Section**: Quick access to listings, bookings, and billing
4. **Profile Section**: Company profile status and settings access

## Components and Interfaces

### Backend Components

#### Dashboard Service

A new service that aggregates data from existing services to provide dashboard-specific endpoints.

```typescript
interface DashboardKPIs {
  provider: {
    totalRevenue30Days: number;
    fleetUtilization: number;
    aggregatedRating: number | null;
  };
  renter: {
    totalSpend30Days: number;
    openBookingsCount: number;
    upcomingBookingsCount: number;
  };
}

interface ActionableItem {
  type: 'booking_request' | 'expiring_request' | 'unread_message' | 'rating_prompt' | 'verification_status';
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link: string;
  createdAt: string;
}

interface OperationalSummary {
  listings: {
    availableCount: number;
    suspendedCount: number;
  };
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    companyName: string;
    listingTitle: string;
    status: BookingStatus;
    startDate: string;
    role: 'provider' | 'renter';
  }>;
  billing: {
    hasInvoices: boolean;
    latestInvoicePath: string | null;
  };
}

interface ProfileStatus {
  completeness: number; // 0-100 percentage
  missingFields: string[];
  verified: boolean;
  allDriversVerified: boolean;
}

interface DashboardData {
  kpis: DashboardKPIs;
  actionableItems: ActionableItem[];
  operations: OperationalSummary;
  profile: ProfileStatus;
}
```

#### Dashboard Routes

```typescript
// GET /api/dashboard
// Returns complete dashboard data for authenticated company admin
router.get('/dashboard', authenticate, getDashboardData);
```

### Frontend Components

#### DashboardPage Component

Main container component that fetches and displays all dashboard data.

```typescript
interface DashboardPageProps {}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  // Fetch dashboard data
  // Render sections
  // Handle loading and error states
};
```

#### KPI Card Component

Reusable card component for displaying individual metrics.

```typescript
interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
}
```

#### ActionableItemsList Component

Displays prioritized list of items requiring attention.

```typescript
interface ActionableItemsListProps {
  items: ActionableItem[];
  onItemClick: (item: ActionableItem) => void;
}
```

#### RecentBookingsTable Component

Table displaying recent booking activity.

```typescript
interface RecentBookingsTableProps {
  bookings: OperationalSummary['recentBookings'];
  onBookingClick: (bookingId: string) => void;
}
```

## Data Models

### Dashboard Data Aggregation

The dashboard service will aggregate data from multiple existing tables:

- **Bookings**: For revenue, spending, booking counts, and recent activity
- **VehicleListings & DriverListings**: For fleet utilization and listing counts
- **Companies**: For ratings and verification status
- **Notifications**: For unread message counts
- **Ratings**: For rating prompts (completed bookings without ratings)
- **Messages**: For unread message counts

### Calculated Metrics

#### Fleet Utilization

```typescript
// Formula: (Active + Upcoming Bookings) / Total Available Listings * 100
const calculateFleetUtilization = async (companyId: string): Promise<number> => {
  const totalListings = await prisma.vehicleListing.count({
    where: { companyId, status: 'ACTIVE' }
  }) + await prisma.driverListing.count({
    where: { companyId, status: 'ACTIVE' }
  });

  if (totalListings === 0) return 0;

  const activeBookings = await prisma.booking.count({
    where: {
      providerCompanyId: companyId,
      status: { in: ['ACTIVE', 'ACCEPTED'] }
    }
  });

  return (activeBookings / totalListings) * 100;
};
```

#### Revenue Calculation

```typescript
// Sum of providerRate from ACCEPTED and COMPLETED bookings in last 30 days
const calculateRevenue30Days = async (companyId: string): Promise<number> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const bookings = await prisma.booking.findMany({
    where: {
      providerCompanyId: companyId,
      status: { in: ['ACCEPTED', 'COMPLETED'] },
      createdAt: { gte: thirtyDaysAgo }
    },
    select: { providerRate: true }
  });

  return bookings.reduce((sum, b) => sum + b.providerRate, 0);
};
```

#### Profile Completeness

```typescript
// Calculate percentage of required fields that are filled
const calculateProfileCompleteness = (company: Company): number => {
  const requiredFields = [
    'name', 'organizationNumber', 'businessAddress', 
    'city', 'postalCode', 'fylke', 'kommune', 'description'
  ];

  const filledFields = requiredFields.filter(field => 
    company[field] && company[field].trim() !== ''
  );

  return (filledFields.length / requiredFields.length) * 100;
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After reviewing all properties identified in the prework, several can be consolidated:

- Properties 1.1 and 1.4 (revenue and spend calculations) use the same calculation logic, just from different perspectives
- Properties 1.5 and 1.6 (counting bookings by status) can be combined into a single property about status filtering
- Properties 3.1 and 3.2 (counting listings by status) can be combined similarly
- Properties 2.5 and 2.6 (verification status checks) both validate boolean fields and can be combined
- Properties 6.4 and 6.5 (keyboard navigation and ARIA labels) are both accessibility properties that can be tested together

The consolidated properties provide unique validation value without redundancy.

### Correctness Properties

Property 1: Revenue calculation accuracy
*For any* company and time period, the calculated revenue should equal the sum of providerRate from all bookings where the company is the provider, the booking status is ACCEPTED or COMPLETED, and the booking was created within the time period
**Validates: Requirements 1.1, 1.4**

Property 2: Fleet utilization calculation
*For any* company, the fleet utilization percentage should equal (count of bookings with status ACTIVE or ACCEPTED where company is provider) divided by (count of active vehicle and driver listings for that company) multiplied by 100
**Validates: Requirements 1.2**

Property 3: Booking status filtering
*For any* company and booking status, the count of bookings displayed should equal the actual count of bookings with that status where the company is either provider or renter
**Validates: Requirements 1.5, 1.6, 3.1, 3.2**

Property 4: Rating display consistency
*For any* company, the rating displayed on the dashboard should match the aggregatedRating field stored in the company record
**Validates: Requirements 1.3**

Property 5: Expiring request identification
*For any* booking with PENDING status, if the time until expiresAt is less than a configured threshold, then that booking should appear in the expiring requests list
**Validates: Requirements 2.2**

Property 6: Unread message counting
*For any* user, the count of unread messages displayed should equal the count of messages in threads where the user is a participant and the message read status is false
**Validates: Requirements 2.3**

Property 7: Rating prompt identification
*For any* company, bookings that have status COMPLETED and no associated rating record should appear in the rating prompts list
**Validates: Requirements 2.4**

Property 8: Verification status accuracy
*For any* company, the verification badge status displayed should match the verified field, and the all-drivers-verified indicator should be true only if all driver listings have verified=true
**Validates: Requirements 2.5, 2.6**

Property 9: Recent bookings ordering
*For any* company, the recent bookings list should contain the 5 most recent bookings ordered by createdAt descending, and each booking should include bookingNumber, company name, listing title, and status
**Validates: Requirements 3.4**

Property 10: Profile completeness calculation
*For any* company, the profile completeness percentage should equal (count of non-empty required fields) divided by (total count of required fields) multiplied by 100
**Validates: Requirements 4.1**

Property 11: Error resilience
*For any* API endpoint failure, the dashboard should display an error message for that section while other sections continue to function normally
**Validates: Requirements 5.3**

Property 12: Numerical formatting consistency
*For any* numerical value displayed on the dashboard, currency values should include currency symbol and 2 decimal places, percentages should include % symbol and 1 decimal place, and counts should be integers
**Validates: Requirements 7.2**

Property 13: Keyboard accessibility
*For any* interactive element on the dashboard, it should be reachable via keyboard navigation and have appropriate ARIA labels for screen readers
**Validates: Requirements 6.4, 6.5**

Property 14: Color contrast compliance
*For any* color combination used for status indicators or text, the contrast ratio should meet WCAG AA standards (minimum 4.5:1 for normal text, 3:1 for large text)
**Validates: Requirements 7.5**

## Error Handling

### API Error Handling

The dashboard must gracefully handle failures from individual API endpoints:

1. **Partial Failure Strategy**: Each dashboard section fetches data independently. If one section fails, others continue to display.

2. **Error Display**: Failed sections show user-friendly error messages with retry options.

3. **Loading States**: Each section displays skeleton loaders while data is being fetched.

4. **Timeout Handling**: API calls timeout after 10 seconds with appropriate error messages.

### Data Validation

1. **Null/Undefined Checks**: All data from APIs is validated before rendering.

2. **Default Values**: Missing optional data uses sensible defaults (e.g., 0 for counts, "N/A" for missing text).

3. **Type Safety**: TypeScript interfaces ensure type correctness throughout the component tree.

### User Feedback

1. **Toast Notifications**: Critical errors trigger toast notifications.

2. **Inline Errors**: Section-specific errors display inline within the section.

3. **Retry Mechanisms**: Failed sections provide "Retry" buttons.

## Testing Strategy

### Unit Testing

Unit tests will verify:

- Individual calculation functions (revenue, utilization, completeness)
- Data transformation functions
- Component rendering with various data states
- Error handling logic
- Formatting functions for numbers, dates, and currency

### Property-Based Testing

Property-based tests will use **fast-check** (JavaScript/TypeScript PBT library) to verify:

- Revenue calculations across random booking datasets
- Fleet utilization calculations with random listing and booking combinations
- Profile completeness calculations with random field completion states
- Booking filtering and counting across random datasets
- Numerical formatting consistency across random values
- Error resilience with random API failure scenarios

Each property-based test will:
- Run a minimum of 100 iterations
- Generate random but valid input data
- Verify the correctness property holds for all generated inputs
- Be tagged with the format: `**Feature: company-admin-dashboard, Property {number}: {property_text}**`

### Integration Testing

Integration tests will verify:
- Complete dashboard data flow from API to UI
- Navigation between dashboard and linked pages
- Responsive behavior at different breakpoints
- Keyboard navigation through all interactive elements
- Screen reader compatibility

### Accessibility Testing

- Automated accessibility audits using axe-core
- Manual keyboard navigation testing
- Screen reader testing with NVDA/JAWS
- Color contrast verification
- Focus management testing

## Performance Considerations

### Data Fetching Strategy

1. **Parallel Requests**: All dashboard sections fetch data in parallel to minimize total load time.

2. **Caching**: Dashboard data is cached for 30 seconds to reduce server load on page refreshes.

3. **Pagination**: Recent bookings limited to 5 items to keep response size small.

4. **Selective Fields**: API responses include only necessary fields to minimize payload size.

### Optimization Techniques

1. **React.memo**: Memoize dashboard sections to prevent unnecessary re-renders.

2. **useMemo/useCallback**: Memoize expensive calculations and callbacks.

3. **Code Splitting**: Lazy load dashboard sections that are below the fold.

4. **Skeleton Loaders**: Display skeleton UI immediately while data loads.

### Performance Targets

- Initial page load: < 2 seconds
- Time to interactive: < 3 seconds
- API response time: < 500ms per endpoint
- Lighthouse performance score: > 90

## Security Considerations

### Authentication & Authorization

1. **Route Protection**: Dashboard route requires authentication.

2. **Company Scope**: All data queries filtered by authenticated user's company ID.

3. **Role Verification**: Only COMPANY_ADMIN role can access dashboard.

### Data Privacy

1. **Sensitive Data**: Financial data (revenue, spending) only visible to company admins.

2. **PII Protection**: Personal information follows GDPR guidelines.

3. **Audit Logging**: Dashboard access logged for security auditing.

## Responsive Design

### Breakpoints

- Mobile: < 768px (single column, stacked sections)
- Tablet: 768px - 1024px (two columns for KPIs, single column for other sections)
- Desktop: > 1024px (multi-column grid layout)

### Mobile Optimizations

1. **Simplified KPIs**: Show only most critical metrics on mobile.

2. **Collapsible Sections**: Actionable items and operations sections collapsible on mobile.

3. **Touch Targets**: All interactive elements minimum 44x44px for touch.

4. **Horizontal Scrolling**: Tables scroll horizontally on small screens.

### Tablet Optimizations

1. **Two-Column KPIs**: Display KPIs in 2-column grid.

2. **Expanded Navigation**: Show more navigation options than mobile.

3. **Optimized Tables**: Show more columns than mobile but fewer than desktop.

## Accessibility

### WCAG 2.1 AA Compliance

1. **Semantic HTML**: Use proper heading hierarchy (h1, h2, h3).

2. **ARIA Labels**: All interactive elements have descriptive labels.

3. **Keyboard Navigation**: Full keyboard support with visible focus indicators.

4. **Color Contrast**: All text meets 4.5:1 contrast ratio minimum.

5. **Screen Reader Support**: Meaningful content announced to screen readers.

### Focus Management

1. **Skip Links**: "Skip to main content" link at page top.

2. **Focus Trapping**: Modals trap focus within them.

3. **Focus Restoration**: Focus returns to trigger element when modals close.

### Alternative Text

1. **Icons**: All icons have aria-label or accompanying text.

2. **Charts**: Data visualizations include text alternatives.

3. **Status Indicators**: Color not the only means of conveying information.

## Design System Integration

### Components Used

- **Card**: For KPI cards and section containers
- **Button**: For action buttons and links
- **Badge**: For status indicators and counts
- **Table**: For recent bookings display
- **Skeleton**: For loading states
- **Grid/Stack**: For layout
- **Container**: For page-level layout

### Design Tokens

- **Colors**: Use semantic color tokens (primary, success, warning, danger)
- **Spacing**: Use spacing scale (xs, sm, md, lg, xl)
- **Typography**: Use typography scale (heading1, heading2, body, caption)
- **Shadows**: Use elevation tokens for card depth

### Custom Components

New dashboard-specific components:

1. **KPICard**: Displays metric with optional trend indicator
2. **ActionableItemCard**: Displays actionable item with priority badge
3. **DashboardSection**: Wrapper for dashboard sections with consistent styling

## Implementation Notes

### Backend Implementation

1. Create new `dashboard.service.ts` that aggregates data from existing services
2. Create new `dashboard.routes.ts` with single `/api/dashboard` endpoint
3. Implement caching layer for dashboard data
4. Add comprehensive error handling for all data aggregation

### Frontend Implementation

1. Create new `DashboardPage.tsx` component
2. Implement custom hooks for data fetching (`useDashboardData`)
3. Create reusable KPI and action item components
4. Integrate with existing design system components
5. Implement responsive layout with CSS Grid/Flexbox
6. Add comprehensive loading and error states

### Migration Strategy

1. Deploy backend changes first (backward compatible)
2. Deploy frontend changes with feature flag
3. Gradually roll out to users
4. Monitor performance and error rates
5. Collect user feedback and iterate

## Future Enhancements

Potential future improvements not in current scope:

1. **Customizable Dashboard**: Allow users to rearrange sections
2. **Data Visualization**: Add charts for revenue trends and utilization over time
3. **Real-time Updates**: WebSocket integration for live booking updates
4. **Export Functionality**: Export dashboard data to PDF/Excel
5. **Comparison Views**: Compare current period to previous period
6. **Predictive Analytics**: ML-based predictions for revenue and utilization
