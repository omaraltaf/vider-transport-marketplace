# Rate Limiting Middleware

This directory contains rate limiting middleware for the Vider Platform API.

## Available Rate Limiters

### 1. Authentication Rate Limiter (`authRateLimiter`)
- **Limit**: 5 requests per IP per 15 minutes
- **Use case**: Protect authentication endpoints (login, register, password reset)
- **Key**: IP address

```typescript
import { authRateLimiter } from './middleware/rate-limit.middleware';

app.post('/api/auth/login', authRateLimiter, loginHandler);
app.post('/api/auth/register', authRateLimiter, registerHandler);
```

### 2. Booking Rate Limiter (`bookingRateLimiter`)
- **Limit**: 20 requests per user per hour
- **Use case**: Prevent booking spam
- **Key**: User ID (falls back to IP if not authenticated)

```typescript
import { bookingRateLimiter } from './middleware/rate-limit.middleware';

app.post('/api/bookings', authenticate, bookingRateLimiter, createBookingHandler);
```

### 3. Search Rate Limiter (`searchRateLimiter`)
- **Limit**: 100 requests per IP per minute
- **Use case**: Protect search endpoints from abuse
- **Key**: IP address

```typescript
import { searchRateLimiter } from './middleware/rate-limit.middleware';

app.get('/api/search', searchRateLimiter, searchHandler);
```

### 4. Custom Rate Limiter Factory (`createRateLimiter`)
Create custom rate limiters with specific parameters:

```typescript
import { createRateLimiter } from './middleware/rate-limit.middleware';

const customLimiter = createRateLimiter(
  60000,  // windowMs: 1 minute
  50,     // max: 50 requests
  'Too many requests to this endpoint',  // message
  false   // useUserId: false (use IP)
);

app.get('/api/custom', customLimiter, customHandler);
```

## Features

- **HTTP 429 Response**: Returns proper status code when limit is exceeded
- **Retry-After Header**: Includes information about when to retry
- **Logging**: Logs all rate limit violations with context
- **Test Environment Skip**: Automatically disabled in test environment
- **Standard Headers**: Uses modern RateLimit-* headers

## Error Response Format

When rate limit is exceeded:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many authentication attempts. Please try again later.",
    "retryAfter": "900"
  }
}
```

## Requirements Validation

This implementation validates:
- **Requirement 19.1**: Authentication endpoint rate limiting (5 per IP per 15 min)
- **Requirement 19.2**: Booking creation rate limiting (20 per user per hour)
- **Requirement 19.3**: Search endpoint rate limiting (100 per IP per minute)
- **Requirement 19.4**: HTTP 429 response on limit exceeded
- **Requirement 19.5**: Rate limit event logging

## Testing

Property-based tests validate:
- Middleware functions are properly exported
- Requests pass through in test environment
- Custom rate limiters work correctly
- Configuration constants are accurate
- Error responses have correct structure

Run tests:
```bash
npm test src/middleware/rate-limit.middleware.test.ts
```
