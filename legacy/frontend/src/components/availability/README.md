# Availability Calendar Components

This directory contains components for managing and displaying listing availability calendars.

## CalendarView

A comprehensive calendar component for viewing and managing listing availability.

### Features

- **Month View**: Displays a full month calendar with date grid
- **Visual Status Indicators**: 
  - Available dates (white background)
  - Blocked dates (yellow/warning background)
  - Booked dates (blue/info background)
- **Date Selection**: Allows users to select date ranges for booking (in view mode)
- **Month Navigation**: Previous/Next buttons to navigate between months
- **Hover Tooltips**: Shows detailed information on hover (block reason, booking number)
- **Keyboard Navigation**: Full keyboard support with Enter/Space keys
- **Accessibility**: WCAG 2.1 AA compliant with proper ARIA labels
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Loading State**: Shows loading overlay during data fetching

### Usage

```tsx
import { CalendarView, CalendarDay } from '@/components/availability';

const calendarData: CalendarDay[] = [
  {
    date: new Date(2024, 0, 15),
    status: 'available',
  },
  {
    date: new Date(2024, 0, 16),
    status: 'blocked',
    blockReason: 'Maintenance',
  },
  {
    date: new Date(2024, 0, 17),
    status: 'booked',
    bookingNumber: 'BK-001',
  },
];

function MyComponent() {
  const handleDateSelect = (startDate: Date, endDate: Date) => {
    console.log('Selected range:', startDate, endDate);
  };

  const handleMonthChange = (year: number, month: number) => {
    // Fetch new calendar data for the selected month
  };

  return (
    <CalendarView
      listingId="listing-123"
      listingType="vehicle"
      mode="view" // or "manage" for providers
      calendarData={calendarData}
      onDateSelect={handleDateSelect}
      onMonthChange={handleMonthChange}
      loading={false}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `listingId` | `string` | Yes | ID of the listing |
| `listingType` | `'vehicle' \| 'driver'` | Yes | Type of listing |
| `mode` | `'view' \| 'manage'` | Yes | View mode for renters, manage mode for providers |
| `calendarData` | `CalendarDay[]` | No | Array of calendar day data with status |
| `onDateSelect` | `(startDate: Date, endDate: Date) => void` | No | Callback when date range is selected |
| `onMonthChange` | `(year: number, month: number) => void` | No | Callback when month is changed |
| `loading` | `boolean` | No | Shows loading overlay |
| `className` | `string` | No | Additional CSS classes |

### CalendarDay Interface

```typescript
interface CalendarDay {
  date: Date;
  status: 'available' | 'blocked' | 'booked';
  blockReason?: string;
  bookingId?: string;
  bookingNumber?: string;
}
```

### Accessibility Features

- Full keyboard navigation support
- ARIA labels for all interactive elements
- Screen reader announcements for date status
- Focus management with visible indicators
- Color-independent status indicators (uses badges)

### Responsive Breakpoints

- **Mobile** (< 480px): Compact layout with smaller cells
- **Tablet** (480px - 768px): Medium-sized cells
- **Desktop** (> 768px): Full-sized cells with hover effects

### Design System Integration

The component uses the following design system components:
- `Card` - Container wrapper
- `Button` - Navigation buttons
- `Badge` - Status indicators

And follows design system tokens for:
- Colors (primary, gray, semantic colors)
- Spacing
- Typography
- Border radius
- Shadows

### Testing

The component includes comprehensive unit tests covering:
- Rendering and display
- Date selection logic
- Navigation functionality
- Keyboard accessibility
- ARIA labels
- Loading states
- Blocked/booked date handling

Run tests with:
```bash
npm test src/components/availability/CalendarView.test.tsx
```


## BlockForm

A form component for creating availability blocks (blocking dates on the calendar).

### Features

- **Date Range Picker**: Select start and end dates
- **Validation**: Ensures start date ≤ end date
- **Optional Reason**: Text field for explaining why dates are blocked
- **Conflict Detection**: Shows conflicts with existing bookings
- **Error Display**: Clear error messages with visual indicators
- **Loading State**: Disables form during submission
- **Responsive Design**: Mobile-friendly layout

### Usage

```tsx
import { BlockForm, AvailabilityBlock } from '@/components/availability';

