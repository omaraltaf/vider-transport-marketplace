# Vider Platform API Documentation

## Overview

The Vider Platform API is a RESTful API that provides comprehensive functionality for vehicle and driver rental management. All endpoints return JSON responses and use standard HTTP status codes.

**Base URL**: `https://your-domain.com/api`
**Version**: v1
**Authentication**: JWT Bearer tokens

## Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "COMPANY_ADMIN",
      "firstName": "John",
      "lastName": "Doe",
      "company": {
        "id": "uuid",
        "name": "Company Name"
      }
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token"
    }
  }
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

## User Roles

- **PLATFORM_ADMIN**: Full platform access
- **COMPANY_ADMIN**: Company management and user administration
- **COMPANY_USER**: Standard user within a company

## Core Endpoints

### Companies

#### Get Company Profile
```http
GET /api/companies/profile
Authorization: Bearer <access-token>
```

#### Update Company
```http
PUT /api/companies/profile
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Updated Company Name",
  "description": "Company description",
  "businessAddress": "Address",
  "city": "Oslo",
  "postalCode": "0001"
}
```

#### Get Company Listings
```http
GET /api/companies/listings?type=vehicle&status=ACTIVE
Authorization: Bearer <access-token>
```

### Vehicle Listings

#### Search Vehicles
```http
GET /api/listings/vehicles/search?location=Oslo&vehicleType=PALLET_18&startDate=2024-01-01&endDate=2024-01-07
```

