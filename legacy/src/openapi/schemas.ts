import { OpenAPIV3 } from 'openapi-types';

export const schemas: Record<string, OpenAPIV3.SchemaObject> = {
  // Error Response
  ErrorResponse: {
    type: 'object',
    required: ['error'],
    properties: {
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: {
            type: 'string',
            description: 'Machine-readable error code',
            example: 'INVALID_INPUT',
          },
          message: {
            type: 'string',
            description: 'Human-readable error message',
            example: 'The provided input is invalid',
          },
          details: {
            description: 'Additional error context',
          },
          requestId: {
            type: 'string',
            description: 'Request tracking ID',
          },
        },
      },
    },
  },

  // User and Authentication
  Role: {
    type: 'string',
    enum: ['PLATFORM_ADMIN', 'COMPANY_ADMIN', 'COMPANY_USER'],
    description: 'User role in the system',
  },

  User: {
    type: 'object',
    required: ['id', 'email', 'role', 'companyId', 'firstName', 'lastName', 'phone', 'emailVerified', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      role: { $ref: '#/components/schemas/Role' },
      companyId: { type: 'string', format: 'uuid' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      phone: { type: 'string' },
      emailVerified: { type: 'boolean' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CompanyRegistrationData: {
    type: 'object',
    required: ['companyName', 'organizationNumber', 'businessAddress', 'contactPersonName', 'phone', 'email', 'password', 'passwordConfirmation', 'vatRegistered'],
    properties: {
      companyName: { type: 'string', minLength: 1 },
      organizationNumber: { type: 'string', pattern: '^[0-9]{9}$', description: 'Norwegian organization number (9 digits)' },
      businessAddress: { type: 'string', minLength: 1 },
      city: { type: 'string' },
      postalCode: { type: 'string' },
      fylke: { type: 'string', description: 'Norwegian county' },
      kommune: { type: 'string', description: 'Norwegian municipality' },
      contactPersonName: { type: 'string', minLength: 1 },
      phone: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      passwordConfirmation: { type: 'string', minLength: 8 },
      vatRegistered: { type: 'boolean' },
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },

  AuthTokens: {
    type: 'object',
    required: ['accessToken', 'refreshToken'],
    properties: {
      accessToken: { type: 'string', description: 'JWT access token' },
      refreshToken: { type: 'string', description: 'JWT refresh token' },
    },
  },

  // Company
  Company: {
    type: 'object',
    required: ['id', 'name', 'organizationNumber', 'businessAddress', 'city', 'postalCode', 'fylke', 'kommune', 'vatRegistered', 'verified', 'totalRatings', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      organizationNumber: { type: 'string' },
      businessAddress: { type: 'string' },
      city: { type: 'string' },
      postalCode: { type: 'string' },
      fylke: { type: 'string' },
      kommune: { type: 'string' },
      vatRegistered: { type: 'boolean' },
      description: { type: 'string', nullable: true },
      verified: { type: 'boolean' },
      verifiedAt: { type: 'string', format: 'date-time', nullable: true },
      verifiedBy: { type: 'string', format: 'uuid', nullable: true },
      aggregatedRating: { type: 'number', format: 'float', nullable: true, minimum: 1, maximum: 5 },
      totalRatings: { type: 'integer', minimum: 0 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CompanyUpdateData: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      businessAddress: { type: 'string' },
      city: { type: 'string' },
      postalCode: { type: 'string' },
      fylke: { type: 'string' },
      kommune: { type: 'string' },
    },
  },

  // Vehicle Listing
  VehicleType: {
    type: 'string',
    enum: ['8-pallet', '18-pallet', '21-pallet', 'trailer', 'other'],
  },

  FuelType: {
    type: 'string',
    enum: ['ELECTRIC', 'BIOGAS', 'DIESEL', 'GAS'],
  },

  ListingStatus: {
    type: 'string',
    enum: ['ACTIVE', 'SUSPENDED', 'REMOVED'],
  },

  VehicleListing: {
    type: 'object',
    required: ['id', 'companyId', 'title', 'description', 'vehicleType', 'capacity', 'fuelType', 'location', 'pricing', 'serviceOfferings', 'photos', 'tags', 'status', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      description: { type: 'string' },
      vehicleType: { $ref: '#/components/schemas/VehicleType' },
      capacity: { type: 'integer', description: 'Capacity in pallets' },
      fuelType: { $ref: '#/components/schemas/FuelType' },
      location: {
        type: 'object',
        required: ['city', 'fylke', 'kommune'],
        properties: {
          city: { type: 'string' },
          fylke: { type: 'string' },
          kommune: { type: 'string' },
          coordinates: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
            description: '[longitude, latitude]',
          },
        },
      },
      pricing: {
        type: 'object',
        required: ['currency'],
        properties: {
          hourlyRate: { type: 'number', format: 'float', nullable: true },
          dailyRate: { type: 'number', format: 'float', nullable: true },
          deposit: { type: 'number', format: 'float', nullable: true },
          currency: { type: 'string', default: 'NOK' },
        },
      },
      serviceOfferings: {
        type: 'object',
        required: ['withDriver', 'withoutDriver'],
        properties: {
          withDriver: { type: 'boolean' },
          withDriverCost: { type: 'number', format: 'float', nullable: true },
          withoutDriver: { type: 'boolean' },
        },
      },
      photos: {
        type: 'array',
        items: { type: 'string', format: 'uri' },
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        example: ['tail-lift', 'refrigerated', 'ADR-certified'],
      },
      status: { $ref: '#/components/schemas/ListingStatus' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // Driver Listing
  DriverListing: {
    type: 'object',
    required: ['id', 'companyId', 'name', 'licenseClass', 'languages', 'pricing', 'verified', 'totalRatings', 'status', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      licenseClass: { type: 'string' },
      languages: {
        type: 'array',
        items: { type: 'string' },
      },
      backgroundSummary: { type: 'string', nullable: true },
      pricing: {
        type: 'object',
        required: ['currency'],
        properties: {
          hourlyRate: { type: 'number', format: 'float', nullable: true },
          dailyRate: { type: 'number', format: 'float', nullable: true },
          currency: { type: 'string', default: 'NOK' },
        },
      },
      verified: { type: 'boolean' },
      verifiedAt: { type: 'string', format: 'date-time', nullable: true },
      verifiedBy: { type: 'string', format: 'uuid', nullable: true },
      licenseDocumentPath: { type: 'string', nullable: true },
      aggregatedRating: { type: 'number', format: 'float', nullable: true, minimum: 1, maximum: 5 },
      totalRatings: { type: 'integer', minimum: 0 },
      status: { $ref: '#/components/schemas/ListingStatus' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // Booking
  BookingStatus: {
    type: 'string',
    enum: ['PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'CLOSED'],
  },

  CostBreakdown: {
    type: 'object',
    required: ['providerRate', 'platformCommission', 'platformCommissionRate', 'taxes', 'taxRate', 'total', 'currency'],
    properties: {
      providerRate: { type: 'number', format: 'float' },
      platformCommission: { type: 'number', format: 'float' },
      platformCommissionRate: { type: 'number', format: 'float', description: 'Commission rate as percentage' },
      taxes: { type: 'number', format: 'float' },
      taxRate: { type: 'number', format: 'float', description: 'Tax rate as percentage' },
      total: { type: 'number', format: 'float' },
      currency: { type: 'string', default: 'NOK' },
    },
  },

  Booking: {
    type: 'object',
    required: ['id', 'bookingNumber', 'renterCompanyId', 'providerCompanyId', 'status', 'startDate', 'endDate', 'duration', 'costs', 'requestedAt', 'expiresAt', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      bookingNumber: { type: 'string', description: 'Human-readable reference' },
      renterCompanyId: { type: 'string', format: 'uuid' },
      providerCompanyId: { type: 'string', format: 'uuid' },
      vehicleListingId: { type: 'string', format: 'uuid', nullable: true },
      driverListingId: { type: 'string', format: 'uuid', nullable: true },
      status: { $ref: '#/components/schemas/BookingStatus' },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      duration: {
        type: 'object',
        properties: {
          hours: { type: 'integer', nullable: true },
          days: { type: 'integer', nullable: true },
        },
      },
      costs: { $ref: '#/components/schemas/CostBreakdown' },
      contractPdfPath: { type: 'string', nullable: true },
      requestedAt: { type: 'string', format: 'date-time' },
      respondedAt: { type: 'string', format: 'date-time', nullable: true },
      expiresAt: { type: 'string', format: 'date-time' },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // Rating
  Rating: {
    type: 'object',
    required: ['id', 'bookingId', 'renterCompanyId', 'providerCompanyId', 'companyStars', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      bookingId: { type: 'string', format: 'uuid' },
      renterCompanyId: { type: 'string', format: 'uuid' },
      providerCompanyId: { type: 'string', format: 'uuid' },
      driverListingId: { type: 'string', format: 'uuid', nullable: true },
      companyStars: { type: 'integer', minimum: 1, maximum: 5 },
      companyReview: { type: 'string', nullable: true },
      driverStars: { type: 'integer', minimum: 1, maximum: 5, nullable: true },
      driverReview: { type: 'string', nullable: true },
      providerResponse: { type: 'string', nullable: true },
      providerRespondedAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  AggregatedRating: {
    type: 'object',
    required: ['averageStars', 'totalRatings', 'distribution'],
    properties: {
      averageStars: { type: 'number', format: 'float', minimum: 1, maximum: 5 },
      totalRatings: { type: 'integer', minimum: 0 },
      distribution: {
        type: 'object',
        required: ['1', '2', '3', '4', '5'],
        properties: {
          '1': { type: 'integer', minimum: 0 },
          '2': { type: 'integer', minimum: 0 },
          '3': { type: 'integer', minimum: 0 },
          '4': { type: 'integer', minimum: 0 },
          '5': { type: 'integer', minimum: 0 },
        },
      },
    },
  },

  // Messaging
  Message: {
    type: 'object',
    required: ['id', 'threadId', 'senderId', 'content', 'readBy', 'createdAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      threadId: { type: 'string', format: 'uuid' },
      senderId: { type: 'string', format: 'uuid' },
      content: { type: 'string' },
      readBy: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        description: 'User IDs who have read the message',
      },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },

  MessageThread: {
    type: 'object',
    required: ['id', 'bookingId', 'participants', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      bookingId: { type: 'string', format: 'uuid' },
      participants: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        description: 'User IDs participating in the thread',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // Notification
  NotificationPreferences: {
    type: 'object',
    required: ['emailEnabled', 'inAppEnabled', 'bookingUpdates', 'messages', 'ratings', 'marketing'],
    properties: {
      emailEnabled: { type: 'boolean' },
      inAppEnabled: { type: 'boolean' },
      bookingUpdates: { type: 'boolean' },
      messages: { type: 'boolean' },
      ratings: { type: 'boolean' },
      marketing: { type: 'boolean' },
    },
  },

  // Transaction
  TransactionType: {
    type: 'string',
    enum: ['BOOKING_PAYMENT', 'REFUND', 'COMMISSION'],
  },

  TransactionStatus: {
    type: 'string',
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
  },

  Transaction: {
    type: 'object',
    required: ['id', 'bookingId', 'type', 'amount', 'currency', 'status', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      bookingId: { type: 'string', format: 'uuid' },
      type: { $ref: '#/components/schemas/TransactionType' },
      amount: { type: 'number', format: 'float' },
      currency: { type: 'string', default: 'NOK' },
      status: { $ref: '#/components/schemas/TransactionStatus' },
      metadata: { type: 'object', additionalProperties: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  // Health Check
  HealthStatus: {
    type: 'object',
    required: ['status', 'timestamp'],
    properties: {
      status: {
        type: 'string',
        enum: ['healthy', 'unhealthy'],
      },
      timestamp: { type: 'string', format: 'date-time' },
      dependencies: {
        type: 'object',
        properties: {
          database: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['up', 'down'] },
              responseTime: { type: 'number', description: 'Response time in milliseconds' },
            },
          },
        },
      },
      error: { type: 'string', nullable: true },
    },
  },
};
