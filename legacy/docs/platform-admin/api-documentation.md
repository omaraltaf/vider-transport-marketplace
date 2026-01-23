# Platform Admin API Documentation

## Overview

The Platform Admin API provides comprehensive endpoints for managing all aspects of the Vider Transport Marketplace platform. All endpoints require proper authentication and authorization.

## Base URL

```
Production: https://api.vider.no/api/platform-admin
Development: http://localhost:3000/api/platform-admin
```

## Authentication

All API endpoints require JWT authentication with platform admin privileges.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Flow

1. Obtain JWT token through login endpoint
2. Include token in Authorization header for all requests
3. Token expires after 24 hours (configurable)

## Rate Limiting

- **Standard Endpoints**: 100 requests per minute
- **Bulk Operations**: 10 requests per minute
- **Export Operations**: 5 requests per minute

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Additional error details
    }
  }
}
```

## User Management API

### List Users

```http
GET /users
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `search` (string): Search by name or email
- `role` (string): Filter by role (PLATFORM_ADMIN, COMPANY_ADMIN, COMPANY_USER)
- `status` (string): Filter by status (active, suspended, pending)
- `companyId` (string): Filter by company ID
- `sortBy` (string): Sort field (createdAt, name, email)
- `sortOrder` (string): Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "COMPANY_USER",
        "status": "active",
        "companyId": "company-id",
        "company": {
          "id": "company-id",
          "name": "Example Company"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLoginAt": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Get User Details

```http
GET /users/{userId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "COMPANY_USER",
      "status": "active",
      "phone": "+47 123 45 678",
      "emailVerified": true,
      "companyId": "company-id",
      "company": {
        "id": "company-id",
        "name": "Example Company",
        "status": "ACTIVE"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "lastLoginAt": "2024-01-15T10:30:00Z",
      "loginCount": 45,
      "activitySummary": {
        "bookingsCreated": 12,
        "listingsCreated": 3,
        "messagesCount": 89
      }
    }
  }
}
```

### Update User

```http
PUT /users/{userId}
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "role": "COMPANY_ADMIN",
  "status": "active",
  "phone": "+47 123 45 678"
}
```

### Suspend User

```http
PUT /users/{userId}/suspend
```

**Request Body:**
```json
{
  "reason": "Policy violation",
  "duration": 30,
  "notes": "Suspended for 30 days due to policy violation"
}
```

### Bulk User Operations

```http
POST /users/bulk
```

**Request Body:**
```json
{
  "action": "update_role",
  "userIds": ["user-1", "user-2", "user-3"],
  "data": {
    "role": "COMPANY_ADMIN"
  }
}
```

## Company Management API

### List Companies

```http
GET /companies
```

**Query Parameters:**
- `page`, `limit`, `search`, `sortBy`, `sortOrder` (same as users)
- `status` (string): Filter by status (ACTIVE, SUSPENDED, PENDING_VERIFICATION)
- `verified` (boolean): Filter by verification status
- `fylke` (string): Filter by Norwegian county
- `kommune` (string): Filter by Norwegian municipality

### Get Company Details

```http
GET /companies/{companyId}
```

### Verify Company

```http
PUT /companies/{companyId}/verify
```

**Request Body:**
```json
{
  "verified": true,
  "verificationNotes": "All documents verified successfully",
  "status": "ACTIVE"
}
```

### Suspend Company

```http
PUT /companies/{companyId}/suspend
```

**Request Body:**
```json
{
  "reason": "Policy violation",
  "suspensionReason": "Multiple safety violations reported",
  "duration": 60
}
```

## Financial Management API

### Revenue Analytics

```http
GET /financial/revenue
```

**Query Parameters:**
- `startDate` (string): Start date (ISO format)
- `endDate` (string): End date (ISO format)
- `granularity` (string): Data granularity (day, week, month)
- `companyId` (string): Filter by company

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 125000.50,
    "totalCommission": 12500.05,
    "totalTransactions": 1250,
    "averageTransactionValue": 100.00,
    "revenueByPeriod": [
      {
        "period": "2024-01-01",
        "revenue": 5000.00,
        "commission": 500.00,
        "transactions": 50
      }
    ],
    "topCompanies": [
      {
        "companyId": "company-1",
        "companyName": "Top Company",
        "revenue": 15000.00,
        "transactions": 150
      }
    ]
  }
}
```

### Transaction Management

```http
GET /financial/transactions
```

### Process Refund

```http
POST /financial/transactions/{transactionId}/refund
```

**Request Body:**
```json
{
  "amount": 50.00,
  "reason": "Service quality issue",
  "notes": "Partial refund approved by platform admin"
}
```

### Commission Rate Management

```http
GET /financial/commission-rates
POST /financial/commission-rates
PUT /financial/commission-rates/{rateId}
```

## Analytics API

### Platform Analytics Overview

```http
GET /analytics/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 5000,
    "totalCompanies": 500,
    "totalBookings": 12000,
    "totalRevenue": 1200000.00,
    "activeUsers": 2500,
    "activeCompanies": 300,
    "growthMetrics": {
      "userGrowth": 15.5,
      "companyGrowth": 12.3,
      "revenueGrowth": 25.8
    },
    "topMetrics": {
      "topFylke": "Oslo",
      "topVehicleType": "PALLET_8",
      "averageBookingValue": 100.00
    }
  }
}
```

### User Analytics

```http
GET /analytics/users
```

### Geographic Analytics

```http
GET /analytics/geographic
```

### Export Analytics Data

```http
POST /analytics/export
```

**Request Body:**
```json
{
  "type": "user_analytics",
  "format": "csv",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "filters": {
    "fylke": "Oslo",
    "userRole": "COMPANY_USER"
  }
}
```

## Content Moderation API

### Content Review Queue

```http
GET /content-moderation/queue
```

### Review Content

```http
PUT /content-moderation/content/{contentId}/review
```

**Request Body:**
```json
{
  "action": "approve",
  "reason": "Content meets platform guidelines",
  "notes": "Approved after manual review"
}
```

### Blacklist Management

```http
GET /content-moderation/blacklist
POST /content-moderation/blacklist
DELETE /content-moderation/blacklist/{itemId}
```

### Fraud Detection

```http
GET /content-moderation/fraud-detection
PUT /content-moderation/fraud-detection/{alertId}
```

## Security Monitoring API

### Security Dashboard

```http
GET /security/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "securityOverview": {
      "totalEvents": 150,
      "openAlerts": 5,
      "resolvedAlerts": 45,
      "highRiskEvents": 3
    },
    "recentEvents": [
      {
        "id": "event-1",
        "eventType": "FAILED_LOGIN_ATTEMPT",
        "threatLevel": "MEDIUM",
        "timestamp": "2024-01-15T10:30:00Z",
        "userId": "user-1",
        "riskScore": 65
      }
    ],
    "alertsByType": {
      "MULTIPLE_FAILED_LOGINS": 3,
      "SUSPICIOUS_ACTIVITY": 2,
      "PRIVILEGE_ESCALATION": 0
    }
  }
}
```

### Security Events

```http
GET /security/events
```

### Security Alerts

```http
GET /security/alerts
PUT /security/alerts/{alertId}
```

### Audit Logs

```http
GET /security/audit-logs
```

**Query Parameters:**
- `page`, `limit` (pagination)
- `action` (string): Filter by action type
- `entityType` (string): Filter by entity type
- `entityId` (string): Filter by entity ID
- `adminUserId` (string): Filter by admin user
- `startDate`, `endDate` (string): Date range filter

## System Administration API

### System Health

```http
GET /system/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "database": {
        "status": "healthy",
        "responseTime": 15,
        "connections": 25
      },
      "redis": {
        "status": "healthy",
        "responseTime": 5,
        "memory": "256MB"
      },
      "storage": {
        "status": "healthy",
        "diskUsage": "45%"
      }
    },
    "metrics": {
      "cpuUsage": 35.5,
      "memoryUsage": 68.2,
      "activeConnections": 150
    }
  }
}
```

### Configuration Management

```http
GET /system/config
PUT /system/config
```

### Backup Management

```http
GET /system/backups
POST /system/backups
```

### Feature Toggles

```http
GET /system/feature-toggles
PUT /system/feature-toggles/{toggleId}
```

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication token |
| `FORBIDDEN` | Insufficient permissions for the requested action |
| `NOT_FOUND` | Requested resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Internal server error |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | External service unavailable |

## SDK and Client Libraries

### JavaScript/TypeScript SDK

```bash
npm install @vider/platform-admin-sdk
```

```typescript
import { PlatformAdminClient } from '@vider/platform-admin-sdk';

