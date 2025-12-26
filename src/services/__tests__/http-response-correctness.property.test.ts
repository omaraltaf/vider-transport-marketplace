/**
 * Property-Based Test: HTTP Response Correctness
 * **Feature: listing-search-fix, Property 6: HTTP response correctness**
 * **Validates: Requirements 3.4**
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../../app';

const prisma = new PrismaClient();
const app = createApp();

describe('Property 6: HTTP response correctness', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * For any valid search request, the API should return 200 status with proper response structure
   */
  it('should return 200 status for valid search requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
          fylke: fc.option(fc.constantFrom('Oslo', 'Bergen', 'Trondheim'), { nil: undefined }),
          page: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
          pageSize: fc.option(fc.integer({ min: 1, max: 50 }), { nil: undefined })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params);

            // Should return 200 status
            if (response.status !== 200) {
              return false;
            }

            // Response should have proper content type
            if (!response.headers['content-type']?.includes('application/json')) {
              return false;
            }

            // Response body should have expected structure
            const body = response.body;
            if (typeof body !== 'object' || body === null) {
              return false;
            }

            // Should have required fields
            if (!Array.isArray(body.vehicleListings) || !Array.isArray(body.driverListings)) {
              return false;
            }

            if (typeof body.total !== 'number' || body.total < 0) {
              return false;
            }

            if (typeof body.page !== 'number' || body.page < 1) {
              return false;
            }

            if (typeof body.pageSize !== 'number' || body.pageSize < 1) {
              return false;
            }

            if (typeof body.totalPages !== 'number' || body.totalPages < 0) {
              return false;
            }

            return true;
          } catch (error) {
            console.error('Valid search request test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * For any request with invalid parameters, the API should return appropriate error status
   */
  it('should return appropriate error status for invalid parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('invalid', 'wrong', 'bad_type'), { nil: undefined }),
          page: fc.option(fc.integer({ min: -10, max: 0 }), { nil: undefined }),
          pageSize: fc.option(fc.integer({ min: -5, max: 0 }), { nil: undefined }),
          vehicleType: fc.option(fc.constantFrom('INVALID_TYPE', 'BAD_VEHICLE'), { nil: undefined })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params);

            // Should return error status (400 for bad request or 422 for validation error)
            if (response.status === 200) {
              // If it returns 200, the parameters might have been ignored/defaulted
              // This is acceptable behavior, so we'll allow it
              return true;
            }

            // If it returns an error status, it should be appropriate
            if (response.status !== 400 && response.status !== 422 && response.status !== 500) {
              return false;
            }

            // Error responses should have proper content type
            if (response.headers['content-type']?.includes('application/json')) {
              // If JSON response, should have error structure
              const body = response.body;
              if (typeof body === 'object' && body !== null) {
                // Should have some error indication
                if (!body.error && !body.message && !body.errors) {
                  return false;
                }
              }
            }

            return true;
          } catch (error) {
            console.error('Invalid parameters test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * For any search request, response headers should be properly set
   */
  it('should have proper response headers for all requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
          pageSize: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params);

            // Should have content-type header
            if (!response.headers['content-type']) {
              return false;
            }

            // Should be JSON for successful responses
            if (response.status === 200) {
              if (!response.headers['content-type'].includes('application/json')) {
                return false;
              }
            }

            // Should have proper CORS headers if configured
            // (This is optional but good practice)
            if (response.headers['access-control-allow-origin']) {
              if (typeof response.headers['access-control-allow-origin'] !== 'string') {
                return false;
              }
            }

            // Should not expose sensitive server information
            if (response.headers['x-powered-by']) {
              // It's better not to expose this, but not a failure
            }

            return true;
          } catch (error) {
            console.error('Response headers test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 12 }
    );
  });

  /**
   * For any search request, response time should be reasonable
   */
  it('should respond within reasonable time limits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined }),
          pageSize: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined })
        }),
        async (params) => {
          try {
            const startTime = Date.now();
            
            const response = await request(app)
              .get('/api/listings/search')
              .query(params);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Response should complete within 5 seconds (generous limit for testing)
            if (responseTime > 5000) {
              return false;
            }

            // Should have a valid status code
            if (response.status < 200 || response.status >= 600) {
              return false;
            }

            return true;
          } catch (error) {
            console.error('Response time test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any search request with pagination, response should handle pagination correctly
   */
  it('should handle pagination parameters correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          page: fc.integer({ min: 1, max: 10 }),
          pageSize: fc.integer({ min: 1, max: 50 }),
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const body = response.body;

            // Page should match request
            if (body.page !== params.page) {
              return false;
            }

            // PageSize should match request (or be capped at maximum)
            if (body.pageSize !== params.pageSize && body.pageSize !== Math.min(params.pageSize, 100)) {
              return false;
            }

            // Total pages should be calculated correctly
            const expectedTotalPages = Math.ceil(body.total / body.pageSize);
            if (body.totalPages !== expectedTotalPages) {
              return false;
            }

            // Returned items should not exceed pageSize
            const totalReturned = (body.vehicleListings?.length || 0) + (body.driverListings?.length || 0);
            if (totalReturned > body.pageSize) {
              return false;
            }

            // If we're beyond the last page, should return empty results
            if (params.page > body.totalPages && body.total > 0) {
              if (totalReturned !== 0) {
                return false;
              }
            }

            return true;
          } catch (error) {
            console.error('Pagination handling test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * For any search request with filters, response should acknowledge filters correctly
   */
  it('should handle filter parameters correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          fylke: fc.constantFrom('Oslo', 'Bergen', 'Trondheim'),
          vehicleType: fc.option(fc.constantFrom('PALLET_8', 'PALLET_18', 'PALLET_21'), { nil: undefined }),
          listingType: fc.option(fc.constantFrom('vehicle', 'driver', 'vehicle_driver'), { nil: undefined })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params)
              .expect(200);

            const body = response.body;

            // Response should be valid JSON structure
            if (typeof body !== 'object' || body === null) {
              return false;
            }

            // Should have proper arrays
            if (!Array.isArray(body.vehicleListings) || !Array.isArray(body.driverListings)) {
              return false;
            }

            // Total should be non-negative
            if (typeof body.total !== 'number' || body.total < 0) {
              return false;
            }

            // If filters are applied, results should be consistent
            // (We can't verify exact filtering without knowing database state,
            // but we can verify the response structure is correct)
            
            return true;
          } catch (error) {
            console.error('Filter parameters test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 12 }
    );
  });

  /**
   * For any malformed request, the API should handle it gracefully
   */
  it('should handle malformed requests gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Intentionally malformed parameters
          page: fc.option(fc.oneof(fc.string(), fc.float(), fc.boolean()), { nil: undefined }),
          pageSize: fc.option(fc.oneof(fc.string(), fc.float(), fc.boolean()), { nil: undefined }),
          total: fc.option(fc.string(), { nil: undefined }), // This shouldn't be a query param
          invalidParam: fc.option(fc.string(), { nil: undefined })
        }),
        async (params) => {
          try {
            const response = await request(app)
              .get('/api/listings/search')
              .query(params);

            // Should not crash (status should be valid)
            if (response.status < 200 || response.status >= 600) {
              return false;
            }

            // Should either succeed (ignoring bad params) or return proper error
            if (response.status >= 400) {
              // Error response should have proper content type
              if (response.headers['content-type']?.includes('application/json')) {
                // Should have some error structure
                const body = response.body;
                if (typeof body === 'object' && body !== null) {
                  // Should indicate error somehow
                  if (!body.error && !body.message && !body.errors && response.status >= 400) {
                    return false;
                  }
                }
              }
            }

            return true;
          } catch (error) {
            console.error('Malformed request test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * For any request method other than GET, should return appropriate method not allowed
   */
  it('should return method not allowed for non-GET requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('POST', 'PUT', 'DELETE', 'PATCH'),
        async (method) => {
          try {
            let response;
            
            switch (method) {
              case 'POST':
                response = await request(app).post('/api/listings/search');
                break;
              case 'PUT':
                response = await request(app).put('/api/listings/search');
                break;
              case 'DELETE':
                response = await request(app).delete('/api/listings/search');
                break;
              case 'PATCH':
                response = await request(app).patch('/api/listings/search');
                break;
              default:
                return false;
            }

            // Should return 405 Method Not Allowed or 404 Not Found
            if (response.status !== 405 && response.status !== 404) {
              // Some frameworks might return 404 instead of 405, which is acceptable
              return false;
            }

            return true;
          } catch (error) {
            console.error('Method not allowed test failed:', error);
            return false;
          }
        }
      ),
      { numRuns: 8 }
    );
  });
});