import { OpenAPIV3 } from 'openapi-types';

export const responses: Record<string, OpenAPIV3.ResponseObject> = {
  BadRequest: {
    description: 'Bad request - Invalid input data',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'INVALID_INPUT',
            message: 'The provided input is invalid',
            details: { field: 'email', issue: 'Invalid email format' },
          },
        },
      },
    },
  },

  Unauthorized: {
    description: 'Unauthorized - Authentication required or invalid credentials',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required to access this resource',
          },
        },
      },
    },
  },

  Forbidden: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to perform this action',
          },
        },
      },
    },
  },

  NotFound: {
    description: 'Not found - Resource does not exist',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'RESOURCE_NOT_FOUND',
            message: 'The requested resource was not found',
          },
        },
      },
    },
  },

  Conflict: {
    description: 'Conflict - Resource already exists or invalid state',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists',
          },
        },
      },
    },
  },

  RateLimitExceeded: {
    description: 'Too many requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
      },
    },
  },

  InternalError: {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorResponse' },
        example: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal error occurred',
          },
        },
      },
    },
  },
};