function MyComponent() {
  const handleBlockCreated = (block: AvailabilityBlock) => {
    console.log('Block created:', block);
    // Refresh calendar or show success message
  };

  const handleCancel = () => {
    // Close form or navigate away
  };

  return (
    <BlockForm
      listingId="listing-123"
      listingType="vehicle"
      onBlockCreated={handleBlockCreated}
      onCancel={handleCancel}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `listingId` | `string` | Yes | ID of the listing |
| `listingType` | `'vehicle' \| 'driver'` | Yes | Type of listing |
| `onBlockCreated` | `(block: AvailabilityBlock) => void` | Yes | Callback when block is successfully created |
| `onCancel` | `() => void` | Yes | Callback when form is cancelled |
| `className` | `string` | No | Additional CSS classes |

### AvailabilityBlock Interface

```typescript
interface AvailabilityBlock {
  id: string;
  listingId: string;
  listingType: 'vehicle' | 'driver';
  startDate: string;
  endDate: string;
  reason?: string;
  isRecurring: boolean;
  recurringBlockId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### Validation Rules

1. **Start Date**: Required field
2. **End Date**: Required field, must be ≥ start date
3. **Reason**: Optional text field
4. **Booking Conflicts**: Cannot block dates with accepted/active bookings

### Error Handling

The component displays different types of errors:
- **Validation Errors**: Shown inline below each field
- **Conflict Errors**: Displayed in a warning box with conflict details
- **API Errors**: Shown in an error alert at the top of the form

### API Integration

Makes POST request to `/api/availability/blocks` with:
```json
{
  "listingId": "string",
  "listingType": "vehicle" | "driver",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "reason": "string (optional)"
}
```

Requires authentication token from localStorage.

## BlockList

A component for displaying and managing existing availability blocks.

### Features

- **List View**: Shows all blocks for a listing
- **Past Block Indicator**: Visual distinction for past blocks
- **Recurring Badge**: Shows which blocks are recurring
- **Delete Functionality**: Delete blocks with confirmation modal
- **Date Formatting**: Human-readable date ranges
- **Loading State**: Spinner during data fetch
- **Error State**: Error message with retry button
- **Empty State**: Friendly message when no blocks exist

### Usage

```tsx
import { BlockList } from '@/components/availability';

function MyComponent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleBlockDeleted = (blockId: string) => {
    console.log('Block deleted:', blockId);
    // Refresh calendar or show success message
  };

  return (
    <BlockList
      listingId="listing-123"
      listingType="vehicle"
      onBlockDeleted={handleBlockDeleted}
      refreshTrigger={refreshTrigger}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `listingId` | `string` | Yes | ID of the listing |
| `listingType` | `'vehicle' \| 'driver'` | Yes | Type of listing |
| `onBlockDeleted` | `(blockId: string) => void` | No | Callback when block is deleted |
| `refreshTrigger` | `number` | No | Increment to trigger data refresh |
| `className` | `string` | No | Additional CSS classes |

### Features

- **Automatic Sorting**: Blocks sorted by start date (most recent first)
- **Past Block Detection**: Automatically marks blocks in the past
- **Delete Confirmation**: Modal dialog before deletion
- **Responsive Layout**: Stacks on mobile, side-by-side on desktop

### API Integration

- **GET** `/api/availability/blocks/:listingId?listingType=vehicle|driver` - Fetch blocks
- **DELETE** `/api/availability/blocks/:blockId` - Delete block

Both require authentication token from localStorage.

## Complete Example

Here's a complete example showing all three components working together:

```tsx
import { useState, useEffect } from 'react';
import { CalendarView, BlockForm, BlockList, CalendarDay, AvailabilityBlock } from '@/components/availability';
import { Button } from '@/design-system/components/Button';

function ListingAvailabilityManagement({ listingId, listingType }) {
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch calendar data when month changes
  useEffect(() => {
    fetchCalendarData(currentMonth.getFullYear(), currentMonth.getMonth());
  }, [currentMonth, refreshTrigger]);

  const fetchCalendarData = async (year: number, month: number) => {
    // Fetch from API
    const response = await fetch(
      `/api/availability/calendar/${listingId}?year=${year}&month=${month}&listingType=${listingType}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    );
    const data = await response.json();
    setCalendarData(data.calendar);
  };

  const handleBlockCreated = (block: AvailabilityBlock) => {
    setShowBlockForm(false);
    setRefreshTrigger(prev => prev + 1);
    // Show success toast
  };

  const handleBlockDeleted = (blockId: string) => {
    setRefreshTrigger(prev => prev + 1);
    // Show success toast
  };

  const handleMonthChange = (year: number, month: number) => {
    setCurrentMonth(new Date(year, month, 1));
  };

  return (
    <div className="availability-management">
      <h1>Manage Availability</h1>
      
      {/* Calendar View */}
      <section>
        <h2>Calendar</h2>
        <CalendarView
          listingId={listingId}
          listingType={listingType}
          mode="manage"
          calendarData={calendarData}
          onMonthChange={handleMonthChange}
        />
      </section>

      {/* Block Form */}
      <section>
        <h2>Block Dates</h2>
        {showBlockForm ? (
          <BlockForm
            listingId={listingId}
            listingType={listingType}
            onBlockCreated={handleBlockCreated}
            onCancel={() => setShowBlockForm(false)}
          />
        ) : (
          <Button onClick={() => setShowBlockForm(true)}>
            Add Availability Block
          </Button>
        )}
      </section>

      {/* Block List */}
      <section>
        <h2>Existing Blocks</h2>
        <BlockList
          listingId={listingId}
          listingType={listingType}
          onBlockDeleted={handleBlockDeleted}
          refreshTrigger={refreshTrigger}
        />
      </section>
    </div>
  );
}
```

## Testing

All components include comprehensive unit tests:

```bash
# Run all availability component tests
npm test src/components/availability/

