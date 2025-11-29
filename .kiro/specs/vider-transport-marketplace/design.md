# Design Document

## Overview

Vider is a peer-to-peer marketplace platform built with a modern, API-first architecture. The system enables Norwegian transport companies to rent vehicles and drivers to one another through a secure, transparent, and user-friendly platform. The design emphasizes role-based access control, data integrity, GDPR compliance, and a seamless user experience across desktop and mobile devices.

### Key Design Principles

1. **API-First Architecture**: All functionality exposed through a well-documented REST API
2. **Security by Default**: Server-side authorization, secure authentication, and rate limiting
3. **Data Integrity**: Transactional consistency for bookings and financial calculations
4. **Scalability**: Stateless API design supporting horizontal scaling
5. **Maintainability**: Clear separation of concerns with modular component design

## Architecture

### System Architecture

The platform follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│                     Client Layer                         │
│  (React SPA - Desktop & Mobile Responsive)              │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/REST
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   API Layer (Node.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Service │  │ Booking Svc  │  │ Payment Svc  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Listing Svc  │  │ Rating Svc   │  │ Message Svc  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ SQL
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Data Layer (PostgreSQL)                     │
│  - Relational data with ACID guarantees                 │
│  - Full-text search capabilities                        │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack


**Backend:**
- Runtime: Node.js (v20+)
- Framework: Express.js or Fastify
- Language: TypeScript
- Database: PostgreSQL 15+
- ORM: Prisma or TypeORM
- Authentication: JWT with refresh tokens
- Validation: Zod or Joi
- Testing: Jest + Supertest

**Frontend:**
- Framework: React 18+ with TypeScript
- Build Tool: Vite
- Routing: React Router v6
- State Management: React Query + Context API
- UI Components: Tailwind CSS + Headless UI
- Forms: React Hook Form + Zod
- Testing: Vitest + React Testing Library

**Infrastructure:**
- API Documentation: OpenAPI 3.0 (Swagger)
- File Storage: Local filesystem or S3-compatible storage
- Email: SMTP service (SendGrid, AWS SES, or similar)
- CI/CD: GitHub Actions
- Logging: Winston or Pino
- Rate Limiting: express-rate-limit or similar

## Components and Interfaces

### Core Services

#### 1. Authentication Service


**Responsibilities:**
- User registration and email verification
- Password hashing (bcrypt with salt rounds ≥ 12)
- JWT token generation and validation
- Refresh token rotation
- Session management

**Key Interfaces:**
```typescript
interface AuthService {
  register(data: CompanyRegistrationData): Promise<{ userId: string, verificationToken: string }>
  verifyEmail(token: string): Promise<void>
  login(email: string, password: string): Promise<{ accessToken: string, refreshToken: string }>
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }>
  logout(userId: string): Promise<void>
  resetPassword(email: string): Promise<void>
}
```

#### 2. Authorization Service

**Responsibilities:**
- Role-based access control (RBAC)
- Permission checking middleware
- Company-scoped authorization
- Admin privilege verification

**Key Interfaces:**
```typescript
interface AuthorizationService {
  checkRole(userId: string, requiredRole: Role): Promise<boolean>
  checkCompanyAccess(userId: string, companyId: string): Promise<boolean>
  checkResourceOwnership(userId: string, resourceId: string, resourceType: string): Promise<boolean>
}

enum Role {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  COMPANY_USER = 'COMPANY_USER'
}
```

#### 3. Listing Service


**Responsibilities:**
- CRUD operations for vehicle and driver listings
- Photo upload and management
- Listing search with filters
- Availability calendar management
- Verification badge management

**Key Interfaces:**
```typescript
interface ListingService {
  createVehicleListing(data: VehicleListingData): Promise<VehicleListing>
  createDriverListing(data: DriverListingData): Promise<DriverListing>
  updateListing(listingId: string, data: Partial<ListingData>): Promise<Listing>
  deleteListing(listingId: string): Promise<void>
  searchListings(filters: SearchFilters): Promise<SearchResults>
  checkAvailability(listingId: string, startDate: Date, endDate: Date): Promise<boolean>
  blockAvailability(listingId: string, startDate: Date, endDate: Date): Promise<void>
}

interface SearchFilters {
  listingType?: 'vehicle' | 'driver' | 'vehicle_driver'
  location?: { fylke?: string, kommune?: string, radius?: number, coordinates?: [number, number] }
  vehicleType?: string[]
  fuelType?: string[]
  capacity?: { min?: number, max?: number }
  priceRange?: { min?: number, max?: number }
  dateRange?: { start: Date, end: Date }
  withDriver?: boolean
  tags?: string[]
}
```

#### 4. Booking Service


**Responsibilities:**
- Booking request creation and validation
- Booking lifecycle state management
- Cost calculation (provider rate, commission, taxes)
- Auto-expiration of pending requests
- Contract generation (PDF)
- Peer-to-peer validation (prevent self-booking)

**Key Interfaces:**
```typescript
interface BookingService {
  createBookingRequest(data: BookingRequestData): Promise<Booking>
  acceptBooking(bookingId: string, providerId: string): Promise<Booking>
  declineBooking(bookingId: string, providerId: string, reason?: string): Promise<Booking>
  proposeNewTerms(bookingId: string, providerId: string, newTerms: BookingTerms): Promise<Booking>
  calculateCosts(listingId: string, duration: Duration): Promise<CostBreakdown>
  transitionBookingState(bookingId: string, newState: BookingStatus): Promise<Booking>
  generateContract(bookingId: string): Promise<Buffer>
  autoExpireBookings(): Promise<void>
}

interface CostBreakdown {
  providerRate: number
  platformCommission: number
  platformCommissionRate: number
  taxes: number
  taxRate: number
  total: number
  currency: string
}

enum BookingStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
  CLOSED = 'CLOSED'
}
```

#### 5. Payment Service


**Responsibilities:**
- Invoice generation (PDF)
- Receipt generation (PDF)
- Transaction record management
- Commission calculation tracking
- Financial reporting

**Key Interfaces:**
```typescript
interface PaymentService {
  generateInvoice(bookingId: string): Promise<Invoice>
  generateReceipt(bookingId: string): Promise<Receipt>
  recordTransaction(bookingId: string, amount: number, type: TransactionType): Promise<Transaction>
  getCompanyTransactions(companyId: string, filters?: TransactionFilters): Promise<Transaction[]>
  calculatePlatformRevenue(startDate: Date, endDate: Date): Promise<RevenueReport>
}

interface Invoice {
  id: string
  bookingId: string
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  providerCompany: CompanyInfo
  renterCompany: CompanyInfo
  lineItems: LineItem[]
  subtotal: number
  commission: number
  taxes: number
  total: number
  pdfBuffer: Buffer
}
```

#### 6. Rating Service


**Responsibilities:**
- Rating and review submission
- Aggregated rating calculation
- Provider response management
- Rating display and filtering

**Key Interfaces:**
```typescript
interface RatingService {
  submitRating(bookingId: string, renterId: string, rating: RatingData): Promise<Rating>
  respondToReview(reviewId: string, providerId: string, response: string): Promise<Review>
  getCompanyRatings(companyId: string): Promise<AggregatedRating>
  getDriverRatings(driverId: string): Promise<AggregatedRating>
  updateAggregatedRating(entityId: string, entityType: 'company' | 'driver'): Promise<void>
}

interface RatingData {
  companyStars: number // 1-5
  companyReview?: string
  driverStars?: number // 1-5
  driverReview?: string
}

interface AggregatedRating {
  averageStars: number
  totalRatings: number
  distribution: { 1: number, 2: number, 3: number, 4: number, 5: number }
}
```

#### 7. Messaging Service


**Responsibilities:**
- Message thread creation per booking
- Message sending and retrieval
- Unread message tracking
- Email notification integration

**Key Interfaces:**
```typescript
interface MessagingService {
  createThread(bookingId: string, participants: string[]): Promise<MessageThread>
  sendMessage(threadId: string, senderId: string, content: string): Promise<Message>
  getThreadMessages(threadId: string): Promise<Message[]>
  markAsRead(messageId: string, userId: string): Promise<void>
  getUnreadCount(userId: string): Promise<number>
}
```

#### 8. Notification Service

**Responsibilities:**
- Multi-channel notification delivery (email, in-app)
- User preference management
- Notification templating
- Delivery tracking

**Key Interfaces:**
```typescript
interface NotificationService {
  sendNotification(userId: string, notification: NotificationData): Promise<void>
  updatePreferences(userId: string, preferences: NotificationPreferences): Promise<void>
  getPreferences(userId: string): Promise<NotificationPreferences>
  markAsRead(notificationId: string): Promise<void>
}

interface NotificationPreferences {
  emailEnabled: boolean
  inAppEnabled: boolean
  bookingUpdates: boolean
  messages: boolean
  ratings: boolean
  marketing: boolean
}
```

#### 9. Admin Service


**Responsibilities:**
- Platform configuration management
- Company and driver verification
- Listing moderation
- Dispute resolution
- Audit logging
- Analytics and reporting

**Key Interfaces:**
```typescript
interface AdminService {
  updatePlatformConfig(config: PlatformConfig): Promise<void>
  verifyCompany(companyId: string, adminId: string): Promise<void>
  verifyDriver(driverId: string, adminId: string): Promise<void>
  suspendListing(listingId: string, reason: string, adminId: string): Promise<void>
  removeListing(listingId: string, reason: string, adminId: string): Promise<void>
  resolveDispute(disputeId: string, resolution: DisputeResolution, adminId: string): Promise<void>
  getAnalytics(startDate: Date, endDate: Date): Promise<AnalyticsReport>
  searchEntities(entityType: string, query: string): Promise<SearchResults>
  getAuditLog(filters: AuditLogFilters): Promise<AuditLogEntry[]>
}

interface PlatformConfig {
  commissionRate: number // percentage (e.g., 5 for 5%)
  taxRate: number // percentage
  bookingTimeoutHours: number
  defaultCurrency: string
}
```

## Data Models

### Core Entities

#### User
```typescript
interface User {
  id: string
  email: string
  passwordHash: string
  role: Role
  companyId: string
  firstName: string
  lastName: string
  phone: string
  emailVerified: boolean
  verificationToken?: string
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  createdAt: Date
  updatedAt: Date
}
```

#### Company

```typescript
interface Company {
  id: string
  name: string
  organizationNumber: string // Norwegian Org. nr.
  businessAddress: string
  city: string
  postalCode: string
  fylke: string
  kommune: string
  vatRegistered: boolean
  description?: string
  verified: boolean
  verifiedAt?: Date
  verifiedBy?: string // admin user id
  aggregatedRating?: number
  totalRatings: number
  createdAt: Date
  updatedAt: Date
}
```

#### VehicleListing
```typescript
interface VehicleListing {
  id: string
  companyId: string
  title: string
  description: string
  vehicleType: VehicleType // '8-pallet' | '18-pallet' | '21-pallet' | 'trailer' | 'other'
  capacity: number // in pallets
  fuelType: FuelType // 'ELECTRIC' | 'BIOGAS' | 'DIESEL' | 'GAS'
  location: {
    city: string
    fylke: string
    kommune: string
    coordinates?: [number, number] // [longitude, latitude]
  }
  pricing: {
    hourlyRate?: number
    dailyRate?: number
    deposit?: number
    currency: string
  }
  serviceOfferings: {
    withDriver: boolean
    withDriverCost?: number
    withoutDriver: boolean
  }
  photos: string[] // URLs or file paths
  tags: string[] // e.g., ['tail-lift', 'refrigerated', 'ADR-certified']
  status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
  createdAt: Date
  updatedAt: Date
}
```

#### DriverListing

```typescript
interface DriverListing {
  id: string
  companyId: string
  name: string
  licenseClass: string // Required
  languages: string[]
  backgroundSummary?: string
  pricing: {
    hourlyRate?: number
    dailyRate?: number
    currency: string
  }
  verified: boolean
  verifiedAt?: Date
  verifiedBy?: string // admin user id
  licenseDocumentPath?: string
  aggregatedRating?: number
  totalRatings: number
  status: 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
  createdAt: Date
  updatedAt: Date
}
```

#### Booking
```typescript
interface Booking {
  id: string
  bookingNumber: string // Human-readable reference
  renterCompanyId: string
  providerCompanyId: string
  vehicleListingId?: string
  driverListingId?: string
  status: BookingStatus
  startDate: Date
  endDate: Date
  duration: {
    hours?: number
    days?: number
  }
  costs: {
    providerRate: number
    platformCommission: number
    platformCommissionRate: number
    taxes: number
    taxRate: number
    total: number
    currency: string
  }
  contractPdfPath?: string
  requestedAt: Date
  respondedAt?: Date
  expiresAt: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

#### Rating

```typescript
interface Rating {
  id: string
  bookingId: string
  renterCompanyId: string
  providerCompanyId: string
  driverListingId?: string
  companyStars: number // 1-5
  companyReview?: string
  driverStars?: number // 1-5
  driverReview?: string
  providerResponse?: string
  providerRespondedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

#### Message
```typescript
interface Message {
  id: string
  threadId: string
  senderId: string
  content: string
  readBy: string[] // user IDs who have read the message
  createdAt: Date
}

interface MessageThread {
  id: string
  bookingId: string
  participants: string[] // user IDs
  createdAt: Date
  updatedAt: Date
}
```

#### Transaction
```typescript
interface Transaction {
  id: string
  bookingId: string
  type: 'BOOKING_PAYMENT' | 'REFUND' | 'COMMISSION'
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}
```

#### AuditLog
```typescript
interface AuditLog {
  id: string
  adminUserId: string
  action: string // e.g., 'VERIFY_COMPANY', 'SUSPEND_LISTING', 'RESOLVE_DISPUTE'
  entityType: string // e.g., 'Company', 'Listing', 'Booking'
  entityId: string
  changes?: Record<string, any>
  reason?: string
  ipAddress?: string
  createdAt: Date
}
```

### Database Relationships



```
User ──────────┐
               │ N:1
               ▼
            Company ──────┐
               │          │ 1:N
               │ 1:N      ▼
               │      VehicleListing
               │          │
               │ 1:N      │ 1:N
               ▼          ▼
         DriverListing  Booking ────┐
               │          │          │ 1:N
               │ 1:N      │ 1:N      ▼
               ▼          ▼      Transaction
            Rating    Message
                         │
                         │ N:1
                         ▼
                    MessageThread
```

**Key Relationships:**
- User belongs to one Company (N:1)
- Company has many Users, VehicleListings, DriverListings (1:N)
- Booking references one VehicleListing and optionally one DriverListing
- Booking has many Transactions and Messages (1:N)
- Rating references one Booking (1:1)
- MessageThread belongs to one Booking (1:1)

Now I need to complete the prework analysis before writing the Correctness Properties section.



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- **Authorization properties (3.1, 3.2, 3.3, 3.5)** can be combined into comprehensive role-based access control properties
- **State transition properties (10.1-10.7)** represent a state machine that can be tested as a single property
- **Rating aggregation (12.4)** is tested through multiple rating submissions
- **Configuration update properties (9.1, 9.2, 9.3)** follow the same pattern and can be generalized
- **Rate limiting properties (19.1-19.5)** follow the same pattern across different endpoints

### Core Properties

#### Property 1: Registration data completeness
*For any* valid company registration submission, all required fields (Company Name, Organization Number, Business Address, Contact Person Name, Phone Number, Email Address, Password, VAT Registration Status) must be captured and stored in the system.
**Validates: Requirements 1.1**

#### Property 2: Email verification activation
*For any* valid verification token, clicking the verification link must transition the account from unverified to verified status and grant platform access.
**Validates: Requirements 1.3**

#### Property 3: Duplicate email prevention
*For any* email address already registered in the system, attempting to register a new account with that email must be rejected with an appropriate error.
**Validates: Requirements 1.4**

#### Property 4: Organization number validation
*For any* invalid Norwegian organization number format, the registration must be rejected with a validation error.
**Validates: Requirements 1.5**

#### Property 5: Profile update persistence
*For any* company profile update with valid data, all updated fields must be saved and retrievable on subsequent profile views.
**Validates: Requirements 2.1**

#### Property 6: Verification badge display
*For any* company that has been manually verified by a Platform Admin, the company's public profile must display a Verification Badge.
**Validates: Requirements 2.2**

#### Property 7: Role-based authorization enforcement
*For any* protected action, the system must verify the user has the required role before allowing the action to proceed, and must deny access with an authorization error if the role is insufficient.
**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

#### Property 8: Company-scoped authorization
*For any* company-specific resource modification attempt, the system must verify the user belongs to that company before allowing the modification.
**Validates: Requirements 3.2**

#### Property 9: Vehicle listing completeness
*For any* vehicle listing creation, all required fields (Title, Description, Location, Vehicle Type, Capacity, Fuel Type, Pricing, Service Offerings) must be validated and stored.
**Validates: Requirements 4.1, 4.4**

#### Property 10: Service offering flexibility
*For any* vehicle listing, the system must allow and correctly store any combination of with-driver, without-driver, or both service offerings with associated pricing.
**Validates: Requirements 4.2**

#### Property 11: Driver listing with verification requirement
*For any* driver listing creation without license documentation, the system must prevent publication until verification documents are uploaded.
**Validates: Requirements 5.4**

#### Property 12: Driver verification badge display
*For any* driver whose credentials have been verified by a Platform Admin, the driver's listing must display a Driver Verification Badge.
**Validates: Requirements 5.3**

#### Property 13: Search filter conjunction
*For any* search with multiple filters applied, the system must return only listings that satisfy all filter criteria simultaneously (AND logic).
**Validates: Requirements 6.3, 6.4**

#### Property 14: Location-based search accuracy
*For any* location filter (Fylke, Kommune, or radius), the system must return only listings within the specified geographic boundaries.
**Validates: Requirements 6.2**

#### Property 15: Cost calculation accuracy
*For any* booking request, the system must calculate costs such that: Total = Provider Rate + (Provider Rate × Commission Rate) + ((Provider Rate + Commission) × Tax Rate), where commission is calculated on the pre-tax provider rate.
**Validates: Requirements 7.1, 9.5**

#### Property 16: Self-booking prevention
*For any* booking attempt, if the renter's company ID matches the listing's provider company ID, the system must reject the booking with an error.
**Validates: Requirements 7.3**

#### Property 17: Cross-company vehicle-driver validation
*For any* vehicle-plus-driver booking, the vehicle listing and driver listing must belong to the same provider company, otherwise the booking must be rejected.
**Validates: Requirements 7.4**

#### Property 18: Availability blocking on booking
*For any* submitted booking request, the system must block the requested time slots on the listing's availability calendar to prevent double-booking.
**Validates: Requirements 7.5**

#### Property 19: Booking acceptance workflow
*For any* booking in Pending status, when a provider accepts it, the system must transition the status to Accepted and generate a PDF contract summary.
**Validates: Requirements 8.2**

#### Property 20: Booking auto-expiration
*For any* booking in Pending status, if the provider does not respond within the configured timeout period, the system must automatically transition the booking to an expired/cancelled state.
**Validates: Requirements 8.5**

#### Property 21: Configuration propagation
*For any* platform configuration update (commission rate, tax rate, timeout period), all subsequent bookings must use the new configuration values in their calculations.
**Validates: Requirements 9.1, 9.2, 9.3**

#### Property 22: Booking state machine validity
*For any* booking, state transitions must follow the valid state machine: Pending → Accepted → Active → Completed → Closed, with Cancelled and Disputed as alternative terminal states reachable from most states.
**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7**

#### Property 23: Invoice generation on confirmation
*For any* booking that transitions to Accepted status, the system must generate a PDF invoice containing all required financial details (Provider Rate, Commission, Taxes, Total, Payment Terms).
**Validates: Requirements 11.1, 11.4**

#### Property 24: Receipt generation on completion
*For any* booking that transitions to Completed status, the system must generate a PDF receipt accessible from the user dashboard.
**Validates: Requirements 11.2**

#### Property 25: Rating aggregation accuracy
*For any* entity (company or driver) with multiple ratings, the aggregated rating must equal the arithmetic mean of all submitted star ratings for that entity.
**Validates: Requirements 12.4**

#### Property 26: Rating range validation
*For any* rating submission, the star rating values must be integers between 1 and 5 inclusive, otherwise the submission must be rejected.
**Validates: Requirements 12.2**

#### Property 27: Listing suspension removes from search
*For any* listing that is suspended by a Platform Admin, the listing must not appear in any search results until the suspension is lifted.
**Validates: Requirements 13.3**

#### Property 28: Revenue calculation accuracy
*For any* time period, the platform revenue must equal the sum of all commission amounts from bookings completed within that period.
**Validates: Requirements 14.1**

#### Property 29: Dispute status transition
*For any* booking where a dispute is raised, the system must transition the booking status to Disputed and notify the Platform Admin.
**Validates: Requirements 15.1**

#### Property 30: Password security
*For any* user password, the stored value in the database must be a bcrypt hash (not plaintext), and the hash must verify against the original password.
**Validates: Requirements 18.1**

#### Property 31: Authentication token validation
*For any* API request to a protected endpoint, the system must validate the authentication token and reject requests with invalid or expired tokens with an HTTP 401 status.
**Validates: Requirements 18.5**

#### Property 32: Rate limiting enforcement
*For any* rate-limited endpoint, when the request limit is exceeded within the time window, the system must return HTTP 429 status and log the event.
**Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5**

#### Property 33: GDPR data export completeness
*For any* user data export request, the exported data must include all personal information associated with the user across all tables in the system.
**Validates: Requirements 20.1**

#### Property 34: GDPR data deletion completeness
*For any* account deletion request, all personal data must be removed or anonymized from all system tables while preserving necessary transaction records for legal compliance.
**Validates: Requirements 20.2, 20.5**

#### Property 35: Admin action audit logging
*For any* administrative action performed by a Platform Admin, the system must create an audit log entry with timestamp, admin ID, action type, entity type, entity ID, and changes made.
**Validates: Requirements 20.3**

#### Property 36: Migration tracking
*For any* database migration execution, the system must record the migration as applied and prevent duplicate execution of the same migration.
**Validates: Requirements 21.4**

#### Property 37: Configuration from environment
*For any* application startup, all configuration values and secrets must be loaded from environment variables, and the application must fail to start if required variables are missing.
**Validates: Requirements 22.1, 22.3, 22.4**

#### Property 38: Error logging completeness
*For any* error that occurs during request processing, the system must log the error with timestamp, stack trace, request context, and user information.
**Validates: Requirements 24.1**

#### Property 39: Health check accuracy
*For any* health check request, the system must return HTTP 200 if all critical dependencies are operational, or HTTP 503 with failure details if any dependency is unavailable.
**Validates: Requirements 24.3, 24.4**

#### Property 40: Message thread creation on booking
*For any* booking creation, the system must automatically create a dedicated message thread with the renter and provider as participants.
**Validates: Requirements 25.1**

#### Property 41: Message delivery to all participants
*For any* message sent in a booking thread, all participants in that thread must receive the message and an email notification.
**Validates: Requirements 25.2**

#### Property 42: Unread message indicator
*For any* new message received by a user, the system must display an unread indicator until the user marks the message as read.
**Validates: Requirements 25.4**

#### Property 43: Notification preference enforcement
*For any* non-critical notification, the system must respect the user's channel preferences (email/in-app) and only send through enabled channels.
**Validates: Requirements 26.5**

#### Property 44: Critical notification override
*For any* critical event (e.g., booking cancellation, dispute raised), the system must send notifications regardless of user preferences.
**Validates: Requirements 26.3**



## Error Handling

### Error Response Format

All API errors follow a consistent JSON structure:

```typescript
interface ErrorResponse {
  error: {
    code: string // Machine-readable error code
    message: string // Human-readable error message
    details?: any // Additional context (validation errors, etc.)
    requestId: string // For tracking and support
  }
}
```

### Error Categories

#### 1. Validation Errors (HTTP 400)
- Invalid input data format
- Missing required fields
- Business rule violations (e.g., self-booking attempt)
- Example codes: `INVALID_INPUT`, `MISSING_FIELD`, `SELF_BOOKING_NOT_ALLOWED`

#### 2. Authentication Errors (HTTP 401)
- Invalid credentials
- Expired or invalid tokens
- Missing authentication
- Example codes: `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `AUTHENTICATION_REQUIRED`

#### 3. Authorization Errors (HTTP 403)
- Insufficient permissions
- Company-scoped access violations
- Example codes: `INSUFFICIENT_PERMISSIONS`, `COMPANY_ACCESS_DENIED`

#### 4. Not Found Errors (HTTP 404)
- Resource does not exist
- Example codes: `RESOURCE_NOT_FOUND`, `LISTING_NOT_FOUND`, `BOOKING_NOT_FOUND`

#### 5. Conflict Errors (HTTP 409)
- Duplicate email registration
- Double-booking attempts
- Invalid state transitions
- Example codes: `EMAIL_ALREADY_EXISTS`, `LISTING_UNAVAILABLE`, `INVALID_STATE_TRANSITION`

#### 6. Rate Limiting Errors (HTTP 429)
- Too many requests
- Example codes: `RATE_LIMIT_EXCEEDED`

#### 7. Server Errors (HTTP 500)
- Unexpected errors
- Database failures
- External service failures
- Example codes: `INTERNAL_ERROR`, `DATABASE_ERROR`, `SERVICE_UNAVAILABLE`

### Error Handling Strategy

1. **Input Validation**: Validate all inputs at the API boundary using Zod schemas
2. **Database Errors**: Catch and transform database errors into appropriate HTTP responses
3. **Transaction Rollback**: Use database transactions for multi-step operations with automatic rollback on failure
4. **Logging**: Log all errors with full context for debugging
5. **User-Friendly Messages**: Return clear, actionable error messages to clients
6. **Security**: Never expose sensitive information (stack traces, database details) in production error responses

## Testing Strategy

### Unit Testing

Unit tests verify specific functionality of individual components:

**Coverage Areas:**
- Service method logic (booking calculations, rating aggregation, etc.)
- Validation functions (email format, organization number, etc.)
- Utility functions (date calculations, currency formatting, etc.)
- Authorization checks
- State machine transitions

**Tools:**
- Framework: Jest
- Mocking: Jest mocks for database and external services
- Coverage Target: 80% code coverage minimum

**Example Unit Tests:**
- Test that commission is calculated on pre-tax amount
- Test that invalid organization numbers are rejected
- Test that self-booking attempts are blocked
- Test that booking state transitions follow valid paths
- Test that rating aggregation calculates correct averages

### Property-Based Testing

Property-based tests verify universal properties across many randomly generated inputs:

**Library:** fast-check (for TypeScript/JavaScript)

**Configuration:**
- Minimum 100 iterations per property test
- Each property test must be tagged with: `**Feature: vider-transport-marketplace, Property {number}: {property_text}**`
- Each property test must reference the design document property it implements

**Key Property Tests:**

1. **Cost Calculation Property** (Property 15)
   - Generate random provider rates, commission rates, and tax rates
   - Verify: Total = Provider Rate + (Provider Rate × Commission Rate) + ((Provider Rate + Commission) × Tax Rate)

2. **Rating Aggregation Property** (Property 25)
   - Generate random sets of ratings (1-5 stars)
   - Verify: Aggregated rating equals arithmetic mean

3. **Search Filter Conjunction Property** (Property 13)
   - Generate random listings and random filter combinations
   - Verify: All returned listings satisfy all applied filters

4. **Authorization Property** (Property 7)
   - Generate random users with different roles and random protected actions
   - Verify: Only users with sufficient roles can perform actions

5. **State Machine Property** (Property 22)
   - Generate random sequences of state transition attempts
   - Verify: Only valid transitions are allowed

6. **Self-Booking Prevention Property** (Property 16)
   - Generate random companies and listings
   - Verify: Bookings are rejected when renter company ID equals provider company ID

7. **Availability Blocking Property** (Property 18)
   - Generate random bookings with overlapping time ranges
   - Verify: Second booking is rejected due to unavailability

8. **Password Hashing Property** (Property 30)
   - Generate random passwords
   - Verify: Stored hash is not plaintext and verifies correctly

9. **GDPR Export Completeness Property** (Property 33)
   - Generate random user data across multiple tables
   - Verify: Export includes all personal data

10. **Configuration Propagation Property** (Property 21)
    - Generate random configuration updates and bookings
    - Verify: Bookings created after config update use new values

### Integration Testing

Integration tests verify that components work together correctly:

**Coverage Areas:**
- API endpoint flows (registration → verification → login)
- Database operations with real database (using test database)
- Multi-service workflows (booking creation → notification → message thread)
- File operations (photo upload, PDF generation)

**Tools:**
- Supertest for API testing
- Test database with migrations
- Cleanup between tests

**Example Integration Tests:**
- Complete booking flow from request to acceptance
- User registration and email verification flow
- Search with multiple filters returning correct results
- Rating submission updating aggregated ratings
- Admin verification workflow

### End-to-End Testing

E2E tests verify complete user workflows through the UI:

**Tools:**
- Playwright or Cypress
- Test against staging environment

**Key Scenarios:**
- Company registration and profile setup
- Creating vehicle and driver listings
- Searching and booking a vehicle
- Provider accepting a booking
- Completing a rental and leaving a rating
- Admin verifying a company

### Testing Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Test Data**: Use factories or builders to create test data
3. **Cleanup**: Clean up test data after each test
4. **Deterministic**: Tests should produce consistent results
5. **Fast**: Unit and property tests should run quickly (< 5 minutes total)
6. **Meaningful Assertions**: Test behavior, not implementation details
7. **Error Cases**: Test both success and failure scenarios

## Security Considerations

### Authentication & Authorization
- Passwords hashed with bcrypt (salt rounds ≥ 12)
- JWT tokens with short expiration (15 minutes for access, 7 days for refresh)
- Refresh token rotation on use
- Server-side role checks on every protected endpoint
- Company-scoped authorization for resource access

### Data Protection
- HTTPS only in production
- Sensitive data encrypted at rest (if storing payment info in future)
- SQL injection prevention via parameterized queries (ORM)
- XSS prevention via input sanitization and CSP headers
- CSRF protection via SameSite cookies or CSRF tokens

### Rate Limiting
- Authentication endpoints: 5 requests per IP per 15 minutes
- Booking creation: 20 requests per user per hour
- Search: 100 requests per IP per minute
- General API: 1000 requests per IP per hour

### Audit Logging
- All admin actions logged with timestamp, admin ID, and changes
- Failed authentication attempts logged
- Sensitive operations logged (verification, suspension, etc.)
- Logs stored securely and retained per compliance requirements

### GDPR Compliance
- Data export endpoint for user data portability
- Data deletion endpoint for right to be forgotten
- Consent tracking for marketing communications
- Privacy policy and terms of service acceptance
- Data retention policies

## Deployment & Operations

### Environment Configuration

Required environment variables:
```
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=<strong-random-secret>
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=noreply@vider.no

# Platform
PLATFORM_COMMISSION_RATE=5
PLATFORM_TAX_RATE=25
BOOKING_TIMEOUT_HOURS=24
DEFAULT_CURRENCY=NOK

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://vider.no
```

### Database Migrations

- Use Prisma migrations or TypeORM migrations
- Run migrations before application startup
- Version control all migration files
- Test migrations on staging before production

### Monitoring & Logging

- Structured logging (JSON format) with Winston or Pino
- Log levels: ERROR, WARN, INFO, DEBUG
- Health check endpoint: `GET /health`
- Metrics: Request count, response time, error rate
- Alerting on critical errors and service degradation

### Backup & Recovery

- Daily automated database backups
- Backup retention: 30 days
- File uploads backed up to S3 or equivalent
- Disaster recovery plan documented

### CI/CD Pipeline

1. **On Pull Request:**
   - Run linting
   - Run unit tests
   - Run property-based tests
   - Run integration tests
   - Check code coverage

2. **On Merge to Main:**
   - Run full test suite
   - Build Docker image
   - Deploy to staging
   - Run E2E tests on staging
   - Manual approval for production

3. **On Production Deploy:**
   - Run database migrations
   - Deploy new version with zero-downtime
   - Run smoke tests
   - Monitor error rates

## UI/UX Design Guidelines

### Design Principles

1. **Clean & Professional**: B2B marketplace aesthetic with focus on trust and reliability
2. **Mobile-First**: Responsive design that works seamlessly on all devices
3. **Accessibility**: WCAG 2.1 AA compliance minimum
4. **Performance**: Fast page loads (< 2 seconds) and smooth interactions
5. **Clarity**: Clear information hierarchy and intuitive navigation

### Key Screens

#### 1. Landing Page
- Hero section with value proposition
- Search bar for quick listing discovery
- Featured listings
- Trust indicators (verified companies, ratings)
- Call-to-action for registration

#### 2. Navigation Bar
- Logo (rectangular version from public folder)
- Main navigation: Search, My Listings, My Bookings, Messages
- User menu: Profile, Settings, Logout
- Notification indicator
- Responsive hamburger menu on mobile

#### 3. Search & Results
- Advanced filter panel (collapsible on mobile)
- Map view option showing listing locations
- Grid/list view toggle
- Sorting options (price, rating, distance)
- Pagination or infinite scroll
- Clear filter indicators and reset option

#### 4. Listing Detail Page
- Photo gallery with zoom
- Key information prominently displayed
- Availability calendar
- Pricing breakdown
- Provider company info with rating
- Reviews section
- "Request Booking" CTA button
- Similar listings recommendations

#### 5. Booking Flow
- Date/time selection
- Duration input (hours or days)
- Cost breakdown (transparent pricing)
- Terms acceptance
- Confirmation screen
- Email confirmation sent

#### 6. Dashboard
- Overview cards (active bookings, pending requests, revenue)
- Quick actions
- Recent activity feed
- Upcoming rentals calendar
- Separate views for renter and provider roles

#### 7. Admin Panel
- Sidebar navigation
- Entity management tables with search and filters
- Verification workflows
- Analytics dashboard with charts
- Dispute resolution interface
- Configuration settings

#### 8. Messaging
- Thread list with unread indicators
- Message view with booking context
- Real-time updates (polling or WebSocket)
- File attachment support (future)

### Component Library

Use Tailwind CSS with Headless UI for:
- Buttons (primary, secondary, danger)
- Forms (inputs, selects, textareas, checkboxes)
- Modals and dialogs
- Dropdowns and menus
- Cards and panels
- Tables with sorting and pagination
- Badges and tags
- Alerts and notifications
- Loading states and skeletons

### Accessibility Requirements

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus indicators
- Color contrast ratios (4.5:1 minimum)
- Screen reader compatibility
- Alt text for all images
- Form validation with clear error messages

## Future Enhancements

### Phase 2 Features
- Real-time payment processing integration (Stripe, Vipps)
- Automated payout system for providers
- Insurance integration
- GPS tracking for active rentals
- Mobile apps (iOS/Android)

### Phase 3 Features
- Multi-language support (English, Swedish, Danish)
- Advanced analytics for providers
- Loyalty program and discounts
- API for third-party integrations
- White-label solution for enterprise clients

## Appendix

### Norwegian Location Data

The system must support Norwegian administrative divisions:

**Fylker (Counties):** Oslo, Rogaland, Møre og Romsdal, Nordland, Viken, Innlandet, Vestfold og Telemark, Agder, Vestland, Trøndelag, Troms og Finnmark

**Implementation:** Store fylke and kommune as text fields, with optional geocoding for radius searches. Consider using a Norwegian postal code database for accurate location mapping.

### Vehicle Types

Standard Norwegian transport vehicle classifications:
- 8-pallet: Small delivery van
- 18-pallet: Medium truck
- 21-pallet: Large truck
- Trailer: Semi-trailer
- Other: Custom or specialized vehicles

### License Classes

Norwegian driver's license classes relevant to transport:
- B: Light vehicles (up to 3.5 tons)
- C1: Medium trucks (3.5-7.5 tons)
- C: Heavy trucks (over 7.5 tons)
- CE: Truck with trailer
- D: Buses

### Compliance & Legal

- **GDPR**: Full compliance required for EU/EEA operations
- **Norwegian Business Law**: Contracts must comply with Norwegian commercial law
- **VAT**: Proper VAT handling for B2B transactions
- **Data Retention**: Follow Norwegian data retention requirements
- **Terms of Service**: Clear terms for both renters and providers
- **Liability**: Define platform liability vs. provider liability
