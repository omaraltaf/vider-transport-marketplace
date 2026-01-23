import { OpenAPIV3 } from 'openapi-types';

export const paths: OpenAPIV3.PathsObject = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Health check endpoint',
      description: 'Returns the current health status of the system and its dependencies',
      operationId: 'getHealth',
      responses: {
        '200': {
          description: 'System is healthy',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthStatus' },
            },
          },
        },
        '503': {
          description: 'System is unhealthy',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthStatus' },
            },
          },
        },
      },
    },
  },

  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Register a new company account',
      description: 'Creates a new company account with user credentials and sends verification email',
      operationId: 'register',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CompanyRegistrationData' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Registration successful, verification email sent',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'string', format: 'uuid' },
                  message: { type: 'string', example: 'Registration successful. Please check your email to verify your account.' },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '409': { $ref: '#/components/responses/Conflict' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/auth/verify-email': {
    post: {
      tags: ['Authentication'],
      summary: 'Verify email address',
      description: 'Activates the account using the verification token sent via email',
      operationId: 'verifyEmail',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['token'],
              properties: {
                token: { type: 'string', description: 'Email verification token' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Email verified successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Email verified successfully' },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticates user credentials and returns JWT tokens',
      operationId: 'login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthTokens' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Generates a new access token using a valid refresh token',
      operationId: 'refreshToken',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string', description: 'JWT refresh token' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Token refreshed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'User logout',
      description: 'Invalidates the current session',
      operationId: 'logout',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Logout successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Logout successful' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/companies/{id}': {
    get: {
      tags: ['Companies'],
      summary: 'Get company public profile',
      description: 'Retrieves public information about a company',
      operationId: 'getCompanyProfile',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Company ID',
        },
      ],
      responses: {
        '200': {
          description: 'Company profile retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Company' },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
    put: {
      tags: ['Companies'],
      summary: 'Update company profile',
      description: 'Updates company profile information (requires Company Admin role)',
      operationId: 'updateCompanyProfile',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Company ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CompanyUpdateData' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Company profile updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Company' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/companies/{id}/verify': {
    post: {
      tags: ['Companies'],
      summary: 'Verify company',
      description: 'Manually verifies a company (Platform Admin only)',
      operationId: 'verifyCompany',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Company ID',
        },
      ],
      responses: {
        '200': {
          description: 'Company verified successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Company' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
    delete: {
      tags: ['Companies'],
      summary: 'Remove company verification',
      description: 'Removes verification badge from a company (Platform Admin only)',
      operationId: 'unverifyCompany',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'Company ID',
        },
      ],
      responses: {
        '200': {
          description: 'Company verification removed successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Company' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/listings/vehicles': {
    post: {
      tags: ['Listings'],
      summary: 'Create vehicle listing',
      description: 'Creates a new vehicle listing (requires Company Admin role)',
      operationId: 'createVehicleListing',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'description', 'vehicleType', 'capacity', 'fuelType', 'location', 'pricing', 'serviceOfferings'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                vehicleType: { $ref: '#/components/schemas/VehicleType' },
                capacity: { type: 'integer' },
                fuelType: { $ref: '#/components/schemas/FuelType' },
                location: { type: 'object' },
                pricing: { type: 'object' },
                serviceOfferings: { type: 'object' },
                photos: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Vehicle listing created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VehicleListing' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
    get: {
      tags: ['Listings'],
      summary: 'Search vehicle listings',
      description: 'Search and filter vehicle listings',
      operationId: 'searchVehicleListings',
      parameters: [
        { name: 'vehicleType', in: 'query', schema: { type: 'string' } },
        { name: 'fuelType', in: 'query', schema: { type: 'string' } },
        { name: 'minCapacity', in: 'query', schema: { type: 'integer' } },
        { name: 'maxCapacity', in: 'query', schema: { type: 'integer' } },
        { name: 'fylke', in: 'query', schema: { type: 'string' } },
        { name: 'kommune', in: 'query', schema: { type: 'string' } },
        { name: 'withDriver', in: 'query', schema: { type: 'boolean' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  results: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VehicleListing' },
                  },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                },
              },
            },
          },
        },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/listings/drivers': {
    post: {
      tags: ['Listings'],
      summary: 'Create driver listing',
      description: 'Creates a new driver listing (requires Company Admin role)',
      operationId: 'createDriverListing',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'licenseClass', 'languages', 'pricing'],
              properties: {
                name: { type: 'string' },
                licenseClass: { type: 'string' },
                languages: { type: 'array', items: { type: 'string' } },
                backgroundSummary: { type: 'string' },
                pricing: { type: 'object' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Driver listing created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DriverListing' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/bookings': {
    post: {
      tags: ['Bookings'],
      summary: 'Create booking request',
      description: 'Creates a new booking request with cost calculation',
      operationId: 'createBooking',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['vehicleListingId', 'startDate', 'endDate'],
              properties: {
                vehicleListingId: { type: 'string', format: 'uuid' },
                driverListingId: { type: 'string', format: 'uuid', nullable: true },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Booking request created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Booking' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '409': { $ref: '#/components/responses/Conflict' },
        '429': { $ref: '#/components/responses/RateLimitExceeded' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
    get: {
      tags: ['Bookings'],
      summary: 'List bookings',
      description: 'Retrieves bookings for the authenticated user\'s company',
      operationId: 'listBookings',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/BookingStatus' } },
        { name: 'role', in: 'query', schema: { type: 'string', enum: ['renter', 'provider'] } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      ],
      responses: {
        '200': {
          description: 'Bookings retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  results: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Booking' },
                  },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/bookings/{id}': {
    get: {
      tags: ['Bookings'],
      summary: 'Get booking details',
      description: 'Retrieves detailed information about a specific booking',
      operationId: 'getBooking',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Booking details retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Booking' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/bookings/{id}/accept': {
    post: {
      tags: ['Bookings'],
      summary: 'Accept booking request',
      description: 'Provider accepts a booking request and generates contract',
      operationId: 'acceptBooking',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Booking accepted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Booking' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/bookings/{id}/decline': {
    post: {
      tags: ['Bookings'],
      summary: 'Decline booking request',
      description: 'Provider declines a booking request',
      operationId: 'declineBooking',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                reason: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Booking declined successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Booking' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/ratings': {
    post: {
      tags: ['Ratings'],
      summary: 'Submit rating and review',
      description: 'Submits a rating and review for a completed booking',
      operationId: 'submitRating',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['bookingId', 'companyStars'],
              properties: {
                bookingId: { type: 'string', format: 'uuid' },
                companyStars: { type: 'integer', minimum: 1, maximum: 5 },
                companyReview: { type: 'string' },
                driverStars: { type: 'integer', minimum: 1, maximum: 5 },
                driverReview: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Rating submitted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Rating' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/messages/threads/{threadId}/messages': {
    get: {
      tags: ['Messaging'],
      summary: 'Get messages in thread',
      description: 'Retrieves all messages in a booking thread',
      operationId: 'getThreadMessages',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'threadId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Messages retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Message' },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
    post: {
      tags: ['Messaging'],
      summary: 'Send message',
      description: 'Sends a message in a booking thread',
      operationId: 'sendMessage',
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'threadId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['content'],
              properties: {
                content: { type: 'string', minLength: 1 },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Message sent successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Message' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/notifications/preferences': {
    get: {
      tags: ['Notifications'],
      summary: 'Get notification preferences',
      description: 'Retrieves the user\'s notification preferences',
      operationId: 'getNotificationPreferences',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Preferences retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NotificationPreferences' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
    put: {
      tags: ['Notifications'],
      summary: 'Update notification preferences',
      description: 'Updates the user\'s notification preferences',
      operationId: 'updateNotificationPreferences',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/NotificationPreferences' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Preferences updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NotificationPreferences' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/gdpr/export': {
    post: {
      tags: ['GDPR'],
      summary: 'Export user data',
      description: 'Exports all personal data for the authenticated user',
      operationId: 'exportUserData',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Data export generated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Complete user data in machine-readable format',
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/gdpr/delete': {
    post: {
      tags: ['GDPR'],
      summary: 'Delete user account',
      description: 'Permanently deletes the user account and anonymizes personal data',
      operationId: 'deleteUserAccount',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Account deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Account deleted successfully' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },

  '/api/admin/analytics': {
    get: {
      tags: ['Admin'],
      summary: 'Get platform analytics',
      description: 'Retrieves platform analytics and metrics (Platform Admin only)',
      operationId: 'getAnalytics',
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
      ],
      responses: {
        '200': {
          description: 'Analytics retrieved successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  revenue: { type: 'number', format: 'float' },
                  activeListings: { type: 'integer' },
                  totalBookings: { type: 'integer' },
                  topRatedProviders: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '500': { $ref: '#/components/responses/InternalError' },
      },
    },
  },
};
