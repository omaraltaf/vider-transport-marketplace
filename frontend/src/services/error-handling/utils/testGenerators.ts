/**
 * Test Generators for Property-Based Testing
 * Generators for creating test data for error handling property tests
 */

import * as fc from 'fast-check';
import type {
  ApiError,
  ErrorContext,
  TokenState,
  RetryConfig,
  CacheEntry,
  ValidationError
} from '../../../types/error.types';
import {
  ApiErrorType,
  ErrorSeverity
} from '../../../types/error.types';

/**
 * Generator for API error types
 */
export const apiErrorTypeArb = fc.constantFrom(
  ApiErrorType.NETWORK,
  ApiErrorType.AUTH,
  ApiErrorType.PARSING,
  ApiErrorType.TIMEOUT,
  ApiErrorType.SERVER,
  ApiErrorType.VALIDATION,
  ApiErrorType.UNKNOWN
);

/**
 * Generator for error severity levels
 */
export const errorSeverityArb = fc.constantFrom(
  ErrorSeverity.LOW,
  ErrorSeverity.MEDIUM,
  ErrorSeverity.HIGH,
  ErrorSeverity.CRITICAL
);

/**
 * Generator for HTTP status codes
 */
export const httpStatusCodeArb = fc.oneof(
  fc.constantFrom(200, 201, 204), // Success codes
  fc.constantFrom(400, 401, 403, 404, 422), // Client errors
  fc.constantFrom(500, 502, 503, 504) // Server errors
);

/**
 * Generator for error contexts
 */
export const errorContextArb: fc.Arbitrary<ErrorContext> = fc.record({
  endpoint: fc.string({ minLength: 10, maxLength: 50 }).map(s => `/api/${s}`),
  method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
  component: fc.string({ minLength: 5, maxLength: 20 }),
  userId: fc.option(fc.string({ minLength: 36, maxLength: 36 })), // UUID-like string
  timestamp: fc.date(),
  retryCount: fc.integer({ min: 0, max: 5 }),
  userAgent: fc.option(fc.string()),
  sessionId: fc.option(fc.string({ minLength: 36, maxLength: 36 })), // UUID-like string
  requestId: fc.option(fc.string({ minLength: 36, maxLength: 36 })) // UUID-like string
});

/**
 * Generator for API errors
 */
export const apiErrorArb: fc.Arbitrary<ApiError> = fc.record({
  type: apiErrorTypeArb,
  message: fc.string({ minLength: 10, maxLength: 100 }),
  statusCode: fc.option(httpStatusCodeArb),
  originalError: fc.constant(new Error('Test error')),
  context: errorContextArb,
  severity: errorSeverityArb,
  isRecoverable: fc.boolean(),
  userMessage: fc.string({ minLength: 10, maxLength: 100 }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
});

/**
 * Generator for malformed JSON strings
 */
export const malformedJsonArb = fc.oneof(
  fc.constant('{"incomplete": '),
  fc.constant('{"invalid": "json"'),
  fc.constant('{"trailing": "comma",}'),
  fc.constant('{invalid: "quotes"}'),
  fc.constant('{"unclosed": "string}'),
  fc.constant('[{"array": "incomplete"'),
  fc.constant('null,'),
  fc.constant('undefined'),
  fc.constant('{"number": 123.45.67}'),
  fc.constant('{"invalid": value}'),
  fc.constant('{"missing": quote}'),
  fc.constant('{broken json'),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => {
    try {
      JSON.parse(s);
      return false; // Filter out valid JSON
    } catch {
      return true; // Keep invalid JSON
    }
  })
);

/**
 * Generator for valid JSON strings
 */
export const validJsonArb = fc.oneof(
  fc.jsonValue().map(v => JSON.stringify(v)),
  fc.constant('{"valid": "json"}'),
  fc.constant('[]'),
  fc.constant('{}'),
  fc.constant('null'),
  fc.constant('true'),
  fc.constant('false'),
  fc.constant('"string"'),
  fc.constant('123')
);

/**
 * Generator for token states
 */