**Query Parameters**:
- `location` (string): City or region
- `vehicleType` (enum): PALLET_8, PALLET_18, PALLET_21, TRAILER, OTHER
- `startDate` (ISO date): Rental start date
- `endDate` (ISO date): Rental end date
- `minPrice` (number): Minimum daily rate
- `maxPrice` (number): Maximum daily rate
- `withDriver` (boolean): Include driver
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "uuid",
        "title": "18-pallet truck available",
        "description": "Modern truck with hydraulic lift",
        "vehicleType": "PALLET_18",
        "capacity": 18,
        "dailyRate": 1500,
        "hourlyRate": 200,
        "currency": "NOK",
        "city": "Oslo",
        "withDriver": true,
        "withDriverDailyRate": 2000,
        "photos": ["url1", "url2"],
        "company": {
          "id": "uuid",
          "name": "Transport AS",
          "aggregatedRating": 4.5,
          "totalRatings": 23
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### Create Vehicle Listing
```http
POST /api/listings/vehicles
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "18-pallet truck for rent",
  "description": "Modern truck with hydraulic lift",
  "vehicleType": "PALLET_18",
  "capacity": 18,
  "fuelType": "DIESEL",
  "city": "Oslo",
  "fylke": "Oslo",
  "kommune": "Oslo",
  "dailyRate": 1500,
  "hourlyRate": 200,
  "deposit": 5000,
  "withDriver": true,
  "withDriverDailyRate": 2000,
  "withoutDriver": true
}
```

#### Update Vehicle Listing
```http
PUT /api/listings/vehicles/:id
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Updated title",
  "dailyRate": 1600
}
```

#### Delete Vehicle Listing
```http
DELETE /api/listings/vehicles/:id
Authorization: Bearer <access-token>
```

### Driver Listings

#### Search Drivers
```http
GET /api/listings/drivers/search?location=Bergen&licenseClass=C&startDate=2024-01-01&endDate=2024-01-07
```

#### Create Driver Listing
```http
POST /api/listings/drivers
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Experienced Driver",
  "licenseClass": "C",
  "languages": ["Norwegian", "English"],
  "backgroundSummary": "10 years experience",
  "dailyRate": 2000,
  "hourlyRate": 250
}
```

### Bookings

#### Create Booking Request
```http
POST /api/bookings
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "vehicleListingId": "uuid",
  "startDate": "2024-01-01T08:00:00Z",
  "endDate": "2024-01-07T18:00:00Z",
  "durationDays": 7,
  "message": "Need truck for delivery route"
}
```

#### Get User Bookings
```http
GET /api/bookings?status=PENDING&role=renter
Authorization: Bearer <access-token>
```

#### Respond to Booking
```http
PUT /api/bookings/:id/respond
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "action": "ACCEPT",
  "message": "Booking confirmed"
}
```

#### Complete Booking
```http
PUT /api/bookings/:id/complete
Authorization: Bearer <access-token>
```

### Availability Management

#### Get Availability Calendar
```http
GET /api/availability/calendar/:listingId?listingType=vehicle&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <access-token>
```

#### Create Availability Block
```http
POST /api/availability/blocks
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "listingId": "uuid",
  "listingType": "vehicle",
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-20T23:59:59Z",
  "reason": "Maintenance"
}
```

#### Create Recurring Block
```http
POST /api/availability/recurring-blocks
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "listingId": "uuid",
  "listingType": "vehicle",
  "daysOfWeek": [0, 6],
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "reason": "Weekends unavailable"
}
```

### Messages

#### Get Message Threads
```http
GET /api/messages/threads
Authorization: Bearer <access-token>
```

#### Send Message
```http
POST /api/messages
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "threadId": "uuid",
  "content": "Message content"
}
```

#### Mark Messages as Read
```http
PUT /api/messages/threads/:threadId/read
Authorization: Bearer <access-token>
```

### Ratings & Reviews

#### Create Rating
```http
POST /api/ratings
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "bookingId": "uuid",
  "companyStars": 5,
  "companyReview": "Excellent service",
  "driverStars": 4,
  "driverReview": "Professional driver"
}
```

#### Get Company Ratings
```http
GET /api/ratings/company/:companyId
```

### File Uploads

#### Upload Files
```http
POST /api/uploads
Authorization: Bearer <access-token>
Content-Type: multipart/form-data

files: [file1, file2]
```

**Response**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "filename": "original-name.jpg",
        "path": "/uploads/uuid-filename.jpg",
        "size": 1024000,
        "mimetype": "image/jpeg"
      }
    ]
  }
}
```

## Platform Administration

### User Management

#### Get All Users (Admin only)
```http
GET /api/admin/users?page=1&limit=50&role=COMPANY_ADMIN
Authorization: Bearer <admin-token>
```

#### Update User Role (Admin only)
```http
PUT /api/admin/users/:id/role
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "role": "COMPANY_ADMIN"
}
```

### Company Management

#### Get All Companies (Admin only)
```http
GET /api/admin/companies?status=PENDING_VERIFICATION
Authorization: Bearer <admin-token>
```

#### Verify Company (Admin only)
```http
PUT /api/admin/companies/:id/verify
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "verified": true,
  "notes": "All documents verified"
}
```

### Platform Configuration

#### Get Platform Config (Admin only)
```http
GET /api/admin/config
Authorization: Bearer <admin-token>
```

#### Update Platform Config (Admin only)
```http
PUT /api/admin/config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "commissionRate": 5.5,
  "taxRate": 25,
  "bookingTimeoutHours": 48
}
```

### Analytics & Reporting

#### Get Platform Analytics (Admin only)
```http
GET /api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <admin-token>
```

#### Get Financial Report (Admin only)
```http
GET /api/admin/reports/financial?period=monthly&year=2024
Authorization: Bearer <admin-token>
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "message": "Invalid email format"
    }
  }
}
```

### Common Error Codes
- `AUTHENTICATION_REQUIRED` (401): Missing or invalid token
- `INSUFFICIENT_PERMISSIONS` (403): User lacks required permissions
- `RESOURCE_NOT_FOUND` (404): Requested resource doesn't exist
- `VALIDATION_ERROR` (400): Invalid input data
- `CONFLICT` (409): Resource conflict (e.g., booking overlap)
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error

## Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 login attempts per 15 minutes per IP
- **File Upload**: 10 uploads per hour per user

## Pagination

Most list endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Webhooks (Coming Soon)

The platform will support webhooks for real-time notifications:
- Booking status changes
- Payment confirmations
- Rating submissions
- System alerts

## SDK & Libraries

Official SDKs are planned for:
- JavaScript/TypeScript
- Python
- PHP

## Support

For API support:
- Email: api-support@vider.no
- Documentation: https://docs.vider.no
- Status Page: https://status.vider.no

---

**API Version**: 1.0
**Last Updated**: December 2024
**Status**: Production Ready