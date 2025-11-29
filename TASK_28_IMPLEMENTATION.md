# Task 28: Frontend - Search and Filtering Implementation

## Overview
Implemented comprehensive search and filtering functionality for the Vider marketplace platform, allowing users to search for vehicle and driver listings with multiple filter options.

## Backend Changes

### 1. Search Endpoint (`src/routes/listing.routes.ts`)
Added `GET /api/listings/search` endpoint that supports:
- Listing type filtering (vehicle, driver, vehicle_driver)
- Location filtering (Fylke, Kommune, radius with coordinates)
- Vehicle type filtering (multiple selection)
- Fuel type filtering (multiple selection)
- Capacity range filtering
- Price range filtering
- Date range availability filtering
- With/without driver filtering
- Tags filtering (multiple selection)
- Pagination (page, pageSize)
- Sorting (sortBy: price/rating/distance, sortOrder: asc/desc)

The endpoint uses the existing `listingService.searchListings()` method which implements:
- Filter conjunction (AND logic) - all filters must match
- Location-based search with Fylke, Kommune, and radius support
- Availability checking against existing bookings
- Proper sorting by price, rating, or distance

## Frontend Changes

### 1. Search Page Component (`frontend/src/pages/SearchPage.tsx`)
Created a comprehensive search page with:

**Filter Panel (Sticky Sidebar):**
- Listing Type selector (All Types, Vehicle Only, Driver Only, Vehicle + Driver)
- Location filters:
  - Fylke dropdown (11 Norwegian counties)
  - Kommune text input
- Vehicle Type checkboxes (8-pallet, 18-pallet, 21-pallet, Trailer, Other)
- Fuel Type checkboxes (Electric, Biogas, Diesel, Gas)
- Capacity range inputs (min/max pallets)
- Price range inputs (min/max NOK)
- Date range inputs (start/end dates for availability)
- Driver Option selector (Any, With Driver, Without Driver)
- Features/Tags checkboxes (tail-lift, refrigerated, ADR-certified, GPS-tracked, temperature-controlled)
- Clear all filters button

**Results Section:**
- Sorting controls (Sort by: Price/Rating/Distance, Order: Ascending/Descending)
- Loading state with spinner
- Error state with error message
- No results state with helpful message
- Vehicle listings grid with cards showing:
  - Photos (or placeholder)
  - Title and verification badge
  - Description
  - Location (city, fylke)
  - Vehicle details (type, capacity, fuel type)
  - Pricing (hourly/daily rates)
  - Company rating
  - Service offerings badges (With Driver, Without Driver)
  - Feature tags
- Driver listings grid with cards showing:
  - Name and verification badge
  - Background summary
  - License class
  - Languages spoken
  - Company location
  - Pricing
  - Rating
- Pagination controls with page numbers

**Features:**
- URL-based state management (filters persist in URL)
- Responsive design (mobile-friendly with collapsible filters)
- Real-time search (updates on filter change)
- Debounced API calls via React Query
- Proper loading and error states

### 2. App Routing (`frontend/src/App.tsx`)
- Added `/search` route for the SearchPage component
- Route is publicly accessible (no authentication required)

### 3. Navigation (`frontend/src/components/Navbar.tsx`)
- Search link already present in both desktop and mobile navigation

## Testing
All existing tests pass, including:
- Property 13: Search filter conjunction (validates AND logic)
- Property 14: Location-based search accuracy (validates Fylke, Kommune, radius filtering)

## Requirements Validated
This implementation satisfies:
- **Requirement 6.1**: Search by vehicle-only, driver-only, or vehicle-plus-driver
- **Requirement 6.2**: Location filtering by Fylke, Kommune, and radius
- **Requirement 6.3**: Attribute filtering (Vehicle Type, Fuel Type, Capacity, Date Range, Price Range, With/Without Driver)
- **Requirement 6.4**: Filter conjunction (AND logic) - all filters must match
- **Requirement 6.5**: Display key listing information in search results

## API Usage Example
```
GET /api/listings/search?listingType=vehicle&fylke=Oslo&minPrice=500&maxPrice=2000&vehicleType=PALLET_18&fuelType=ELECTRIC&withDriver=true&sortBy=price&sortOrder=asc&page=1&pageSize=20
```

## Notes
- The search endpoint is public and doesn't require authentication
- Filters use AND logic - all specified filters must match
- Only ACTIVE listings are returned in search results
- Driver listings must be verified to appear in search results
- Date range filtering checks for booking conflicts
- Radius search requires coordinates (longitude, latitude)
- Pagination defaults to page 1, pageSize 20
- Sorting defaults to price ascending