export const tokenStateArb: fc.Arbitrary<TokenState> = fc.record({
  accessToken: fc.option(fc.string({ minLength: 20, maxLength: 100 })),
  refreshToken: fc.option(fc.string({ minLength: 20, maxLength: 100 })),
  expiresAt: fc.option(fc.date()),
  isRefreshing: fc.boolean(),
  lastRefresh: fc.option(fc.date())
});

/**
 * Generator for retry configurations
 */
export const retryConfigArb: fc.Arbitrary<RetryConfig> = fc.record({
  maxAttempts: fc.integer({ min: 1, max: 10 }),
  baseDelay: fc.integer({ min: 100, max: 5000 }),
  maxDelay: fc.integer({ min: 5000, max: 60000 }),
  backoffMultiplier: fc.float({ min: Math.fround(1.1), max: Math.fround(3.0), noNaN: true }),
  retryableErrors: fc.array(apiErrorTypeArb, { minLength: 1, maxLength: 5 }),
  timeoutMs: fc.integer({ min: 1000, max: 30000 })
});

/**
 * Generator for cache entries
 */
export const cacheEntryArb = <T>(dataArb: fc.Arbitrary<T>): fc.Arbitrary<CacheEntry<T>> =>
  fc.record({
    key: fc.string({ minLength: 5, maxLength: 50 }),
    data: dataArb,
    timestamp: fc.date(),
    expiresAt: fc.date(),
    source: fc.constantFrom('api', 'fallback', 'mock'),
    metadata: fc.option(fc.dictionary(fc.string(), fc.anything()))
  });

/**
 * Generator for validation errors
 */
export const validationErrorArb: fc.Arbitrary<ValidationError> = fc.record({
  field: fc.string({ minLength: 3, maxLength: 20 }),
  message: fc.string({ minLength: 10, maxLength: 100 }),
  code: fc.string({ minLength: 3, maxLength: 20 }),
  value: fc.option(fc.anything())
});

/**
 * Generator for network errors
 */
export const networkErrorArb = fc.oneof(
  fc.constant(new TypeError('Failed to fetch')),
  fc.constant(new TypeError('Network request failed')),
  fc.constant(new Error('ECONNREFUSED')),
  fc.constant(new Error('ETIMEDOUT')),
  fc.constant(new Error('ENOTFOUND'))
);

/**
 * Generator for authentication errors
 */
export const authErrorArb = fc.oneof(
  fc.constant(new Error('Token expired')),
  fc.constant(new Error('Invalid token')),
  fc.constant(new Error('Unauthorized')),
  fc.constant(new Error('Forbidden'))
);

/**
 * Generator for parsing errors
 */
export const parsingErrorArb = fc.oneof(
  fc.constant(new SyntaxError('Unexpected token in JSON')),
  fc.constant(new SyntaxError('Unexpected end of JSON input')),
  fc.constant(new Error('Invalid JSON format')),
  fc.constant(new Error('Malformed response'))
);

/**
 * Generator for timeout scenarios
 */
export const timeoutScenarioArb = fc.record({
  timeoutMs: fc.integer({ min: 100, max: 10000 }),
  actualDuration: fc.integer({ min: 0, max: 20000 }),
  shouldTimeout: fc.boolean()
});

/**
 * Generator for API response scenarios
 */
export const apiResponseScenarioArb = fc.record({
  statusCode: httpStatusCodeArb,
  headers: fc.dictionary(fc.string(), fc.string()),
  body: fc.oneof(validJsonArb, malformedJsonArb, fc.string()),
  contentType: fc.constantFrom(
    'application/json',
    'text/html',
    'text/plain',
    'application/xml',
    'unknown'
  )
});

/**
 * Generator for offline operation scenarios
 */
export const offlineOperationArb = fc.record({
  id: fc.string({ minLength: 36, maxLength: 36 }), // UUID-like string
  endpoint: fc.string({ minLength: 10, maxLength: 50 }).map(s => `/api/${s}`),
  method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  data: fc.option(fc.anything()),
  headers: fc.option(fc.dictionary(fc.string(), fc.string())),
  timestamp: fc.date(),
  priority: fc.integer({ min: 1, max: 10 })
});

/**
 * Helper to create property test configurations
 */
export const createPropertyTestConfig = (numRuns: number = 100) => ({
  numRuns,
  verbose: true,
  seed: Date.now(),
  endOnFailure: true
});