const client = new PlatformAdminClient({
  baseUrl: 'https://api.vider.no',
  apiKey: 'your-api-key'
});

// List users
const users = await client.users.list({
  page: 1,
  limit: 20,
  role: 'COMPANY_USER'
});

// Get user details
const user = await client.users.get('user-id');

// Update user
await client.users.update('user-id', {
  role: 'COMPANY_ADMIN'
});
```

## Webhooks

The Platform Admin API supports webhooks for real-time notifications:

### Webhook Events

- `user.created`
- `user.updated`
- `user.suspended`
- `company.verified`
- `company.suspended`
- `security.alert.created`
- `audit.log.created`

### Webhook Configuration

```http
POST /webhooks
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks/platform-admin",
  "events": ["user.created", "security.alert.created"],
  "secret": "webhook-secret"
}
```

## Testing

### Test Environment

```
Base URL: https://api-test.vider.no/api/platform-admin
```

### Test Data

The test environment includes sample data for testing all API endpoints.

### Postman Collection

Download the complete Postman collection: [Platform Admin API.postman_collection.json](./postman/Platform-Admin-API.postman_collection.json)

## Support

For API support and questions:
- **Documentation**: [https://docs.vider.no/platform-admin](https://docs.vider.no/platform-admin)
- **Support Email**: platform-admin-support@vider.no
- **Developer Portal**: [https://developers.vider.no](https://developers.vider.no)