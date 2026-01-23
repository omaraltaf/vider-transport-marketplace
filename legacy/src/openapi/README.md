# Vider API Documentation

This directory contains the OpenAPI 3.0 specification for the Vider Transport Marketplace API.

## Overview

The OpenAPI specification provides comprehensive documentation for all API endpoints, including:
- Request/response schemas
- Authentication requirements
- Data models with field types and constraints
- Error responses
- Query parameters and path parameters

## Accessing the Documentation

### Swagger UI (Interactive Documentation)

When the server is running, you can access the interactive Swagger UI documentation at:

```
http://localhost:3000/api-docs
```

The Swagger UI provides:
- Interactive API exploration
- Try-it-out functionality for testing endpoints
- Complete schema documentation
- Example requests and responses

### OpenAPI JSON Specification

The raw OpenAPI specification in JSON format is available at:

```
http://localhost:3000/api-docs.json
```

This can be imported into tools like:
- Postman
- Insomnia
- API testing frameworks
- Code generators

## File Structure

- `spec.ts` - Main OpenAPI specification document that combines all components
- `schemas.ts` - Data model schemas (User, Company, Booking, etc.)
- `paths.ts` - API endpoint definitions with operations
- `responses.ts` - Reusable response definitions for common HTTP status codes
- `spec.test.ts` - Tests to verify the specification is complete and valid

## Key Features

### Authentication

The API uses JWT Bearer token authentication. Protected endpoints require the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Data Models

All data models are fully documented with:
- Required fields
- Field types (string, integer, boolean, etc.)
- Format specifications (uuid, email, date-time, etc.)
- Constraints (min/max values, patterns, enums)
- Relationships between models

### Error Handling

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {},
    "requestId": "unique-request-id"
  }
}
```

Common error codes:
- `INVALID_INPUT` (400) - Invalid request data
- `AUTHENTICATION_REQUIRED` (401) - Missing or invalid authentication
- `INSUFFICIENT_PERMISSIONS` (403) - User lacks required permissions
- `RESOURCE_NOT_FOUND` (404) - Requested resource doesn't exist
- `EMAIL_ALREADY_EXISTS` (409) - Conflict with existing data
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new company account
- `POST /api/auth/verify-email` - Verify email address
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Companies
- `GET /api/companies/{id}` - Get company profile
- `PUT /api/companies/{id}` - Update company profile
- `POST /api/companies/{id}/verify` - Verify company (admin only)
- `DELETE /api/companies/{id}/verify` - Remove verification (admin only)

### Listings
- `POST /api/listings/vehicles` - Create vehicle listing
- `GET /api/listings/vehicles` - Search vehicle listings
- `POST /api/listings/drivers` - Create driver listing

### Bookings
- `POST /api/bookings` - Create booking request
- `GET /api/bookings` - List bookings
- `GET /api/bookings/{id}` - Get booking details
- `POST /api/bookings/{id}/accept` - Accept booking
- `POST /api/bookings/{id}/decline` - Decline booking

### Ratings
- `POST /api/ratings` - Submit rating and review

### Messaging
- `GET /api/messages/threads/{threadId}/messages` - Get messages
- `POST /api/messages/threads/{threadId}/messages` - Send message

### Notifications
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences

### GDPR
- `POST /api/gdpr/export` - Export user data
- `POST /api/gdpr/delete` - Delete user account

### Admin
- `GET /api/admin/analytics` - Get platform analytics

### Health
- `GET /health` - System health check

## Rate Limiting

The API implements rate limiting on critical endpoints:
- Authentication endpoints: 5 requests per IP per 15 minutes
- Booking creation: 20 requests per user per hour
- Search endpoints: 100 requests per IP per minute

When rate limits are exceeded, the API returns HTTP 429 with retry-after information.

## Validation

All request data is validated against the schemas defined in the OpenAPI specification. Invalid requests return HTTP 400 with detailed validation errors.

## Testing

Run the specification tests to verify completeness:

```bash
npm test src/openapi/spec.test.ts
```

## Updating the Specification

When adding new endpoints or modifying existing ones:

1. Update the appropriate file (`schemas.ts`, `paths.ts`, or `responses.ts`)
2. Run the tests to ensure the specification is valid
3. Restart the server to see changes in Swagger UI
4. Update this README if adding new major features

## Requirements Validation

This OpenAPI specification satisfies the following requirements:

- **Requirement 16.1**: Complete OpenAPI specification document provided
- **Requirement 16.2**: All endpoints documented with request parameters, response schemas, and authentication requirements
- **Requirement 16.3**: All data models documented with field types, constraints, and relationships