# Run specific component tests
npm test src/components/availability/CalendarView.test.tsx
npm test src/components/availability/BlockForm.test.tsx
npm test src/components/availability/BlockList.test.tsx
```

## AnalyticsDashboard

A comprehensive analytics dashboard for viewing listing availability statistics and insights.

### Features

- **Time Period Selector**: View analytics for week, month, or year
- **Summary Cards**: Display total, blocked, booked, and available days
- **Blocked Days Chart**: Visual bar chart showing percentage of blocked days
- **Booked vs Available Chart**: Comparison chart for booked and available days
- **Utilization Rate**: Circular progress indicator showing booking utilization
- **Insights**: Automated insights and recommendations based on data
- **Responsive Design**: Optimized for all screen sizes
- **Loading State**: Spinner during data fetch
- **Error Handling**: Error state with retry functionality

### Usage

```tsx
import { AnalyticsDashboard } from '@/components/availability';

function MyComponent() {
  return (
    <AnalyticsDashboard
      listingId="listing-123"
      listingType="vehicle"
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `listingId` | `string` | Yes | ID of the listing |
| `listingType` | `'vehicle' \| 'driver'` | Yes | Type of listing |
| `className` | `string` | No | Additional CSS classes |

### Analytics Data

The component displays the following metrics:

1. **Total Days**: Total number of days in the selected period
2. **Blocked Days**: Number of days blocked by provider
3. **Booked Days**: Number of days with confirmed bookings
4. **Available Days**: Number of days available for booking
5. **Blocked Percentage**: Percentage of total days that are blocked
6. **Utilization Rate**: Percentage of available days that are booked

### Insights

The dashboard automatically generates insights based on the data:

- **High Block Rate**: Warning when >30% of days are blocked
- **Low Utilization**: Info when utilization is <40%
- **High Demand**: Success message when utilization is ≥80%
- **No Availability**: Error when all days are blocked

### Time Periods

- **Week**: Last 7 days
- **Month**: Last 30 days
- **Year**: Last 365 days

### API Integration

Makes GET request to `/api/availability/analytics/:listingId` with query parameters:
- `listingType`: vehicle or driver
- `startDate`: ISO date string
- `endDate`: ISO date string

Requires authentication token from localStorage.

### Visual Components

1. **Bar Chart**: Shows blocked percentage with gradient fill
2. **Comparison Bars**: Side-by-side comparison of booked vs available
3. **Circular Progress**: SVG-based circular indicator for utilization rate
4. **Insight Cards**: Color-coded cards with badges and descriptions

### Responsive Behavior

- **Desktop**: Full layout with side-by-side charts
- **Tablet**: Stacked charts with adjusted sizing
- **Mobile**: Single column layout with smaller visualizations

## Requirements Validation

These components satisfy the following requirements from the specification:

- **Requirement 1.1**: Block specific dates on calendar ✓
- **Requirement 1.2**: Store start date, end date, and optional reason ✓
- **Requirement 1.3**: Display blocked dates visually distinct ✓
- **Requirement 1.4**: Validate start date ≤ end date ✓
- **Requirement 1.5**: Allow blocking past dates for record-keeping ✓
- **Requirement 1.6**: Check for conflicts with existing bookings ✓
- **Requirement 9.1**: Display percentage of days blocked vs available ✓
- **Requirement 9.2**: Show number of days booked vs available ✓
- **Requirement 9.3**: Calculate utilization rate over different time periods ✓
